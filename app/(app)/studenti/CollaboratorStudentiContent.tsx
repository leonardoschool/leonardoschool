'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { PageLoader, Spinner } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import {
  Users,
  Search,
  GraduationCap,
  Mail,
  Calendar,
  BookOpen,
  FileText,
  UserCheck,
  MessageSquare,
  UsersIcon,
  Target,
  Award,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper to format date
const formatDate = (date: Date | string | null) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};



// Student Detail Modal
function StudentDetailModal({ 
  isOpen, 
  onClose, 
  studentId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  studentId: string;
}) {
  const router = useRouter();
  
  const { data: student, isLoading } = trpc.students.getStudentDetailForCollaborator.useQuery(
    { studentId },
    { enabled: isOpen && !!studentId }
  );

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
        <div className={`${colors.background.card} rounded-2xl w-full max-w-5xl my-8 shadow-2xl max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className={`p-6 border-b ${colors.border.primary} flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                  {student?.name.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${colors.text.primary}`}>
                    {student?.name || 'Caricamento...'}
                  </h3>
                  <p className={`${colors.text.secondary} text-sm mt-0.5`}>
                    Dettagli studente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg hover:${colors.background.secondary} text-gray-600 dark:text-gray-400 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : !student ? (
              <div className="text-center py-12">
                <p className={colors.text.secondary}>Studente non trovato</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Section */}
                <div>
                  <h4 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                    <UserCheck className="w-5 h-5" />
                    Informazioni Studente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className={`w-4 h-4 ${colors.text.muted}`} />
                        <span className={`text-sm ${colors.text.muted}`}>Email</span>
                      </div>
                      <p className={`font-medium ${colors.text.primary}`}>{student.email}</p>
                    </div>
                    
                    <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className={`w-4 h-4 ${colors.text.muted}`} />
                        <span className={`text-sm ${colors.text.muted}`}>Data Iscrizione</span>
                      </div>
                      <p className={`font-medium ${colors.text.primary}`}>{formatDate(student.enrollmentDate)}</p>
                    </div>
                    
                    {student.className && (
                      <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className={`w-4 h-4 ${colors.text.muted}`} />
                          <span className={`text-sm ${colors.text.muted}`}>Classe</span>
                        </div>
                        <p className={`font-medium ${colors.text.primary}`}>{student.className}</p>
                      </div>
                    )}
                    
                    {student.graduationYear && (
                      <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <GraduationCap className={`w-4 h-4 ${colors.text.muted}`} />
                          <span className={`text-sm ${colors.text.muted}`}>Anno di Maturità</span>
                        </div>
                        <p className={`font-medium ${colors.text.primary}`}>{student.graduationYear}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Groups Section */}
                {student.groups && student.groups.length > 0 && (
                  <div>
                    <h4 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                      <UsersIcon className="w-5 h-5" />
                      Gruppi ({student.groups.length})
                    </h4>
                    <div className="space-y-3">
                      {student.groups.map((group) => (
                        <div 
                          key={group.id} 
                          className={`p-4 rounded-lg ${colors.background.secondary} hover:ring-2 ring-blue-500/20 transition-all`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h5 className={`font-semibold ${colors.text.primary} flex items-center gap-2`}>
                                {group.name}
                                {group.color && (
                                  <span 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: group.color }}
                                  />
                                )}
                              </h5>
                              {group.description && (
                                <p className={`text-sm ${colors.text.secondary} mt-1`}>{group.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className={colors.text.muted}>
                                  Iscritto: {formatDate(group.joinedAt)}
                                </span>
                                {group.materialsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                    <BookOpen className="w-3 h-3" />
                                    {group.materialsCount} materiali
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials Section */}
                {student.materials && student.materials.length > 0 && (
                  <div>
                    <h4 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                      <BookOpen className="w-5 h-5" />
                      Materiali Assegnati ({student.materials.length})
                    </h4>
                    <div className="space-y-3">
                      {student.materials.map((material) => {
                        const typeColors = {
                          PDF: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
                          VIDEO: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
                          LINK: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
                          DOCUMENT: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
                        };
                        const typeColor = typeColors[material.type as keyof typeof typeColors] || typeColors.DOCUMENT;
                        
                        return (
                          <div 
                            key={material.id} 
                            className={`p-4 rounded-lg ${colors.background.secondary} hover:ring-2 ring-purple-500/20 transition-all`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className={`font-semibold ${colors.text.primary}`}>{material.title}</h5>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor.bg} ${typeColor.text}`}>
                                    {material.type}
                                  </span>
                                  {/* Access type badge */}
                                  {material.accessType === 'GROUP' && material.groupName && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                                      <UsersIcon className="w-3 h-3" />
                                      {material.groupName}
                                    </span>
                                  )}
                                  {material.accessType === 'DIRECT' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      Diretto
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className={colors.text.muted}>
                                    Accesso: {formatDate(material.grantedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Simulations Section */}
                {student.simulations && student.simulations.length > 0 && (
                  <div>
                    <h4 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                      <Target className="w-5 h-5" />
                      Simulazioni Assegnate ({student.simulations.length})
                    </h4>
                    <div className="space-y-3">
                      {student.simulations.map((sim) => {
                        const typeColors = {
                          PRACTICE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
                          EXAM: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
                          QUIZ: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
                        };
                        const typeColor = typeColors[sim.type as keyof typeof typeColors] || typeColors.PRACTICE;
                        
                        return (
                          <div 
                            key={sim.id} 
                            className={`p-4 rounded-lg ${colors.background.secondary} hover:ring-2 ring-green-500/20 transition-all`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className={`font-semibold ${colors.text.primary}`}>{sim.title}</h5>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor.bg} ${typeColor.text} uppercase font-medium`}>
                                    {sim.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className={colors.text.muted}>
                                    Assegnato: {formatDate(sim.assignedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty states */}
                {(!student.groups || student.groups.length === 0) && 
                 (!student.materials || student.materials.length === 0) && 
                 (!student.simulations || student.simulations.length === 0) && (
                  <div className="text-center py-8">
                    <Award className={`w-12 h-12 mx-auto ${colors.text.muted} mb-3`} />
                    <p className={`${colors.text.secondary} mb-2`}>Nessun contenuto assegnato</p>
                    <p className={`text-sm ${colors.text.muted}`}>
                      Questo studente non ha ancora gruppi, materiali o simulazioni assegnati
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Contact Button */}
          <div className={`p-6 border-t ${colors.border.primary} flex-shrink-0 flex gap-3`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} font-medium hover:opacity-80 transition-opacity`}
            >
              Chiudi
            </button>
            {student && (
              <button
                onClick={() => {
                  router.push(`/messaggi?nuovo=${student.id}`);
                  onClose();
                }}
                className={`flex-1 px-4 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
              >
                <MessageSquare className="w-4 h-4" />
                Contatta Studente
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function CollaboratorStudentiContent() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: students, isLoading } = trpc.students.getListForCollaborator.useQuery();

  const filteredStudents = students?.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const activeStudents = filteredStudents.filter(s => s.isActive);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
            <GraduationCap className="w-8 h-8" />
            I Miei Studenti
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Visualizza e gestisci gli studenti a te assegnati
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`${colors.background.card} rounded-xl p-5 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className={`text-sm ${colors.text.muted}`}>Totale Studenti</p>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{students?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className={`${colors.background.card} rounded-xl p-5 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-sm ${colors.text.muted}`}>Attivi</p>
                <p className={`text-2xl font-bold text-green-600 dark:text-green-400`}>{activeStudents.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
            />
          </div>
        </div>

        {/* Students List */}
        <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
          {!filteredStudents.length ? (
            <div className="p-12 text-center">
              <Users className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
              <p className={colors.text.secondary}>
                {search ? 'Nessuno studente trovato' : 'Non hai ancora studenti assegnati'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${colors.text.primary} truncate`}>{student.name}</h3>
                        <p className={`text-sm ${colors.text.secondary} truncate`}>{student.email}</p>
                        
                        {/* Groups badges */}
                        {student.groups && student.groups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {student.groups.slice(0, 2).map((group) => (
                              <span 
                                key={group.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              >
                                {group.color && (
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                                )}
                                {group.name}
                              </span>
                            ))}
                            {student.groups.length > 2 && (
                              <span className={`text-xs ${colors.text.muted}`}>+{student.groups.length - 2}</span>
                            )}
                          </div>
                        )}

                        {/* Status badge */}
                        <div className="mt-2">
                          {student.isActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Attivo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Inattivo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`flex-1 px-3 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} text-sm font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2`}
                      >
                        <FileText className="w-4 h-4" />
                        Dettagli
                      </button>
                      {student.isActive && (
                        <button
                          onClick={() => router.push(`/messaggi?nuovo=${student.id}`)}
                          className={`flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Contatta
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className={`${colors.background.secondary} border-b ${colors.border.primary}`}>
                    <tr>
                      <th className={`text-left px-6 py-4 font-semibold text-sm ${colors.text.primary}`}>Studente</th>
                      <th className={`text-left px-6 py-4 font-semibold text-sm ${colors.text.primary}`}>Email</th>
                      <th className={`text-left px-6 py-4 font-semibold text-sm ${colors.text.primary}`}>Gruppi</th>
                      <th className={`text-left px-6 py-4 font-semibold text-sm ${colors.text.primary}`}>Stato</th>
                      <th className={`text-right px-6 py-4 font-semibold text-sm ${colors.text.primary}`}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.id} 
                        className={`border-b ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium ${colors.text.primary}`}>{student.name}</p>
                              <p className={`text-xs ${colors.text.muted}`}>ID: {student.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-2 text-sm ${colors.text.secondary}`}>
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{student.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {student.groups && student.groups.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {student.groups.slice(0, 2).map((group) => (
                                <span 
                                  key={group.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                >
                                  {group.color && (
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                                  )}
                                  {group.name}
                                </span>
                              ))}
                              {student.groups.length > 2 && (
                                <span className={`text-xs ${colors.text.muted}`}>+{student.groups.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className={`text-sm ${colors.text.muted}`}>Nessun gruppo</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {student.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Attivo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Inattivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedStudentId(student.id)}
                              className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 transition-opacity`}
                              title="Visualizza dettagli"
                            >
                              <FileText className={`w-4 h-4 ${colors.text.primary}`} />
                            </button>
                            {student.isActive && (
                              <button
                                onClick={() => router.push(`/messaggi?nuovo=${student.id}`)}
                                className={`p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:opacity-80 transition-opacity`}
                                title="Contatta studente"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudentId && (
        <StudentDetailModal
          isOpen={!!selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          studentId={selectedStudentId}
        />
      )}
    </>
  );
}