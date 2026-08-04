// Helpers for the questions router: student-proposed alternative answers and the
// per-subject authorization shared by the feedback mutations.
import { TRPCError } from '@trpc/server';
import type { Prisma, PrismaClient, QuestionType } from '@prisma/client';
import { sanitizeStudentOpenAnswerInput } from '@/lib/utils/studentOpenAnswer';
import { normalizeAnswerText } from '@/server/services/choiceRegrade';

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Canonical form of a keyword, used to compare a proposal against what the
 * question already accepts. Mirrors the scorer, which lowercases and matches on
 * substrings, so "0.83" and " 0.83 " are the same keyword.
 */
export function normalizeKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Short question label for notifications, truncated the way the feedback notifications already do. */
export function buildQuestionTitle(text: string | null | undefined): string {
  if (!text) return 'Domanda';
  return text.length > 50 ? `${text.substring(0, 50)}...` : text;
}

/**
 * Guard the per-subject scope of a feedback item.
 *
 * A tutor manages only the reports of their own subjects unless they hold
 * 'questions.reviewAllFeedback'. Shared by every mutation that resolves a report:
 * kept in one place so the single-item check cannot drift from the list-level
 * `applyFeedbackVisibility`.
 */
export async function assertCanManageFeedback(
  prisma: PrismaClientOrTx,
  feedbackId: string,
  user: { id: string; role: string },
  canReviewAllFeedback: boolean
): Promise<void> {
  if (user.role !== 'COLLABORATOR' || canReviewAllFeedback) return;

  const feedback = await prisma.questionFeedback.findUnique({
    where: { id: feedbackId },
    select: { question: { select: { subjectId: true } } },
  });

  if (!feedback) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Segnalazione non trovata.' });
  }

  const canManage = feedback.question.subjectId
    ? await prisma.collaborator.findFirst({
        where: {
          userId: user.id,
          kind: 'TUTOR',
          subjects: { some: { subjectId: feedback.question.subjectId } },
        },
        select: { id: true },
      })
    : null;

  if (!canManage) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Puoi gestire solo le segnalazioni delle tue materie.',
    });
  }
}

/**
 * Original open answer behind each alternative-answer proposal, keyed by feedback id.
 *
 * Read from the attempt's stored answers in one query for the whole page, rather
 * than per row.
 */
export async function buildProposalAnswerTexts(
  prisma: PrismaClientOrTx,
  feedbacks: Array<{ id: string; type: string; questionId: string; simulationResultId?: string | null }>
): Promise<Map<string, string>> {
  const proposals = feedbacks.filter(f => f.type === 'ALTERNATIVE_ANSWER' && f.simulationResultId);
  if (proposals.length === 0) return new Map();

  const results = await prisma.simulationResult.findMany({
    where: { id: { in: Array.from(new Set(proposals.map(p => p.simulationResultId as string))) } },
    select: { id: true, answers: true },
  });

  const answersByResult = new Map(results.map(r => [r.id, r.answers]));
  const texts = new Map<string, string>();

  for (const proposal of proposals) {
    const stored = answersByResult.get(proposal.simulationResultId as string);
    if (!Array.isArray(stored)) continue;

    const answer = (stored as Array<{ questionId?: string; answerText?: string | null }>)
      .find(a => a?.questionId === proposal.questionId);

    const text = sanitizeStudentOpenAnswerInput(answer?.answerText).trim();
    if (text) texts.set(proposal.id, text);
  }

  return texts;
}

type ProposalCheck = {
  studentId: string;
  questionId: string;
  questionType: QuestionType | null;
  existingKeywords: string[];
  proposedKeyword: string;
  simulationResultId?: string;
};

/**
 * Validate a student's proposal of an additional accepted answer and return the
 * cleaned keyword.
 *
 * Refuses proposals that would be pointless or abusive: a question that has no
 * open answer to grade, a keyword the question already accepts, a duplicate the
 * same student already has pending, or an attempt that isn't theirs.
 */
