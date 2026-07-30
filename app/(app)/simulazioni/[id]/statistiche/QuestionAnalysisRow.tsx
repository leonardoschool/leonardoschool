'use client';

import { AlertTriangle, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { stripHtml } from '@/lib/utils/sanitizeHtml';

type AnswerOption = {
  label: string;
  text: string;
  isCorrect: boolean;
};

type TextDistribution = {
  items: Array<{ text: string; count: number; matchesKeyword: boolean }>;
  otherCount: number;
  otherDistinct: number;
};

export type QuestionAnalysisItem = {
  questionId: string;
  order: number;
  text: string;
  type: string;
  subject: { id: string; name: string; color: string } | null;
  topic: { id: string; name: string } | null;
  correctAnswer: string;
  answers: AnswerOption[];
  keywords: string[];
  totalAnswers: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  pendingCount: number;
  gradedCount: number;
  answerDistribution: Record<string, number>;
  textDistribution: TextDistribution | null;
  correctRate: number;
  blankRate: number;
  averageTimeSpent: number;
};

function getRateClass(rate: number) {
  if (rate >= 70) return 'text-green-600 dark:text-green-400';
  if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function StatTile({ value, label, valueClass }: { value: string | number; label: string; valueClass: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className={`text-xs ${colors.text.muted}`}>{label}</p>
    </div>
  );
}

function DistributionBar({
  badge,
  badgeClass,
  label,
  barClass,
  percentage,
  count,
}: {
  badge: React.ReactNode;
  badgeClass: string;
  label?: string;
  barClass: string;
  percentage: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${badgeClass}`}
      >
        {badge}
      </span>
      <div className="flex-1 min-w-0">
        {label && (
          <p className={`text-sm ${colors.text.secondary} truncate mb-1`} title={label}>
            {label}
          </p>
        )}
        <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full transition-all ${barClass}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <span className={`text-sm ${colors.text.secondary} w-16 text-right flex-shrink-0`}>
        {count} ({percentage.toFixed(0)}%)
      </span>
    </div>
  );
}

/** Open questions have no options: the keywords are the solution and the submitted texts are the distribution. */
function OpenAnswerDistribution({ question }: { question: QuestionAnalysisItem }) {
  const distribution = question.textDistribution;
  const answered = question.totalAnswers - question.blankCount;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <KeyRound className={`w-3.5 h-3.5 ${colors.primary.text}`} />
          <h4 className={`text-sm font-medium ${colors.text.primary}`}>
            {question.keywords.length === 1 ? 'Keyword attesa' : 'Keywords attese (ne basta una)'}
          </h4>
        </div>
        {question.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {question.keywords.map((keyword) => (
              <span
                key={keyword}
                className="px-2 py-0.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${colors.text.muted}`}>
            Nessuna keyword inserita: questa domanda può essere corretta solo a mano.
          </p>
        )}
      </div>

      <div>
        <h4 className={`text-sm font-medium ${colors.text.primary} mb-2`}>Risposte date</h4>
        {distribution && distribution.items.length > 0 ? (
          <div className="space-y-2">
            {distribution.items.map((item) => (
              <DistributionBar
                key={item.text}
                badge={item.matchesKeyword ? '✓' : '·'}
                badgeClass={
                  item.matchesKeyword
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }
                label={item.text}
                barClass={item.matchesKeyword ? 'bg-green-500' : 'bg-red-400'}
                percentage={answered > 0 ? (item.count / answered) * 100 : 0}
                count={item.count}
              />
            ))}
            {distribution.otherDistinct > 0 && (
              <p className={`text-xs ${colors.text.muted}`}>
                + altre {distribution.otherDistinct} risposte diverse ({distribution.otherCount} in totale)
              </p>
            )}
          </div>
        ) : (
          <p className={`text-sm ${colors.text.muted}`}>Nessuno ha risposto a questa domanda.</p>
        )}
      </div>
    </div>
  );
}

