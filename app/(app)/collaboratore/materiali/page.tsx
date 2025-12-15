/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import { GroupInfoModal } from '@/components/ui/GroupInfoModal';
import { 
  FolderOpen, 
  Plus, 
  Edit2, 
  Trash2,
  FileText,
  Video,
  Link as LinkIcon,
  File,
  Upload,
  Save,
  X,
  Eye,
  Users,
  User,
  Download,
  Search,
  Check,
  Globe,
  UserCheck,
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react';
import { firebaseStorage } from '@/lib/firebase/storage';

// ==================== TYPES ====================

type MaterialType = 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';
type MaterialVisibility = 'ALL_STUDENTS' | 'GROUP_BASED' | 'SELECTED_STUDENTS';

// ==================== CONSTANTS ====================

const typeIcons: Record<MaterialType, typeof FileText> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: LinkIcon,
  DOCUMENT: File,
};

const typeLabels: Record<MaterialType, string> = {
  PDF: 'PDF',
  VIDEO: 'Video',
  LINK: 'Link Esterno',
  DOCUMENT: 'Documento',
};

const visibilityIcons: Record<MaterialVisibility, typeof Globe> = {
  ALL_STUDENTS: Globe,
  GROUP_BASED: Users,
  SELECTED_STUDENTS: UserCheck,
};

const visibilityLabels: Record<MaterialVisibility, string> = {
  ALL_STUDENTS: 'Tutti gli studenti',
  GROUP_BASED: 'Per gruppo',
  SELECTED_STUDENTS: 'Studenti selezionati',
};

// ==================== MAIN COMPONENT ====================

