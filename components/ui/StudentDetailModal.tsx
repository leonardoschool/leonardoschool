'use client';

import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import {
  GraduationCap,
  Mail,
  Calendar,
  BookOpen,
  UserCheck,
  MessageSquare,
  UsersIcon,
  Target,
  Award,
  X,
  Hash,
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

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

export function StudentDetailModal({ isOpen, onClose, studentId }: StudentDetailModalProps) {
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
                    {/* Matricola */}
                    {student.matricola && (
                      <div className={`p-4 rounded-lg ${colors.background.secondary}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Hash className={`w-4 h-4 ${colors.text.muted}`} />
                          <span className={`text-sm ${colors.text.muted}`}>Matricola</span>
                        </div>
                        <p className={`font-medium font-mono ${colors.text.primary}`}>{student.matricola}</p>
                      </div>
                    )}
                    
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