function ChoiceAnswerDistribution({ question }: { question: QuestionAnalysisItem }) {
  if (question.answers.length === 0) {
    return (
      <p className={`text-sm ${colors.text.muted}`}>
        Le opzioni di questa domanda non sono più disponibili.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {question.answers.map((answer) => {
        const count = question.answerDistribution[answer.label] || 0;
        const percentage = question.totalAnswers > 0 ? (count / question.totalAnswers) * 100 : 0;

        return (
          <DistributionBar
            key={answer.label}
            badge={answer.label}
            badgeClass={
              answer.isCorrect
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }
            label={answer.text || undefined}
            barClass={answer.isCorrect ? 'bg-green-500' : 'bg-red-400'}
            percentage={percentage}
            count={count}
          />
        );
      })}
      {question.blankCount > 0 && (
        <DistributionBar
          badge="—"
          badgeClass="bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
          barClass="bg-gray-400"
          percentage={question.blankRate}
          count={question.blankCount}
        />
      )}
    </div>
  );
}

export default function QuestionAnalysisRow({
  question,
  isExpanded,
  onToggle,
}: {
  question: QuestionAnalysisItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isOpenQuestion = question.type === 'OPEN_TEXT';
  // Without a single graded answer the rate is 0% by construction, which used to
  // brand every uncorrected open question as critical.
  const isProblematic = question.gradedCount > 0 && question.correctRate < 40;

  return (
    <div className={`${colors.background.hover}`}>
      <button onClick={onToggle} className="w-full px-6 py-4 text-left">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              isProblematic
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {question.order}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {question.subject && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: question.subject.color + '20',
                    color: question.subject.color,
                  }}
                >
                  {question.subject.name}
                </span>
              )}
              {question.topic && (
                <span className={`text-xs ${colors.text.muted}`}>{question.topic.name}</span>
              )}
              {isOpenQuestion && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.background.secondary} ${colors.text.muted}`}>
                  Risposta aperta
                </span>
              )}
              {isProblematic && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <AlertTriangle className="w-3 h-3" />
                  Critica
                </span>
              )}
            </div>
            <p className={`text-sm ${colors.text.primary} line-clamp-2`}>{stripHtml(question.text)}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-4">
            <div className="text-right">
              {question.gradedCount > 0 ? (
                <>
                  <p className={`text-lg font-bold ${getRateClass(question.correctRate)}`}>
                    {question.correctRate.toFixed(0)}%
                  </p>
                  <p className={`text-xs ${colors.text.muted}`}>corrette</p>
                </>
              ) : (
                <>
                  <p className={`text-lg font-bold ${colors.text.muted}`}>—</p>
                  <p className={`text-xs ${colors.text.muted}`}>da correggere</p>
                </>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className={`w-5 h-5 ${colors.text.muted}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${colors.text.muted}`} />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className={`px-6 pb-6 pt-0 ml-14 ${colors.background.secondary} mx-6 mb-4 rounded-lg`}>
          <div className="py-4 space-y-4">
            <div className={`grid gap-4 ${isOpenQuestion ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <StatTile value={question.correctCount} label="Corrette" valueClass="text-green-600" />
              <StatTile value={question.wrongCount} label="Errate" valueClass="text-red-600" />
              {isOpenQuestion && (
                <StatTile value={question.pendingCount} label="Da correggere" valueClass="text-amber-600" />
              )}
              <StatTile value={question.blankCount} label="Vuote" valueClass="text-gray-500" />
              <StatTile
                value={question.averageTimeSpent > 0 ? `${Math.round(question.averageTimeSpent)}s` : '-'}
                label="Tempo medio"
                valueClass={colors.text.primary}
              />
            </div>

            {isOpenQuestion ? (
              <OpenAnswerDistribution question={question} />
            ) : (
              <>
                <h4 className={`text-sm font-medium ${colors.text.primary} mb-2`}>Distribuzione risposte</h4>
                <ChoiceAnswerDistribution question={question} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