export default function CollaboratorMaterialsPage() {
  // Material management
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningMaterialId, setAssigningMaterialId] = useState<string | null>(null);
  
  // Group info modal
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<MaterialType | ''>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [materialFormData, setMaterialFormData] = useState({
    title: '',
    description: '',
    type: 'PDF' as MaterialType,
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    externalUrl: '',
    subjectId: '',
    tags: [] as string[],
  });

  // Assignment state
  const [assignmentData, setAssignmentData] = useState({
    visibility: 'ALL_STUDENTS' as MaterialVisibility,
    groupIds: [] as string[],
    studentIds: [] as string[],
  });

  // Portal mounting state
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const { handleMutationError } = useApiError();
  const { showSuccess, showError } = useToast();
  const utils = trpc.useUtils();

  // ==================== QUERIES ====================
  
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();
  const { data: materials, isLoading: materialsLoading } = trpc.materials.getAll.useQuery({
    type: filterType || undefined,
    subjectId: filterSubject || undefined,
  });
  
  // Get collaborator's groups (only groups they manage)
  const { data: myGroups } = trpc.groups.getMyGroups.useQuery();
  
  // Get students from my groups
  const { data: myStudents } = trpc.students.getFromMyGroups.useQuery();

  // ==================== MUTATIONS ====================

  const createMaterialMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      showSuccess('Materiale creato', 'Il nuovo materiale è stato aggiunto.');
      resetMaterialForm();
    },
    onError: handleMutationError,
  });

  const updateMaterialMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      showSuccess('Materiale aggiornato', 'Le modifiche sono state salvate.');
      resetMaterialForm();
    },
    onError: handleMutationError,
  });

  const deleteMaterialMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      showSuccess('Materiale eliminato', 'Il materiale è stato rimosso.');
    },
    onError: handleMutationError,
  });

  const updateAssignmentsMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      showSuccess('Destinatari aggiornati', 'Le assegnazioni sono state salvate.');
      setShowAssignModal(false);
      setAssigningMaterialId(null);
    },
    onError: handleMutationError,
  });

  // ==================== HANDLERS ====================

  const resetMaterialForm = () => {
    setMaterialFormData({
      title: '',
      description: '',
      type: 'PDF',
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      externalUrl: '',
      subjectId: '',
      tags: [],
    });
    setShowMaterialForm(false);
    setEditingMaterialId(null);
  };

  const handleEditMaterial = (material: any) => {
    setMaterialFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      fileUrl: material.fileUrl || '',
      fileName: material.fileName || '',
      fileSize: material.fileSize || 0,
      externalUrl: material.externalUrl || '',
      subjectId: material.subjectId || '',
      tags: material.tags || [],
    });
    setEditingMaterialId(material.id);
    setShowMaterialForm(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const { url } = await firebaseStorage.uploadMaterialFile(
        file,
        materialFormData.type.toLowerCase(),
        (progress) => setUploadProgress(progress)
      );

      setMaterialFormData((prev) => ({
        ...prev,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
      }));
      showSuccess('File caricato', 'Il file è stato caricato con successo.');
    } catch {
      showError('Errore caricamento', 'Si è verificato un errore durante il caricamento.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title: materialFormData.title,
      description: materialFormData.description || undefined,
      type: materialFormData.type,
      fileUrl: materialFormData.fileUrl || undefined,
      fileName: materialFormData.fileName || undefined,
      fileSize: materialFormData.fileSize || undefined,
      externalUrl: materialFormData.externalUrl || undefined,
      subjectId: materialFormData.subjectId || undefined,
      tags: materialFormData.tags,
      visibility: 'ALL_STUDENTS' as const,
    };

    if (editingMaterialId) {
      updateMaterialMutation.mutate({ id: editingMaterialId, ...data });
    } else {
      createMaterialMutation.mutate(data);
    }
  };

  const openAssignModal = (materialId: string, material: any) => {
    setAssigningMaterialId(materialId);
    // Only show groups that collaborator manages
    const myGroupIds = myGroups?.map(g => g.id) || [];
    const materialGroupIds = material.groupAccess?.map((ga: any) => ga.groupId) || [];
    const relevantGroupIds = materialGroupIds.filter((id: string) => myGroupIds.includes(id));
    
    setAssignmentData({
      visibility: material.visibility || 'ALL_STUDENTS',
      groupIds: relevantGroupIds,
      studentIds: material.studentAccess?.map((sa: any) => sa.studentId) || [],
    });
    setShowAssignModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter materials
  const filteredMaterials = materials?.filter((m) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary} flex items-center gap-3`}>
            <FolderOpen className="w-7 h-7 text-teal-600" />
            Materiali Didattici
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Gestisci e assegna materiali ai tuoi gruppi
          </p>
        </div>
        <button
          onClick={() => setShowMaterialForm(true)}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuovo Materiale
        </button>
      </div>

      {/* Main Content */}
      <div className={`${colors.background.card} rounded-xl shadow-sm p-6`}>
        {/* Material Form */}
        {showMaterialForm && (
          <div className={`mb-6 p-6 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
            <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
              {editingMaterialId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingMaterialId ? 'Modifica Materiale' : 'Nuovo Materiale'}
            </h3>

            <form onSubmit={handleMaterialSubmit} className="space-y-6">
              {/* Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Titolo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={materialFormData.title}
                    onChange={(e) => setMaterialFormData({ ...materialFormData, title: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="Es: Introduzione alla Biologia Cellulare"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={materialFormData.type}
                    onChange={(value) => setMaterialFormData({ ...materialFormData, type: value as MaterialType })}
                    options={Object.entries(typeLabels).map(([key, label]) => ({ value: key, label }))}
                    placeholder="Seleziona tipo"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Descrizione
                </label>
                <textarea
                  value={materialFormData.description}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, description: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                  placeholder="Descrivi brevemente il contenuto..."
                />
              </div>

              {/* File Upload / URL */}
              {(materialFormData.type === 'PDF' || materialFormData.type === 'VIDEO' || materialFormData.type === 'DOCUMENT') && (
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Carica File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept={materialFormData.type === 'PDF' ? '.pdf' : materialFormData.type === 'VIDEO' ? 'video/*' : '*'}
                    className="hidden"
                  />
                  {materialFormData.fileUrl ? (
                    <div className={`flex items-center gap-3 p-4 rounded-lg border ${colors.border.primary} ${colors.background.input}`}>
                      <FileText className="w-8 h-8 text-red-600" />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${colors.text.primary} truncate`}>{materialFormData.fileName}</p>
                        <p className={`text-sm ${colors.text.muted}`}>{formatFileSize(materialFormData.fileSize)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMaterialFormData({ ...materialFormData, fileUrl: '', fileName: '', fileSize: 0 })}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`w-full p-6 border-2 border-dashed ${colors.border.primary} rounded-xl hover:border-teal-400 transition-colors flex flex-col items-center gap-2 ${colors.text.muted}`}
                    >
                      {uploading ? (
                        <>
                          <Spinner size="lg" />
                          <span>Caricamento... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8" />
                          <span>Clicca per caricare un file</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {materialFormData.type === 'LINK' && (
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    URL Esterno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={materialFormData.externalUrl}
                    onChange={(e) => setMaterialFormData({ ...materialFormData, externalUrl: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
                    placeholder="https://example.com/video"
                    required={materialFormData.type === 'LINK'}
                  />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                  Materia
                </label>
                <CustomSelect
                  value={materialFormData.subjectId}
                  onChange={(value) => setMaterialFormData({ ...materialFormData, subjectId: value })}
                  options={[
                    { value: '', label: 'Nessuna materia' },
                    ...(subjects?.map((s) => ({ value: s.id, label: s.name })) || [])
                  ]}
                  placeholder="Seleziona materia..."
                  searchable
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={resetMaterialForm}
                  className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={createMaterialMutation.isPending || updateMaterialMutation.isPending}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {(createMaterialMutation.isPending || updateMaterialMutation.isPending) ? (
                    <>
                      <Spinner size="xs" variant="white" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingMaterialId ? 'Salva Modifiche' : 'Carica Materiale'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca materiali..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
            />
          </div>
          <div className="w-full sm:w-40">
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
          <div className="w-full sm:w-48">
            <CustomSelect
              value={filterSubject}
              onChange={setFilterSubject}
              options={[
                { value: '', label: 'Tutte le materie' },
                ...(subjects?.map((s) => ({ value: s.id, label: s.name })) || [])
              ]}
              placeholder="Tutte le materie"
              searchable
            />
          </div>
        </div>

        {/* Materials List */}
        {materialsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : !filteredMaterials?.length ? (
          <div className="text-center py-12">
            <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
            <p className={`text-lg font-medium ${colors.text.primary}`}>Nessun materiale</p>
            <p className={`mt-1 ${colors.text.secondary}`}>Clicca su &quot;Nuovo Materiale&quot; per iniziare</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMaterials.map((material: any) => {
              const TypeIcon = typeIcons[material.type as MaterialType] || File;
              const VisIcon = visibilityIcons[material.visibility as MaterialVisibility] || Globe;
              const groups = material.groupAccess?.map((ga: any) => ga.group).filter(Boolean) || [];
              const hasAssignments = groups.length > 0 || material.studentAccess?.length > 0;

              return (
                <div
                  key={material.id}
                  className={`p-4 rounded-xl border ${colors.border.primary} hover:shadow-md transition-all ${colors.background.card}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      material.type === 'PDF' ? 'bg-red-100 dark:bg-red-900/30' :
                      material.type === 'VIDEO' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      material.type === 'LINK' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <TypeIcon className={`w-6 h-6 ${
                        material.type === 'PDF' ? 'text-red-600' :
                        material.type === 'VIDEO' ? 'text-blue-600' :
                        material.type === 'LINK' ? 'text-purple-600' :
                        'text-gray-600'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${colors.text.primary}`}>{material.title}</p>
                      {material.description && (
                        <p className={`text-sm ${colors.text.muted} mt-1 line-clamp-1`}>{material.description}</p>
                      )}
                      <div className={`flex items-center flex-wrap gap-2 text-sm ${colors.text.muted} mt-2`}>
                        {material.subject && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: material.subject.color ? `${material.subject.color}20` : '#e5e7eb',
                              color: material.subject.color || '#6b7280'
                            }}
                          >
                            {material.subject.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs">
                          <VisIcon className="w-3.5 h-3.5" />
                          {visibilityLabels[material.visibility as MaterialVisibility]}
                        </span>
                        {!hasAssignments && material.visibility !== 'ALL_STUDENTS' && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Nessun assegnatario
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs ml-auto">
                          <Eye className="w-3.5 h-3.5" />
                          {material.viewCount}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Download className="w-3.5 h-3.5" />
                          {material.downloadCount}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openAssignModal(material.id, material)}
                        className="p-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg"
                        title="Assegna ai miei gruppi"
                      >
                        <Users className="w-4 h-4 text-teal-600" />
                      </button>
                      {(material.fileUrl || material.externalUrl) && (
                        <a
                          href={material.fileUrl || material.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Apri"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </a>
                      )}
                      <button
                        onClick={() => handleEditMaterial(material)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Modifica"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Sei sicuro di voler eliminare questo materiale?')) {
                            deleteMaterialMutation.mutate({ id: material.id });
                          }
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Modal - Only shows collaborator's groups - Using Portal */}
      {showAssignModal && assigningMaterialId && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className={`${colors.background.card} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-xl font-semibold ${colors.text.primary} flex items-center gap-2`}>
                <Users className="w-5 h-5 text-teal-600" />
                Assegna ai Miei Gruppi e Studenti
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningMaterialId(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Info */}
              <div className={`p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800`}>
                <p className="text-sm text-teal-700 dark:text-teal-300">
                  Puoi selezionare uno o più gruppi e aggiungere singoli studenti dei tuoi gruppi.
                </p>
              </div>

              {/* My Groups */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2 flex items-center gap-2`}>
                  <Users className="w-4 h-4 text-teal-600" />
                  I Miei Gruppi
                  {assignmentData.groupIds.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-full">
                      {assignmentData.groupIds.length} selezionati
                    </span>
                  )}
                </label>
                <div className={`rounded-xl border ${colors.border.primary} max-h-48 overflow-y-auto`}>
                  {myGroups?.length ? myGroups.map((group) => {
                    const isChecked = assignmentData.groupIds.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                          isChecked ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isChecked ? 'bg-teal-600 border-teal-600' : colors.border.primary
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignmentData({ ...assignmentData, groupIds: [...assignmentData.groupIds, group.id] });
                            } else {
                              setAssignmentData({ ...assignmentData, groupIds: assignmentData.groupIds.filter(id => id !== group.id) });
                            }
                          }}
                          className="sr-only"
                        />
                        {group.color && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                        )}
                        <span className={`font-medium ${colors.text.primary} flex-1`}>{group.name}</span>
                        <span className={`text-xs ${colors.text.muted}`}>{group.memberCount} membri</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedGroupInfo(group.id);
                          }}
                          className="p-1 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                          title="Vedi membri del gruppo"
                        >
                          <Info className="w-4 h-4 text-teal-500" />
                        </button>
                      </label>
                    );
                  }) : (
                    <div className="px-4 py-6 text-center">
                      <p className={`text-sm ${colors.text.muted}`}>Non gestisci nessun gruppo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* My Students */}
              <div>
                <label className={`block text-sm font-medium ${colors.text.primary} mb-2 flex items-center gap-2`}>
                  <User className="w-4 h-4 text-teal-600" />
                  Aggiungi Studenti Singoli
                  {assignmentData.studentIds.length > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-full">
                      {assignmentData.studentIds.length} selezionati
                    </span>
                  )}
                </label>
                <p className={`text-xs ${colors.text.muted} mb-2`}>
                  Seleziona studenti aggiuntivi che non fanno parte dei gruppi selezionati
                </p>
                <div className={`rounded-xl border ${colors.border.primary} max-h-48 overflow-y-auto`}>
                  {myStudents && myStudents.length > 0 ? myStudents.map((student: any) => {
                    const isChecked = assignmentData.studentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                          isChecked ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isChecked ? 'bg-teal-600 border-teal-600' : colors.border.primary
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignmentData({ ...assignmentData, studentIds: [...assignmentData.studentIds, student.id] });
                            } else {
                              setAssignmentData({ ...assignmentData, studentIds: assignmentData.studentIds.filter((id: string) => id !== student.id) });
                            }
                          }}
                          className="sr-only"
                        />
                        <User className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${colors.text.primary} truncate`}>{student.user?.name || student.name}</p>
                          {student.user?.email && (
                            <p className={`text-xs ${colors.text.muted} truncate`}>{student.user.email}</p>
                          )}
                        </div>
                      </label>
                    );
                  }) : (
                    <div className="px-4 py-6 text-center">
                      <p className={`text-sm ${colors.text.muted}`}>Nessuno studente disponibile</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningMaterialId(null);
                }}
                className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-50 dark:hover:bg-gray-700`}
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  // Determine visibility based on selections
                  let visibility: MaterialVisibility = 'ALL_STUDENTS';
                  if (assignmentData.groupIds.length > 0 && assignmentData.studentIds.length > 0) {
                    visibility = 'SELECTED_STUDENTS';
                  } else if (assignmentData.groupIds.length > 0) {
                    visibility = 'GROUP_BASED';
                  } else if (assignmentData.studentIds.length > 0) {
                    visibility = 'SELECTED_STUDENTS';
                  }
                  
                  updateAssignmentsMutation.mutate({
                    id: assigningMaterialId,
                    visibility,
                    groupIds: assignmentData.groupIds,
                    studentIds: assignmentData.studentIds,
                  });
                }}
                disabled={updateAssignmentsMutation.isPending}
                className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {updateAssignmentsMutation.isPending ? (
                  <>
                    <Spinner size="xs" variant="white" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salva Assegnazioni
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Group Info Modal */}
      {selectedGroupInfo && (
        <GroupInfoModal
          groupId={selectedGroupInfo}
          isOpen={true}
          onClose={() => setSelectedGroupInfo(null)}
        />
      )}
    </div>
  );
}
