'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TypeBreakdown {
  type: string;
  count: number;
  averageScore: number;
}

interface SimulationTypeChartProps {
  data: TypeBreakdown[];
}

const TYPE_LABELS: Record<string, string> = {
  OFFICIAL: 'Ufficiale',
  PRACTICE: 'Esercitazione',
  CUSTOM: 'Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

const TYPE_COLORS: Record<string, string> = {
  OFFICIAL: '#a8012b', // primary brand color
  PRACTICE: '#3b82f6', // blue-500
  CUSTOM: '#8b5cf6', // violet-500
  QUICK_QUIZ: '#f59e0b', // amber-500
};

/**
 * Bar chart showing simulation breakdown by type
 */
export function SimulationTypeChart({ data }: SimulationTypeChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      label: TYPE_LABELS[d.type] || d.type,
      color: TYPE_COLORS[d.type] || '#6b7280',
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
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500 dark:text-gray-400"
          allowDecimals={false}
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
                    {d.count} simulazioni
                  </p>
                  <p className="font-medium" style={{ color: d.color }}>
                    Media: {d.averageScore.toFixed(1)}%
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SimulationTypeChart;
