'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import CustomSelect from '@/components/ui/CustomSelect';
import { 
  FolderOpen, 
  FileText,
  Video,
  Link as LinkIcon,
  File,
  Download,
  Search,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Play,
  BookOpen,
  X,
} from 'lucide-react';

type MaterialType = 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';

// Type for material data from tRPC query
interface Material {
  id: string;
  title: string;
  description?: string | null;
  type: MaterialType;
  fileUrl?: string | null;
  externalUrl?: string | null;
  fileSize?: number | null;
  categoryId?: string | null;
  subjects?: string[] | null;
  subject?: {
    name: string;
    color?: string | null;
  } | null;
}

const typeIcons: Record<MaterialType, typeof FileText> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: LinkIcon,
  DOCUMENT: File,
};

const typeLabels: Record<MaterialType, string> = {
  PDF: 'PDF',
  VIDEO: 'Video',
  LINK: 'Link',
  DOCUMENT: 'Documento',
};

export default function StudentMaterialsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MaterialType | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);

  // Queries
  const { data: materials, isLoading } = trpc.materials.getMyMaterials.useQuery({
    type: filterType || undefined,
    categoryId: filterCategory || undefined,
  });
  const { data: categories } = trpc.materials.getCategories.useQuery();

  // Mutations for tracking
  const recordViewMutation = trpc.materials.recordView.useMutation();
  const recordDownloadMutation = trpc.materials.recordDownload.useMutation();

  // Filter materials
  const filteredMaterials = materials?.filter((m) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.tags?.some((t: string) => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Group by category
  const groupedMaterials = filteredMaterials?.reduce((acc, material) => {
    const catId = material.categoryId || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(material);
    return acc;
  }, {} as Record<string, typeof filteredMaterials>);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleView = (material: Material) => {
    recordViewMutation.mutate({ id: material.id });
    
    if (material.type === 'LINK' && material.externalUrl) {
      window.open(material.externalUrl, '_blank');
    } else if (material.fileUrl) {
      setViewingMaterial(material);
    }
  };

  const handleDownload = (material: Material) => {
    recordDownloadMutation.mutate({ id: material.id });
    
    if (material.fileUrl) {
      window.open(material.fileUrl, '_blank');
    }
  };

  // Utility functions - kept for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTypeColor = (type: MaterialType) => {
    switch (type) {
      case 'PDF': return 'bg-red-100 dark:bg-red-900/30 text-red-600';
      case 'VIDEO': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600';
      case 'LINK': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600';
      case 'DOCUMENT': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${colors.text.primary} flex items-center gap-3`}>
          <BookOpen className="w-7 h-7 text-teal-600" />
          Materiale Didattico
        </h1>
        <p className={`mt-1 ${colors.text.secondary}`}>
          PDF, video e risorse per il tuo studio
        </p>
      </div>

      {/* Search & Filters */}
      <div className={`${colors.background.card} rounded-xl shadow-sm p-4`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca materiali..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
            />
          </div>
          <div className="flex gap-3">
            <div className="w-40">
              <CustomSelect
                value={filterType}
                onChange={(value) => setFilterType(value as MaterialType | '')}
                options={[
                  { value: '', label: 'Tutti i tipi' },
                  ...Object.entries(typeLabels).map(([key, label]) => ({ value: key, label }))
                ]}
                placeholder="Tutti i tipi"
              />
            </div>
            <div className="w-48">
              <CustomSelect
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { value: '', label: 'Tutte le categorie' },
                  ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || [])
                ]}
                placeholder="Tutte le categorie"
                searchable
              />
            </div>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !filteredMaterials?.length ? (
        <div className={`${colors.background.card} rounded-xl shadow-sm p-12 text-center`}>
          <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
          <p className={`text-lg font-medium ${colors.text.primary}`}>Nessun materiale disponibile</p>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Non ci sono materiali didattici assegnati al tuo profilo al momento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Render by category */}
          {categories?.map((category) => {
            const catMaterials = groupedMaterials?.[category.id];
            if (!catMaterials?.length) return null;

            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id} className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${colors.text.primary}`}>{category.name}</p>
                      {category.description && (
                        <p className={`text-sm ${colors.text.muted}`}>{category.description}</p>
                      )}
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${colors.background.secondary} ${colors.text.muted}`}>
                      {catMaterials.length}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                      {catMaterials.map((material: Material) => (
                        <MaterialCard
                          key={material.id}
                          material={material}
                          onView={handleView}
                          onDownload={handleDownload}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized */}
          {groupedMaterials?.uncategorized?.length > 0 && (
            <div className={`${colors.background.card} rounded-xl shadow-sm overflow-hidden`}>
              <button
                onClick={() => toggleCategory('uncategorized')}
                className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
              >
                <div className="flex items-center gap-3">
                  {expandedCategories.has('uncategorized') ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className={`font-medium ${colors.text.primary}`}>Altro</p>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${colors.background.secondary} ${colors.text.muted}`}>
                    {groupedMaterials.uncategorized.length}
                  </span>
                </div>
              </button>

              {expandedCategories.has('uncategorized') && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                    {groupedMaterials.uncategorized.map((material: Material) => (
                      <MaterialCard
                        key={material.id}
                        material={material}
                        onView={handleView}
                        onDownload={handleDownload}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View Modal for PDF/Video */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`${colors.background.card} rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {viewingMaterial.type === 'PDF' ? (
                  <FileText className="w-6 h-6 text-red-600" />
                ) : viewingMaterial.type === 'VIDEO' ? (
                  <Video className="w-6 h-6 text-blue-600" />
                ) : (
                  <File className="w-6 h-6 text-gray-600" />
                )}
                <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                  {viewingMaterial.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewingMaterial)}
                  className={`px-4 py-2 rounded-lg ${colors.primary.bg} text-white font-medium flex items-center gap-2 hover:opacity-90`}
                >
                  <Download className="w-4 h-4" />
                  Scarica
                </button>
                <button
                  onClick={() => setViewingMaterial(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
              {viewingMaterial.type === 'PDF' && (
                <iframe
                  src={`${viewingMaterial.fileUrl}#view=FitH`}
                  className="w-full h-full min-h-[70vh]"
                  title={viewingMaterial.title}
                />
              )}
              {viewingMaterial.type === 'VIDEO' && (
                <video
                  src={viewingMaterial.fileUrl}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[70vh] object-contain"
                >
                  Il tuo browser non supporta la riproduzione video.
                </video>
              )}
              {viewingMaterial.type === 'DOCUMENT' && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <File className="w-16 h-16 text-gray-400" />
                  <p className={colors.text.secondary}>Questo documento non può essere visualizzato direttamente.</p>
                  <button
                    onClick={() => handleDownload(viewingMaterial)}
                    className={`px-6 py-3 ${colors.primary.bg} text-white rounded-xl font-medium flex items-center gap-2`}
                  >
                    <Download className="w-5 h-5" />
                    Scarica il documento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Material Card Component
function MaterialCard({
  material,
  onView,
  onDownload,
}: {
  material: Material;
  onView: (m: Material) => void;
  onDownload: (m: Material) => void;
}) {
  const TypeIcon = typeIcons[material.type as MaterialType] || File;

  const getTypeColor = (type: MaterialType) => {
    switch (type) {
      case 'PDF': return 'bg-red-100 dark:bg-red-900/30';
      case 'VIDEO': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'LINK': return 'bg-purple-100 dark:bg-purple-900/30';
      case 'DOCUMENT': return 'bg-amber-100 dark:bg-amber-900/30';
    }
  };

  const getIconColor = (type: MaterialType) => {
    switch (type) {
      case 'PDF': return 'text-red-600';
      case 'VIDEO': return 'text-blue-600';
      case 'LINK': return 'text-purple-600';
      case 'DOCUMENT': return 'text-amber-600';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${colors.border.primary} hover:shadow-md transition-all hover:-translate-y-0.5 ${colors.background.card}`}>
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl ${getTypeColor(material.type)} flex items-center justify-center flex-shrink-0`}>
          <TypeIcon className={`w-6 h-6 ${getIconColor(material.type)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${colors.text.primary} line-clamp-2`}>{material.title}</h3>
          {material.description && (
            <p className={`text-sm ${colors.text.muted} mt-1 line-clamp-2`}>{material.description}</p>
          )}
          <div className={`flex items-center gap-3 mt-2 text-xs ${colors.text.muted}`}>
            <span className={`px-2 py-0.5 rounded-full ${getTypeColor(material.type)} ${getIconColor(material.type)}`}>
              {typeLabels[material.type as MaterialType]}
            </span>
            {material.subject && (
              <span 
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: material.subject.color ? `${material.subject.color}20` : '#e5e7eb',
                  color: material.subject.color || '#6b7280'
                }}
              >
                {material.subject.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onView(material)}
          className={`flex-1 py-2 px-3 rounded-lg ${colors.background.secondary} hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 ${colors.text.primary} text-sm font-medium`}
        >
          {material.type === 'VIDEO' ? (
            <>
              <Play className="w-4 h-4" />
              Guarda
            </>
          ) : material.type === 'LINK' ? (
            <>
              <ExternalLink className="w-4 h-4" />
              Apri
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Visualizza
            </>
          )}
        </button>
        {material.type !== 'LINK' && material.fileUrl && (
          <button
            onClick={() => onDownload(material)}
            className={`py-2 px-3 rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium`}
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
