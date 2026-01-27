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
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  // Sfondo con opacità diversa per light/dark mode
  const opacity = isDark ? 0.2 : 0.15;
  return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})` };
};

// Helper per generare colore testo da hex (solo se c'è un colore custom)
const getSubjectTextStyle = (hexColor: string | null | undefined) => {
  if (!hexColor) return {}; // No inline style, use Tailwind classes
  return { color: hexColor };
};

// Helper per classi Tailwind di fallback quando non c'è un colore custom
const getNoColorFallbackClasses = (subjectColor: string | null | undefined) => {
  return subjectColor ? '' : 'text-gray-600 dark:text-gray-300';
};

const getNoColorButtonClasses = (subjectColor: string | null | undefined) => {
  return subjectColor
    ? 'hover:opacity-80'
    : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700';
};

const getNoColorTextClasses = (subjectColor: string | null | undefined) => {
  return subjectColor ? '' : 'text-gray-800 dark:text-gray-100';
};

// Interfacce per la gerarchia (aggiornate per nuovo schema)
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

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
    difficulty: DifficultyLevel;
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
        difficulty: DifficultyLevel;
      };
      materials: MaterialData[];
    }[];
    // Materials directly under topic (no subTopic)
    directMaterials: MaterialData[];
  }[];
  // Materials directly under subject (no topic)
  directMaterials: MaterialData[];
}

// Helper per verificare se il materiale corrisponde alla ricerca (estratto per ridurre nesting)
function matchesSearch(m: MaterialData, searchLower: string, additionalTexts: string[] = []): boolean {
  const textToSearch = [
    m.title.toLowerCase(),
    m.description?.toLowerCase() ?? '',
    ...additionalTexts.map(t => t.toLowerCase())
  ].join(' ');
  return textToSearch.includes(searchLower);
}

// Helper per filtrare materiali in un subTopic
function filterSubTopicMaterials(
  materials: MaterialData[],
  searchLower: string,
  subTopicName: string,
  topicName: string
): MaterialData[] {
  return materials.filter((m) =>
    matchesSearch(m, searchLower, [subTopicName, topicName])
  );
}

// Helper per filtrare i subTopics
function filterSubTopics(
  subTopics: HierarchyNode['topics'][0]['subTopics'],
  topicName: string,
  searchLower: string,
  difficultyFilter: string
): HierarchyNode['topics'][0]['subTopics'] {
  return subTopics
    .filter((stNode) => !difficultyFilter || stNode.subTopic.difficulty === difficultyFilter)
    .map((stNode) => ({
      ...stNode,
      materials: filterSubTopicMaterials(stNode.materials, searchLower, stNode.subTopic.name, topicName),
    }))
    .filter((stNode) => stNode.materials.length > 0);
}

// Helper per filtrare i topics
function filterTopics(
  topics: HierarchyNode['topics'],
  searchLower: string,
  difficultyFilter: string
): HierarchyNode['topics'] {
  return topics
    .map((topicNode) => ({
      ...topicNode,
      directMaterials: topicNode.directMaterials.filter((m) =>
        matchesSearch(m, searchLower, [topicNode.topic.name])
      ),
      subTopics: filterSubTopics(topicNode.subTopics, topicNode.topic.name, searchLower, difficultyFilter),
    }))
    .filter((topicNode) => topicNode.subTopics.length > 0 || topicNode.directMaterials.length > 0);
}

// Helper per filtrare la gerarchia completa
function filterHierarchy(
  hierarchy: HierarchyNode[],
  searchQuery: string,
  difficultyFilter: string
): HierarchyNode[] {
  if (!searchQuery && !difficultyFilter) return hierarchy;

  const searchLower = searchQuery.toLowerCase();

  return hierarchy
    .map((subjectNode) => ({
      ...subjectNode,
      directMaterials: subjectNode.directMaterials.filter((m) => matchesSearch(m, searchLower)),
      topics: filterTopics(subjectNode.topics, searchLower, difficultyFilter),
    }))
    .filter((subNode) => subNode.topics.length > 0 || subNode.directMaterials.length > 0);
}

export default function StudentMaterialsContent() {
  // Stati UI
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubTopics, setExpandedSubTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Query per categorie (cartelle) e materiali studente
  const { data: categories, isLoading: loadingCategories } = trpc.materials.getCategories.useQuery();
  const { data: materials, isLoading: loadingMaterials } = trpc.materials.getMyMaterials.useQuery(
    selectedCategoryId ? { categoryId: selectedCategoryId } : undefined
  );

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
      // We know it exists because we just set it above
      const subjectNode = subjectMap.get(subjectId);
      if (!subjectNode) return;

      // Se non c'è topic, aggiungi ai materiali diretti del subject
      if (!mat.topic) {
        subjectNode.directMaterials.push(mat);
        return;
      }

      // Find or create topic
      const topicId = mat.topic.id;
      let topicNode = subjectNode.topics.find((t) => t.topic.id === topicId);
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
      const subTopicId = mat.subTopic.id;
      let subTopicNode = topicNode.subTopics.find(
        (st) => st.subTopic.id === subTopicId
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

  // Filtra materiali usando helper estratti
  const filteredHierarchy = useMemo<HierarchyNode[]>(() => {
    return filterHierarchy(hierarchy, searchQuery, difficultyFilter);
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
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  const totalCategories = categories?.length || 0;

  if (loadingMaterials || loadingCategories) {
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
            {totalCategories > 0 && `${totalCategories} ${totalCategories === 1 ? 'cartella' : 'cartelle'} • `}
            {totalMaterials} {totalMaterials === 1 ? 'materiale' : 'materiali'}
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

      {/* Cartelle */}
      {categories && categories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Cartelle
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;
              const materialCount = category._count?.materials || 0;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(isSelected ? null : category.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {isSelected ? (
                      <FolderOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Folder className="w-6 h-6 text-gray-400" />
                    )}
                    <h3 className={`font-semibold ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {category.name}
                    </h3>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {materialCount} {materialCount === 1 ? 'materiale' : 'materiali'}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedCategoryId && (
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-indigo-900 dark:text-indigo-300">
                  Filtrando per: <strong>{categories.find(c => c.id === selectedCategoryId)?.name}</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

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
                {{ '': 'Tutti', 'EASY': 'Facile', 'MEDIUM': 'Medio', 'HARD': 'Difficile' }[diff] || diff}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredHierarchy.length === 0 && (!categories || categories.length === 0) && (
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

      {/* Empty State when filtering by category */}
      {selectedCategoryId && filteredHierarchy.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Cartella vuota
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Questa cartella non contiene ancora materiali
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
                className={`w-full flex items-center gap-3 p-4 transition-colors ${getNoColorButtonClasses(subjectColor)}`}
              >
                {isSubjectExpanded ? (
                  <ChevronDown style={getSubjectTextStyle(subjectColor)} className={`w-5 h-5 ${getNoColorFallbackClasses(subjectColor)}`} />
                ) : (
                  <ChevronRight style={getSubjectTextStyle(subjectColor)} className={`w-5 h-5 ${getNoColorFallbackClasses(subjectColor)}`} />
                )}
                <Book style={getSubjectTextStyle(subjectColor)} className={`w-5 h-5 ${getNoColorFallbackClasses(subjectColor)}`} />
                <span style={getSubjectTextStyle(subjectColor)} className={`font-semibold ${getNoColorTextClasses(subjectColor)}`}>{subjectNode.subject.name}</span>
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
                            
                            {topicNode.subTopics.map((stNode) => (
                              <SubTopicItem
                                key={stNode.subTopic.id}
                                stNode={stNode}
                                isExpanded={expandedSubTopics.has(stNode.subTopic.id)}
                                subTopicId={stNode.subTopic.id}
                                toggleSubTopic={toggleSubTopic}
                                getFileIcon={getFileIcon}
                                formatFileSize={formatFileSize}
                                getDifficultyBadge={getDifficultyBadge}
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
    </div>
  );
}

// Componente SubTopic Item (estratto per ridurre nesting)
interface SubTopicItemProps {
  readonly stNode: {
    subTopic: {
      id: string;
      name: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    };
    materials: MaterialData[];
  };
  readonly isExpanded: boolean;
  readonly subTopicId: string;
  readonly toggleSubTopic: (id: string) => void;
  readonly getFileIcon: (fileType: string) => JSX.Element;
  readonly formatFileSize: (bytes: number) => string;
  readonly getDifficultyBadge: (difficulty: DifficultyLevel) => JSX.Element;
}

function SubTopicItem({
  stNode,
  isExpanded,
  subTopicId,
  toggleSubTopic,
  getFileIcon,
  formatFileSize,
  getDifficultyBadge,
}: SubTopicItemProps) {
  const handleToggle = () => toggleSubTopic(subTopicId);

  return (
    <div>
      {/* SubTopic Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-3 pl-14 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        {isExpanded ? (
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
      {isExpanded && (
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
}

// Componente card materiale
interface MaterialCardProps {
  readonly material: MaterialData;
  readonly getFileIcon: (fileType: string) => JSX.Element;
  readonly formatFileSize: (bytes: number) => string;
}

function MaterialCard({
  material,
  getFileIcon,
  formatFileSize,
}: MaterialCardProps) {
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
