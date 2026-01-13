'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { PageLoader } from '@/components/ui/loaders';
import QuestionForm from '@/components/admin/QuestionForm';
import { colors } from '@/lib/theme/colors';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { QuestionAnswerInput, QuestionKeywordInput } from '@/lib/validations/questionValidation';

export default function ModificaDomandaPage() {
  const params = useParams();
  const questionId = params.id as string;

  const { data: question, isLoading, error } = trpc.questions.getQuestion.useQuery(
    { id: questionId },
    { enabled: !!questionId }
  );

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !question) {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <div className={`${colors.background.card} rounded-xl p-8 text-center`}>
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${colors.status.error.text}`} />
          <h2 className={`text-xl font-bold ${colors.text.primary} mb-2`}>
            Domanda non trovata
          </h2>
          <p className={`${colors.text.muted} mb-4`}>
            La domanda richiesta non esiste o è stata eliminata.
          </p>
          <Link
            href="/domande"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.primary.bg} text-white`}
          >
            Torna alle domande
          </Link>
        </div>
      </div>
    );
  }

  // Transform the question data to match the form's expected format
  const initialData = {
    type: question.type as 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT',
    status: question.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    text: question.text,
    textLatex: question.textLatex,
    description: question.description,
    imageUrl: question.imageUrl,
    subjectId: question.subjectId,
    topicId: question.topicId,
    subTopicId: question.subTopicId,
    difficulty: question.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
    points: question.points,
    negativePoints: question.negativePoints,
    blankPoints: question.blankPoints,
    timeLimitSeconds: question.timeLimitSeconds,
    correctExplanation: question.correctExplanation,
    wrongExplanation: question.wrongExplanation,
    generalExplanation: question.generalExplanation,
    shuffleAnswers: question.shuffleAnswers,
    openValidationType: question.openValidationType as 'MANUAL' | 'KEYWORDS' | 'BOTH' | null,
    openMinLength: question.openMinLength,
    openMaxLength: question.openMaxLength,
    tags: question.legacyTags,
    tagIds: (question as { questionTags?: { tagId: string }[] }).questionTags?.map((a) => a.tagId) ?? [],
    year: question.year,
    source: question.source,
    answers: question.answers.map((a) => ({
      text: a.text,
      isCorrect: a.isCorrect,
      order: a.order,
      label: a.label,
      explanation: a.explanation ?? undefined,
      imageUrl: a.imageUrl ?? undefined,
    })) as QuestionAnswerInput[],
    keywords: question.keywords.map((k) => ({
      keyword: k.keyword,
      weight: k.weight,
      isRequired: k.isRequired,
      isSuggested: k.isSuggested,
      caseSensitive: k.caseSensitive,
      exactMatch: k.exactMatch,
      synonyms: k.synonyms,
    })) as QuestionKeywordInput[],
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <QuestionForm questionId={questionId} initialData={initialData} />
    </div>
  );
}
