'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader } from '@/components/ui/loaders';
import Link from 'next/link';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  FileText,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Search,
} from 'lucide-react';

export default function OpenAnswersReviewPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = trpc.simulations.getResultsWithPendingReviews.useQuery({
    limit: 50,
    offset: 0,
  });

  if (isLoading) return <PageLoader />;

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={`text-center py-12 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <p className={`font-medium ${colors.text.primary}`}>
            {error.message || 'Errore nel caricamento'}
          </p>
        </div>
      </div>
    );
  }

  const filteredResults = data?.results.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.simulation.title.toLowerCase().includes(query) ||
      r.student.name.toLowerCase().includes(query) ||
      r.student.email.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/simulazioni"
            className={`p-2 rounded-lg ${colors.background.hover} ${colors.text.secondary} hover:${colors.text.primary}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
              Risposte Aperte da Correggere
            </h1>
            <p className={`text-sm ${colors.text.muted} mt-1`}>
              {data?.total || 0} risultati con risposte in attesa di revisione
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={`${colors.background.card} rounded-xl p-4 mb-6 border ${colors.border.light}`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
          <input
            type="text"
            placeholder="Cerca per simulazione, studente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
          />
        </div>
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className={`text-center py-16 ${colors.background.card} rounded-xl border ${colors.border.light}`}>
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
            Nessuna risposta da correggere
          </h3>
          <p className={`${colors.text.muted}`}>
            Tutte le risposte aperte sono state revisionate
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <Link
              key={result.id}
              href={`/simulazioni/risposte-aperte/${result.id}`}
              className={`block ${colors.background.card} rounded-xl p-6 border ${colors.border.light} hover:border-red-300 dark:hover:border-red-700 transition-colors`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Simulation title */}
                  <h3 className={`font-semibold ${colors.text.primary} mb-1 truncate`}>
                    {result.simulation.title}
                  </h3>

                  {/* Student info */}
                  <div className="flex items-center gap-2 mb-3">
                    <User className={`w-4 h-4 ${colors.text.muted}`} />
                    <span className={`text-sm ${colors.text.secondary}`}>
                      {result.student.name}
                    </span>
                    <span className={`text-xs ${colors.text.muted}`}>
                      ({result.student.email})
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-4 h-4 ${colors.text.muted}`} />
                      <span className={colors.text.muted}>
                        Completata: {result.completedAt 
                          ? format(new Date(result.completedAt), 'dd MMM yyyy, HH:mm', { locale: it })
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className={`w-4 h-4 ${colors.text.muted}`} />
                      <span className={colors.text.muted}>
                        Punteggio parziale: {result.totalScore.toFixed(1)} ({result.percentageScore.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pending count badge */}
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      <AlertCircle className="w-4 h-4" />
                      {result.pendingOpenAnswers} da correggere
                    </span>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${colors.text.muted}`} />
                </div>
              </div>

              {/* Open answers preview */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-xs font-medium ${colors.text.muted} mb-2`}>
                  Risposte da correggere:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.openAnswers.slice(0, 3).map((oa, idx) => (
                    <span
                      key={oa.id}
                      className={`px-2 py-1 text-xs rounded ${colors.background.secondary} ${colors.text.secondary} truncate max-w-[200px]`}
                    >
                      Q{idx + 1}: {oa.questionText.substring(0, 50)}...
                    </span>
                  ))}
                  {result.openAnswers.length > 3 && (
                    <span className={`px-2 py-1 text-xs rounded ${colors.background.tertiary} ${colors.text.muted}`}>
                      +{result.openAnswers.length - 3} altre
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination info */}
      {data && data.hasMore && (
        <div className="mt-6 text-center">
          <p className={`text-sm ${colors.text.muted}`}>
            Mostrati {filteredResults.length} di {data.total} risultati
          </p>
        </div>
      )}
    </div>
  );
}
