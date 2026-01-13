'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getSubjectColor } from '@/lib/theme/colors';

// Subject labels in Italian
const subjectLabels: Record<string, string> = {
  BIOLOGIA: 'Biologia',
  CHIMICA: 'Chimica',
  FISICA: 'Fisica',
  MATEMATICA: 'Matematica',
  LOGICA: 'Logica',
  CULTURA_GENERALE: 'Cultura Gen.',
};

interface SubjectStat {
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

interface SubjectRadarChartProps {
  data: SubjectStat[];
}

/**
 * Radar chart showing performance across subjects
 */
export function SubjectRadarChart({ data }: SubjectRadarChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.totalQuestions >= 1)
      .map((d) => ({
        subject: subjectLabels[d.subject] || d.subject,
        fullSubject: d.subject,
        accuracy: Math.round(d.accuracy),
        total: d.totalQuestions,
        correct: d.correctAnswers,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
        <PolarGrid stroke="currentColor" className="text-gray-300 dark:text-gray-600" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-600 dark:text-gray-400"
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={{ fontSize: 10 }}
          stroke="currentColor"
          className="text-gray-400 dark:text-gray-500"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              const validSubjects = ['BIOLOGIA', 'CHIMICA', 'FISICA', 'MATEMATICA', 'LOGICA', 'CULTURA_GENERALE'] as const;
              const isValidSubject = validSubjects.includes(d.fullSubject as typeof validSubjects[number]);
              const subjectColor = isValidSubject 
                ? getSubjectColor(d.fullSubject as typeof validSubjects[number], 'main') 
                : '#a8012b';
              return (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {subjectLabels[d.fullSubject] || d.fullSubject}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {d.correct}/{d.total} risposte corrette
                  </p>
                  <p style={{ color: typeof subjectColor === 'string' ? subjectColor : '#a8012b' }} className="font-bold text-lg">
                    {d.accuracy}%
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Radar
          name="Accuratezza"
          dataKey="accuracy"
          stroke="#a8012b"
          fill="#a8012b"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default SubjectRadarChart;
