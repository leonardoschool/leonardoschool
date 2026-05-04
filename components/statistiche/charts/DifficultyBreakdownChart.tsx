'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DifficultyData {
  difficulty: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface DifficultyBreakdownChartProps {
  data: DifficultyData[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Facile',
  MEDIUM: 'Media',
  HARD: 'Difficile',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: '#22c55e', // green-500
  MEDIUM: '#f59e0b', // amber-500
  HARD: '#ef4444', // red-500
};

/**
 * Horizontal bar chart showing accuracy by difficulty level
 */
export function DifficultyBreakdownChart({ data }: DifficultyBreakdownChartProps) {
  const chartData = useMemo(() => {
    // Sort by difficulty order
    const order = ['EASY', 'MEDIUM', 'HARD'];
    return data
      .filter((d) => d.total > 0)
      .sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))
      .map((d) => ({
        ...d,
        label: DIFFICULTY_LABELS[d.difficulty] || d.difficulty,
        color: DIFFICULTY_COLORS[d.difficulty] || '#6b7280',
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
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500 dark:text-gray-400"
          tickFormatter={(value) => `${value}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12 }}
          stroke="currentColor"
          className="text-gray-500 dark:text-gray-400"
          width={60}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {d.label}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {d.correct}/{d.total} risposte corrette
                  </p>
                  <p className="font-bold text-lg" style={{ color: d.color }}>
                    {d.accuracy.toFixed(1)}%
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default DifficultyBreakdownChart;
