'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AnswerDistributionChartProps {
  data: {
    correct: number;
    wrong: number;
    blank: number;
  };
}

const COLORS = {
  correct: '#22c55e', // green-500
  wrong: '#ef4444', // red-500
  blank: '#9ca3af', // gray-400
};

const LABELS = {
  correct: 'Corrette',
  wrong: 'Errate',
  blank: 'Non Risposto',
};

/**
 * Pie chart showing answer distribution (correct/wrong/blank)
 */
export function AnswerDistributionChart({ data }: AnswerDistributionChartProps) {
  const chartData = useMemo(() => {
    const total = data.correct + data.wrong + data.blank;
    if (total === 0) return [];

    return [
      { name: 'correct', value: data.correct, label: LABELS.correct },
      { name: 'wrong', value: data.wrong, label: LABELS.wrong },
      { name: 'blank', value: data.blank, label: LABELS.blank },
    ].filter((d) => d.value > 0);
  }, [data]);

  const total = data.correct + data.wrong + data.blank;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
          label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name as keyof typeof COLORS]}
              stroke="none"
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              const percentage = ((d.value / total) * 100).toFixed(1);
              return (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {d.label}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {d.value.toLocaleString('it-IT')} risposte ({percentage}%)
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          formatter={(value) => LABELS[value as keyof typeof LABELS]}
          wrapperStyle={{ fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default AnswerDistributionChart;
