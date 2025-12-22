'use client';

import { useMemo } from 'react';
import { colors } from '@/lib/theme/colors';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendDataPoint {
  index: number;
  date: string;
  score: number;
  simulationTitle: string;
  type: string;
}

interface OverviewStats {
  totalSimulations?: number;
  averageScore?: number;
  bestScore?: number;
  improvement?: number;
  simulationsThisMonth?: number;
  currentStreak?: number;
}

interface MiniStatsChartProps {
  overview?: OverviewStats;
  trendData?: TrendDataPoint[];
  isLoading?: boolean;
}

/**
 * MiniStatsChart - Compact stats widget for dashboard
 * Shows quick overview stats and a small trend chart
 */
export function MiniStatsChart({ overview: rawOverview, trendData: rawTrendData, isLoading }: MiniStatsChartProps) {
  // Provide default values
  const overview = useMemo(() => ({
    totalSimulations: rawOverview?.totalSimulations ?? 0,
    averageScore: rawOverview?.averageScore ?? 0,
    bestScore: rawOverview?.bestScore ?? 0,
    improvement: rawOverview?.improvement ?? 0,
    simulationsThisMonth: rawOverview?.simulationsThisMonth ?? 0,
    currentStreak: rawOverview?.currentStreak ?? 0,
  }), [rawOverview]);

  const trendData = useMemo(() => rawTrendData ?? [], [rawTrendData]);

  // Prepare chart data - filter out simulations with score 0 and take last 8
  const chartData = useMemo(() => {
    const filteredData = trendData.filter(d => d.score > 0);
    return filteredData.slice(-8).map((d, i) => ({
      ...d,
      label: i + 1,
    }));
  }, [trendData]);

  // Determine trend direction
  const trend = useMemo(() => {
    if (overview.improvement > 2) return 'up';
    if (overview.improvement < -2) return 'down';
    return 'stable';
  }, [overview.improvement]);

  if (isLoading) {
    return (
      <div className={`${colors.background.card} rounded-2xl p-5 animate-pulse`}>
        <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="h-24 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  const hasData = overview.totalSimulations > 0;

  return (
    <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.lg} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <BarChart3 className={`w-5 h-5 ${colors.primary.text}`} />
          <h3 className={`font-semibold ${colors.text.primary}`}>Il Tuo Andamento</h3>
        </div>
        <Link 
          href="/statistiche" 
          className={`text-sm ${colors.primary.text} ${colors.primary.textHover} flex items-center gap-1`}
        >
          Dettagli
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {!hasData ? (
        // Empty state
        <div className="px-5 py-8 text-center">
          <div className={`w-16 h-16 mx-auto rounded-2xl ${colors.background.secondary} flex items-center justify-center mb-4`}>
            <Target className={`w-8 h-8 ${colors.text.muted}`} />
          </div>
          <h4 className={`font-medium ${colors.text.primary} mb-2`}>
            Inizia a esercitarti!
          </h4>
          <p className={`text-sm ${colors.text.muted} max-w-xs mx-auto`}>
            Completa le tue prime simulazioni per vedere qui le tue statistiche e il tuo progresso.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Average Score */}
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${colors.text.muted}`}>Media</span>
                {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                {trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
              </div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {overview.averageScore.toFixed(1)}%
              </p>
              <p className={`text-xs mt-1 ${
                overview.improvement > 0 ? 'text-green-600 dark:text-green-400' : 
                overview.improvement < 0 ? 'text-red-600 dark:text-red-400' : 
                colors.text.muted
              }`}>
                {overview.improvement > 0 ? '+' : ''}{overview.improvement.toFixed(1)}% trend
              </p>
            </div>

            {/* Best Score */}
            <div className={`p-4 rounded-xl ${colors.background.secondary}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${colors.text.muted}`}>Migliore</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {overview.bestScore.toFixed(1)}%
              </p>
              <p className={`text-xs mt-1 ${colors.text.muted}`}>
                punteggio record
              </p>
            </div>
          </div>

          {/* Mini Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-3 rounded-lg ${colors.background.secondary} text-center`}>
              <p className={`text-lg font-bold ${colors.text.primary}`}>
                {overview.totalSimulations}
              </p>
              <p className={`text-xs ${colors.text.muted}`}>Totali</p>
            </div>
            <div className={`p-3 rounded-lg ${colors.background.secondary} text-center`}>
              <p className={`text-lg font-bold ${colors.text.primary}`}>
                {overview.simulationsThisMonth}
              </p>
              <p className={`text-xs ${colors.text.muted}`}>Questo mese</p>
            </div>
            <div className={`p-3 rounded-lg ${colors.background.secondary} text-center`}>
              <p className={`text-lg font-bold ${colors.text.primary}`}>
                {overview.currentStreak}
              </p>
              <p className={`text-xs ${colors.text.muted}`}>🔥 Streak</p>
            </div>
          </div>

          {/* Mini Trend Chart */}
          {chartData.length >= 2 && (
            <div className="pt-2">
              <p className={`text-xs ${colors.text.muted} mb-2`}>Ultime simulazioni</p>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a8012b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a8012b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <YAxis 
                      hide 
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as TrendDataPoint;
                          return (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-2 text-xs">
                              <p className="font-medium text-gray-900 dark:text-white truncate max-w-32">
                                {d.simulationTitle}
                              </p>
                              <p className={`font-bold ${
                                d.score >= 70 ? 'text-green-600' : 
                                d.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {d.score.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#a8012b"
                      strokeWidth={2}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MiniStatsChart;