export async function assertProposableAlternativeAnswer(
  prisma: PrismaClientOrTx,
  check: ProposalCheck
): Promise<string> {
  if (check.questionType !== 'OPEN_TEXT') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Puoi proporre una risposta alternativa solo per le domande a risposta aperta.',
    });
  }

  const keyword = sanitizeStudentOpenAnswerInput(check.proposedKeyword).trim().replace(/\s+/g, ' ');
  if (keyword.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Indica la risposta che secondo te dovrebbe essere accettata.',
    });
  }

  const normalized = normalizeKeyword(keyword);

  if (check.existingKeywords.some(existing => normalizeKeyword(existing) === normalized)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Questa risposta è già fra quelle accettate per questa domanda.',
    });
  }

  const alreadyProposed = await prisma.questionFeedback.findFirst({
    where: {
      questionId: check.questionId,
      studentId: check.studentId,
      type: 'ALTERNATIVE_ANSWER',
      status: 'PENDING',
    },
    select: { proposedKeyword: true },
  });

  if (alreadyProposed && normalizeKeyword(alreadyProposed.proposedKeyword ?? '') === normalized) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Hai già proposto questa risposta: è in attesa di valutazione.',
    });
  }

  // The proposal carries a score change, so the attempt it refers to must be the
  // student's own and must actually contain the question.
  if (check.simulationResultId) {
    const result = await prisma.simulationResult.findUnique({
      where: { id: check.simulationResultId },
      select: { studentId: true, answers: true },
    });

    if (!result || result.studentId !== check.studentId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Questo risultato non ti appartiene.',
      });
    }

    const answers = Array.isArray(result.answers)
      ? (result.answers as Array<{ questionId?: string }>)
      : [];

    if (!answers.some(answer => answer?.questionId === check.questionId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Questa domanda non fa parte del risultato indicato.',
      });
    }
  }

  return keyword;
}

// ==================== ANSWER RECONCILIATION ====================

type ExistingAnswerRow = { id: string; order: number };
type IncomingAnswer = { id?: string | null; order?: number | null };

export type AnswerReconciliation<T> = {
  /** Existing rows to rewrite in place: the id survives, so past attempts keep pointing at them. */
  updates: Array<{ id: string; answer: T; index: number }>;
  /** Answers with no counterpart to reuse. */
  creates: Array<{ answer: T; index: number }>;
  /** Rows the edit dropped. */
  deletedIds: string[];
};

/**
 * Pair the submitted answers with the rows already stored for the question.
 *
 * Editing a question used to delete every answer row and recreate it, which minted
 * new ids and orphaned the `answerId` recorded in the attempts already taken — the
 * review page then had nothing to mark as "La tua risposta". Reusing the rows keeps
 * that link alive. The editor does not always send back the ids, so an answer
 * without one falls back to its position, which is how the form builds the list.
 */
export function reconcileAnswers<T extends IncomingAnswer>(
  existing: ExistingAnswerRow[],
  incoming: T[]
): AnswerReconciliation<T> {
  const available = [...existing].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const byId = new Map(available.map(row => [row.id, row]));
  const claimed = new Set<string>();
  const matched = new Map<number, string>();

  incoming.forEach((answer, index) => {
    const id = answer.id ?? undefined;
    if (id && byId.has(id) && !claimed.has(id)) {
      claimed.add(id);
      matched.set(index, id);
    }
  });

  const spare = available.filter(row => !claimed.has(row.id));
  incoming.forEach((_, index) => {
    if (matched.has(index)) return;
    const row = spare.shift();
    if (row) {
      claimed.add(row.id);
      matched.set(index, row.id);
    }
  });

  const updates: AnswerReconciliation<T>['updates'] = [];
  const creates: AnswerReconciliation<T>['creates'] = [];
  incoming.forEach((answer, index) => {
    const id = matched.get(index);
    if (id) updates.push({ id, answer, index });
    else creates.push({ answer, index });
  });

  return {
    updates,
    creates,
    deletedIds: available.filter(row => !claimed.has(row.id)).map(row => row.id),
  };
}

type QuestionScoringShape = {
  points: number;
  negativePoints: number;
  answers: Array<{ text: string; isCorrect: boolean }>;
};

/**
 * Whether an edit invalidates the verdicts already stored for this question.
 *
 * Two things decide what an attempt earned: which option is correct, and what a
 * right or wrong answer is worth. `blankPoints` is deliberately not one of them —
 * an unanswered question is paid by the simulation's own `blankPoints`, never the
 * question's, both when scoring and when re-grading, so including it here would
 * only schedule a pass that finds nothing to do.
 */
export function shouldRegradeAttempts(before: QuestionScoringShape, after: QuestionScoringShape): boolean {
  return (
    before.points !== after.points ||
    before.negativePoints !== after.negativePoints ||
    correctAnswerKeyChanged(before.answers, after.answers)
  );
}

/** True when the set of options flagged correct is not the same one as before. */
export function correctAnswerKeyChanged(
  before: Array<{ text: string; isCorrect: boolean }>,
  after: Array<{ text: string; isCorrect: boolean }>
): boolean {
  const key = (answers: Array<{ text: string; isCorrect: boolean }>) =>
    answers.filter(a => a.isCorrect).map(a => normalizeAnswerText(a.text)).sort();

  const keyBefore = key(before);
  const keyAfter = key(after);
  return keyBefore.length !== keyAfter.length || keyBefore.some((text, i) => text !== keyAfter[i]);
}
