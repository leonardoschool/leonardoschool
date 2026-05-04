'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyData {
  month: string;
  count: number;
  avgScore: number;
}

interface MonthlyActivityChartProps {
  data: MonthlyData[];
}

const MONTH_NAMES = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

/**
 * Area chart showing monthly activity and average scores
 */
export function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => {
      const [year, month] = d.month.split('-');
      const monthIndex = parseInt(month, 10) - 1;
      const monthLabel = `${MONTH_NAMES[monthIndex]} '${year.slice(2)}`;
      return {
        ...d,
        monthLabel,
      };
    });
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
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a8012b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a8012b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
        />
        <XAxis
          dataKey="monthLabel"
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
                    {d.monthLabel}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {d.count} simulazioni completate
                  </p>
                  <p className="font-medium text-[#a8012b]">
                    Media: {d.avgScore.toFixed(1)}%
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#a8012b"
          strokeWidth={2}
          fill="url(#colorCount)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default MonthlyActivityChart;
