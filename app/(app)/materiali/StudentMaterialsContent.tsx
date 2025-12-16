'use client';

import { useState, useMemo, JSX } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import {
  Book,
  ChevronRight,
  ChevronDown,
  Download,
  File,
  Video,
  FileText,
  ImageIcon,
  Folder,
  FolderOpen,
  Search,
  Filter,
  X,
} from 'lucide-react';

// Helper per generare colore di sfondo chiaro da hex (solo se c'è un colore custom)
const getSubjectBgStyle = (hexColor: string | null | undefined, isDark: boolean = false) => {
  if (!hexColor) return {}; // No inline style, use Tailwind classes
  // Rimuovi # se presente
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Sfondo con opacità diversa per light/dark mode
  const opacity = isDark ? 0.2 : 0.15;
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})` };
};

// Helper per generare colore testo da hex (solo se c'è un colore custom)
const getSubjectTextStyle = (hexColor: string | null | undefined) => {
  if (!hexColor) return {}; // No inline style, use Tailwind classes
  return { color: hexColor };
};

// Interfacce per la gerarchia (aggiornate per nuovo schema)
interface MaterialData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  createdAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
  topic: {
    id: string;
    name: string;
  } | null;
  subTopic: {
    id: string;
    name: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  } | null;
  subject: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface HierarchyNode {
  subject: {
    id: string;
    name: string;
    color: string | null;
  };
  topics: {
    topic: {
      id: string;
      name: string;
    };
    subTopics: {
      subTopic: {
        id: string;
        name: string;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      };
      materials: MaterialData[];
    }[];
    // Materials directly under topic (no subTopic)
    directMaterials: MaterialData[];
  }[];
  // Materials directly under subject (no topic)
  directMaterials: MaterialData[];
}

export default function StudentMaterialsContent() {
  // Stati UI
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubTopics, setExpandedSubTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Query per materiali studente
  const { data: materials, isLoading: loadingMaterials } = trpc.materials.getMyMaterials.useQuery();

  // Costruisci gerarchia dai materiali (aggiornata per nuovo schema)
  const hierarchy = useMemo<HierarchyNode[]>(() => {
    if (!materials) return [];

    const subjectMap = new Map<string, HierarchyNode>();

    materials.forEach((material) => {
      const mat = material as unknown as MaterialData;
      
      // Subject è opzionale, se non c'è raggruppiamo sotto "Altro"
      const subjectId = mat.subject?.id || 'other';
      const subjectName = mat.subject?.name || 'Altro';
      const subjectColor = mat.subject?.color || null;

      // Get or create subject node
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: {
            id: subjectId,
            name: subjectName,
            color: subjectColor,
          },
          topics: [],
          directMaterials: [],
        });
      }
      const subjectNode = subjectMap.get(subjectId)!;

      // Se non c'è topic, aggiungi ai materiali diretti del subject
      if (!mat.topic) {
        subjectNode.directMaterials.push(mat);
        return;
      }

      // Find or create topic
      let topicNode = subjectNode.topics.find((t) => t.topic.id === mat.topic!.id);
      if (!topicNode) {
        topicNode = {
          topic: {
            id: mat.topic.id,
            name: mat.topic.name,
          },
          subTopics: [],
          directMaterials: [],
        };
        subjectNode.topics.push(topicNode);
      }

      // Se non c'è subTopic, aggiungi ai materiali diretti del topic
      if (!mat.subTopic) {
        topicNode.directMaterials.push(mat);
        return;
      }

      // Find or create subTopic
      let subTopicNode = topicNode.subTopics.find(
        (st) => st.subTopic.id === mat.subTopic!.id
      );
      if (!subTopicNode) {
        subTopicNode = {
          subTopic: {
            id: mat.subTopic.id,
            name: mat.subTopic.name,
            difficulty: mat.subTopic.difficulty,
          },
          materials: [],
        };
        topicNode.subTopics.push(subTopicNode);
      }

      // Add material
      subTopicNode.materials.push(mat);
    });

    return Array.from(subjectMap.values());
  }, [materials]);

  // Filtra materiali
  const filteredHierarchy = useMemo<HierarchyNode[]>(() => {
    if (!searchQuery && !difficultyFilter) return hierarchy;

    const searchLower = searchQuery.toLowerCase();

    return hierarchy
      .map((subjectNode) => ({
        ...subjectNode,
        directMaterials: subjectNode.directMaterials.filter(
          (m) =>
            m.title.toLowerCase().includes(searchLower) ||
            m.description?.toLowerCase().includes(searchLower)
        ),
        topics: subjectNode.topics
          .map((topicNode) => ({
            ...topicNode,
            directMaterials: topicNode.directMaterials.filter(
              (m) =>
                m.title.toLowerCase().includes(searchLower) ||
                m.description?.toLowerCase().includes(searchLower) ||
                topicNode.topic.name.toLowerCase().includes(searchLower)
            ),
            subTopics: topicNode.subTopics
              .filter((stNode) => {
                if (difficultyFilter && stNode.subTopic.difficulty !== difficultyFilter) {
                  return false;
                }
                return true;
              })
              .map((stNode) => ({
                ...stNode,
                materials: stNode.materials.filter(
                  (m) =>
                    m.title.toLowerCase().includes(searchLower) ||
                    m.description?.toLowerCase().includes(searchLower) ||
                    stNode.subTopic.name.toLowerCase().includes(searchLower) ||
                    topicNode.topic.name.toLowerCase().includes(searchLower)
                ),
              }))
              .filter((stNode) => stNode.materials.length > 0),
          }))
          .filter((topicNode) => topicNode.subTopics.length > 0 || topicNode.directMaterials.length > 0),
      }))
      .filter((subNode) => subNode.topics.length > 0 || subNode.directMaterials.length > 0);
  }, [hierarchy, searchQuery, difficultyFilter]);

  // Toggle functions
  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubTopic = (id: string) => {
    setExpandedSubTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helper per icona file
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('video')) return <Video className="w-4 h-4" />;
    if (fileType.includes('image')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  // Helper per formattare dimensione file
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper per badge difficolta
  const getDifficultyBadge = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    const styles = {
      EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = {
      EASY: 'Facile',
      MEDIUM: 'Medio',
      HARD: 'Difficile',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[difficulty]}`}>
        {labels[difficulty]}
      </span>
    );
  };

  // Conta totale materiali
  const totalMaterials = materials?.length || 0;

  if (loadingMaterials) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">I Miei Materiali</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {totalMaterials} materiali disponibili
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters || difficultyFilter
                ? `${colors.primary.bg} ${colors.primary.text} border-transparent`
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca materiali..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400 self-center">Difficolta:</span>
            {['', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  difficultyFilter === diff
                    ? `${colors.primary.bg} text-white`
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {diff === '' ? 'Tutti' : diff === 'EASY' ? 'Facile' : diff === 'MEDIUM' ? 'Medio' : 'Difficile'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredHierarchy.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Book className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || difficultyFilter ? 'Nessun risultato' : 'Nessun materiale disponibile'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            {searchQuery || difficultyFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'I materiali assegnati appariranno qui'}
          </p>
        </div>
      )}

      {/* Hierarchical Tree */}
      <div className="space-y-3">
        {filteredHierarchy.map((subjectNode) => {
          const isSubjectExpanded = expandedSubjects.has(subjectNode.subject.id);
          const subjectColor = subjectNode.subject.color;
          
          // Conta totale materiali per subject
          const totalMaterialsInSubject = 
            subjectNode.directMaterials.length +
            subjectNode.topics.reduce(
              (acc, t) => acc + t.directMaterials.length + t.subTopics.reduce((a, st) => a + st.materials.length, 0),
              0
            );

          return (
            <div
              key={subjectNode.subject.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/30"
            >
              {/* Subject Header */}
              <button
                onClick={() => toggleSubject(subjectNode.subject.id)}
                style={subjectColor ? getSubjectBgStyle(subjectColor) : undefined}
                className={`w-full flex items-center gap-3 p-4 transition-colors ${!subjectColor ? 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700' : 'hover:opacity-80'}`}
              >
                {isSubjectExpanded ? (
                  <ChevronDown style={getSubjectTextStyle(subjectColor)} className={`w-5 h-5 ${!subjectColor ? 'text-gray-600 dark:text-gray-300' : ''}`} />
                ) : (
                  <ChevronRight style={getSubjectTextStyle(subjectColor)} className={`w-5 h-5 ${!subjectColor ? 'text-gray-600 dark:text-gray-300' : ''}`} />
                )}
                <Book style={getSubjectTextStyle(subjectColor)} className={`w-5 h-5 ${!subjectColor ? 'text-gray-600 dark:text-gray-300' : ''}`} />
                <span style={getSubjectTextStyle(subjectColor)} className={`font-semibold ${!subjectColor ? 'text-gray-800 dark:text-gray-100' : ''}`}>{subjectNode.subject.name}</span>
                <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                  {totalMaterialsInSubject} materiali
                </span>
              </button>

              {/* Topics */}
              {isSubjectExpanded && (
                <div className="bg-gray-50/50 dark:bg-gray-800/30">
                  {/* Materiali diretti del subject (senza topic) */}
                  {subjectNode.directMaterials.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-700 pl-8 pr-4 py-3 space-y-2">
                      {subjectNode.directMaterials.map((material) => (
                        <MaterialCard
                          key={material.id}
                          material={material}
                          getFileIcon={getFileIcon}
                          formatFileSize={formatFileSize}
                        />
                      ))}
                    </div>
                  )}
                  
                  {subjectNode.topics.map((topicNode) => {
                    const isTopicExpanded = expandedTopics.has(topicNode.topic.id);
                    const topicMaterialCount = topicNode.directMaterials.length + 
                      topicNode.subTopics.reduce((a, st) => a + st.materials.length, 0);

                    return (
                      <div key={topicNode.topic.id} className="border-t border-gray-100 dark:border-gray-700">
                        {/* Topic Header */}
                        <button
                          onClick={() => toggleTopic(topicNode.topic.id)}
                          className="w-full flex items-center gap-3 p-3 pl-8 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          {isTopicExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          {isTopicExpanded ? (
                            <FolderOpen className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Folder className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {topicNode.topic.name}
                          </span>
                          <span className="ml-auto text-xs text-gray-500">
                            {topicMaterialCount} materiali
                          </span>
                        </button>

                        {/* SubTopics and direct materials */}
                        {isTopicExpanded && (
                          <div className="bg-gray-50/50 dark:bg-gray-800/50">
                            {/* Materiali diretti del topic (senza subTopic) */}
                            {topicNode.directMaterials.length > 0 && (
                              <div className="pl-14 pr-4 py-3 space-y-2">
                                {topicNode.directMaterials.map((material) => (
                                  <MaterialCard
                                    key={material.id}
                                    material={material}
                                    getFileIcon={getFileIcon}
                                    formatFileSize={formatFileSize}
                                  />
                                ))}
                              </div>
                            )}
                            
                            {topicNode.subTopics.map((stNode) => {
                              const isStExpanded = expandedSubTopics.has(stNode.subTopic.id);

                              return (
                                <div key={stNode.subTopic.id}>
                                  {/* SubTopic Header */}
                                  <button
                                    onClick={() => toggleSubTopic(stNode.subTopic.id)}
                                    className="w-full flex items-center gap-3 p-3 pl-14 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
                                  >
                                    {isStExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                    {isStExpanded ? (
                                      <FolderOpen className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <Folder className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {stNode.subTopic.name}
                                    </span>
                                    {getDifficultyBadge(stNode.subTopic.difficulty)}
                                    <span className="ml-auto text-xs text-gray-400">
                                      {stNode.materials.length} file
                                    </span>
                                  </button>

                                  {/* Materials */}
                                  {isStExpanded && (
                                    <div className="pl-20 pr-4 pb-3 space-y-2">
                                      {stNode.materials.map((material) => (
                                        <MaterialCard
                                          key={material.id}
                                          material={material}
                                          getFileIcon={getFileIcon}
                                          formatFileSize={formatFileSize}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Componente card materiale
function MaterialCard({
  material,
  getFileIcon,
  formatFileSize,
}: {
  material: MaterialData;
  getFileIcon: (fileType: string) => JSX.Element;
  formatFileSize: (bytes: number) => string;
}) {
  const handleOpen = () => {
    const url = material.fileUrl || material.externalUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Determina l'icona dal type
  const getIconType = () => {
    switch (material.type) {
      case 'PDF':
        return 'pdf';
      case 'VIDEO':
        return 'video';
      case 'LINK':
        return 'link';
      default:
        return 'document';
    }
  };

  // Get action icon based on type
  const getActionIcon = () => {
    if (material.type === 'LINK') {
      return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
    }
    return <Download className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
        {getFileIcon(getIconType())}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{material.title}</p>
        {material.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{material.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {material.fileSize ? formatFileSize(material.fileSize) + ' - ' : ''}
          {new Date(material.createdAt).toLocaleDateString('it-IT')}
        </p>
      </div>
      <button
        onClick={handleOpen}
        disabled={!material.fileUrl && !material.externalUrl}
        className={`p-2 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
        title={material.type === 'LINK' ? 'Apri link' : 'Scarica'}
      >
        {getActionIcon()}
      </button>
    </div>
  );
}
