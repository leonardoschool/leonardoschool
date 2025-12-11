'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { 
  Search,
  Users,
  Mail,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function CollaboratorStudentsPage() {
  const [search, setSearch] = useState('');

  // Get students with limited info (no sensitive data)
  const { data: students, isLoading } = trpc.students.getListForCollaborator.useQuery();

  const filteredStudents = students?.filter(student => 
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>
              Studenti
            </h1>
            <p className={colors.text.secondary}>
              Visualizza gli studenti attivi (vista limitata)
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className={`mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800`}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Come collaboratore puoi visualizzare nome, email e statistiche degli studenti. 
              Per dati sensibili (codice fiscale, contratti, ecc.) contatta l&apos;amministratore.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className={`${colors.background.card} rounded-xl p-4 border ${colors.border.primary} mb-6`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.icon.secondary}`} />
            <input
              type="text"
              placeholder="Cerca studenti per nome o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:outline-none focus:ring-2 focus:ring-[#a8012b]/20`}
            />
          </div>
        </div>

        {/* Students List */}
        <div className={`${colors.background.card} rounded-xl border ${colors.border.primary} overflow-hidden`}>
          {isLoading ? (
            <div className="p-8 text-center">
              <Spinner size="lg" />
              <p className={`mt-2 ${colors.text.secondary}`}>Caricamento studenti...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center">
              <Users className={`w-12 h-12 mx-auto ${colors.text.muted} mb-3`} />
              <p className={colors.text.secondary}>
                {search ? 'Nessuno studente trovato' : 'Nessuno studente presente'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`p-4 ${colors.effects.hover.bgSubtle} transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full ${colors.primary.bg} flex items-center justify-center text-white font-semibold text-lg`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${colors.text.primary} truncate`}>
                        {student.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={`flex items-center gap-1 text-sm ${colors.text.secondary}`}>
                          <Mail className="w-3.5 h-3.5" />
                          {student.email}
                        </span>
                        {student.enrollmentDate && (
                          <span className={`flex items-center gap-1 text-sm ${colors.text.muted}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(student.enrollmentDate).toLocaleDateString('it-IT')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats preview */}
                    <div className="hidden sm:flex items-center gap-4">
                      {student.stats && (
                        <>
                          <div className="text-center">
                            <p className={`text-lg font-semibold ${colors.text.primary}`}>
                              {student.stats.totalSimulations || 0}
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>Test</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-lg font-semibold ${colors.text.primary}`}>
                              {student.stats.avgScore?.toFixed(0) || '-'}%
                            </p>
                            <p className={`text-xs ${colors.text.muted}`}>Media</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        student.isActive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {student.isActive ? 'Attivo' : 'Inattivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className={`text-center mt-4 text-sm ${colors.text.muted}`}>
          Totale: {filteredStudents.length} studenti
        </p>
      </div>
    </div>
  );
}
