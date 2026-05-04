'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface TrendDataPoint {
  index: number;
  date: string;
  score: number;
  simulationTitle: string;
  type: string;
}

interface ScoreTrendChartProps {
  data: TrendDataPoint[];
  avgScore?: number;
}

/**
 * Line chart showing score trend over time
 */
export function ScoreTrendChart({ data, avgScore }: ScoreTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateLabel: d.date
        ? new Date(d.date).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
          })
        : `#${d.index}`,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
        />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          stroke="currentColor"
          className="text-gray-500 dark:text-gray-400"
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload as TrendDataPoint & { dateLabel: string };
              return (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {d.simulationTitle}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {d.dateLabel}
                  </p>
                  <p className={`font-bold text-lg ${
                    d.score >= 70 ? 'text-green-600' : d.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {d.score.toFixed(1)}%
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        {avgScore !== undefined && (
          <ReferenceLine
            y={avgScore}
            stroke="#a8012b"
            strokeDasharray="5 5"
            label={{
              value: `Media: ${avgScore.toFixed(0)}%`,
              position: 'right',
              fill: '#a8012b',
              fontSize: 11,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="score"
          stroke="#a8012b"
          strokeWidth={2}
          dot={{ fill: '#a8012b', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, fill: '#a8012b' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ScoreTrendChart;
