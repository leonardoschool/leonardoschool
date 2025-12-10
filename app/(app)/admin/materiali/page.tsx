'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import CustomSelect from '@/components/ui/CustomSelect';
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
  BookOpen,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Globe,
  UserCheck,
  Settings,
  ExternalLink,
  Palette,
  GripVertical,
  FolderPlus,
} from 'lucide-react';
import { firebaseStorage } from '@/lib/firebase/storage';

type MaterialType = 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';
type MaterialVisibility = 'ALL_STUDENTS' | 'COURSE_BASED' | 'SELECTED_STUDENTS';

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
  COURSE_BASED: BookOpen,
  SELECTED_STUDENTS: UserCheck,
};

const visibilityLabels: Record<MaterialVisibility, string> = {
  ALL_STUDENTS: 'Tutti gli studenti',
  COURSE_BASED: 'Per corso',
  SELECTED_STUDENTS: 'Studenti selezionati',
};

export default function MaterialsPage() {
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'materials' | 'categories' | 'subjects'>('materials');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterType, setFilterType] = useState<MaterialType | ''>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'PDF' as MaterialType,
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    externalUrl: '',
    thumbnailUrl: '',
    visibility: 'ALL_STUDENTS' as MaterialVisibility,
    categoryId: '',
    subjectId: '',
    tags: [] as string[],
    courseIds: [] as string[],
    studentIds: [] as string[],
  });

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '',
    order: 0,
  });

  // Subject form state
  const [subjectFormData, setSubjectFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#6366f1',
    icon: '',
    order: 0,
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: materials, isLoading } = trpc.materials.getAll.useQuery({
    type: filterType || undefined,
    categoryId: filterCategory || undefined,
  });
  const { data: categories } = trpc.materials.getAllCategories.useQuery();
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();
  const { data: templates } = trpc.contracts.getTemplates.useQuery();
  const { data: allStudents } = trpc.students.getAllForAdmin.useQuery();
  const { data: stats } = trpc.materials.getStats.useQuery();

  // Mutations
  const createMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getStats.invalidate();
      setSuccessMessage('Materiale caricato con successo!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
    },
  });

  const updateMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      setSuccessMessage('Materiale aggiornato con successo!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
    },
  });

  const deleteMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getStats.invalidate();
      setSuccessMessage('Materiale eliminato!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  const createCategoryMutation = trpc.materials.createCategory.useMutation({
    onSuccess: () => {
      utils.materials.getAllCategories.invalidate();
      utils.materials.getCategories.invalidate();
      setSuccessMessage('Categoria creata!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = trpc.materials.updateCategory.useMutation({
    onSuccess: () => {
      utils.materials.getAllCategories.invalidate();
      utils.materials.getCategories.invalidate();
      setSuccessMessage('Categoria aggiornata!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = trpc.materials.deleteCategory.useMutation({
    onSuccess: () => {
      utils.materials.getAllCategories.invalidate();
      utils.materials.getCategories.invalidate();
      setSuccessMessage('Categoria eliminata!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  // Subject mutations
  const createSubjectMutation = trpc.materials.createSubject.useMutation({
    onSuccess: () => {
      utils.materials.getAllSubjects.invalidate();
      utils.materials.getSubjects.invalidate();
      setSuccessMessage('Materia creata!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetSubjectForm();
    },
  });

  const updateSubjectMutation = trpc.materials.updateSubject.useMutation({
    onSuccess: () => {
      utils.materials.getAllSubjects.invalidate();
      utils.materials.getSubjects.invalidate();
      setSuccessMessage('Materia aggiornata!');
      setTimeout(() => setSuccessMessage(''), 3000);
      resetSubjectForm();
    },
  });

  const deleteSubjectMutation = trpc.materials.deleteSubject.useMutation({
    onSuccess: () => {
      utils.materials.getAllSubjects.invalidate();
      utils.materials.getSubjects.invalidate();
      setSuccessMessage('Materia eliminata!');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'PDF',
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      externalUrl: '',
      thumbnailUrl: '',
      visibility: 'ALL_STUDENTS',
      categoryId: '',
      subjectId: '',
      tags: [],
      courseIds: [],
      studentIds: [],
    });
    setShowForm(false);
    setEditingId(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      icon: '',
      order: 0,
    });
    setShowCategoryForm(false);
    setEditingCategoryId(null);
  };

  const resetSubjectForm = () => {
    setSubjectFormData({
      name: '',
      code: '',
      description: '',
      color: '#6366f1',
      icon: '',
      order: 0,
    });
    setShowSubjectForm(false);
    setEditingSubjectId(null);
  };

  const handleEdit = (material: any) => {
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      fileUrl: material.fileUrl || '',
      fileName: material.fileName || '',
      fileSize: material.fileSize || 0,
      externalUrl: material.externalUrl || '',
      thumbnailUrl: material.thumbnailUrl || '',
      visibility: material.visibility,
      categoryId: material.categoryId || '',
      subjectId: material.subjectId || '',
      tags: material.tags || [],
      courseIds: material.courseAccess?.map((ca: any) => ca.templateId) || [],
      studentIds: material.studentAccess?.map((sa: any) => sa.studentId) || [],
    });
    setEditingId(material.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditCategory = (category: any) => {
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      order: category.order || 0,
    });
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Firebase Storage
      const { url, path } = await firebaseStorage.uploadMaterialFile(
        file,
        formData.type.toLowerCase(),
        (progress) => setUploadProgress(progress)
      );

      setFormData((prev) => ({
        ...prev,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
      }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Errore durante il caricamento del file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title: formData.title,
      description: formData.description || undefined,
      type: formData.type,
      fileUrl: formData.fileUrl || undefined,
      fileName: formData.fileName || undefined,
      fileSize: formData.fileSize || undefined,
      externalUrl: formData.externalUrl || undefined,
      thumbnailUrl: formData.thumbnailUrl || undefined,
      visibility: formData.visibility,
      categoryId: formData.categoryId || undefined,
      subjectId: formData.subjectId || undefined,
      tags: formData.tags,
      courseIds: formData.visibility === 'COURSE_BASED' ? formData.courseIds : undefined,
      studentIds: formData.visibility === 'SELECTED_STUDENTS' ? formData.studentIds : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategoryId) {
      updateCategoryMutation.mutate({
        id: editingCategoryId,
        ...categoryFormData,
      });
    } else {
      createCategoryMutation.mutate(categoryFormData);
    }
  };

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSubjectId) {
      updateSubjectMutation.mutate({
        id: editingSubjectId,
        ...subjectFormData,
      });
    } else {
      createSubjectMutation.mutate(subjectFormData);
    }
  };

  const handleEditSubject = (subject: any) => {
    setSubjectFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      color: subject.color || '#6366f1',
      icon: subject.icon || '',
      order: subject.order || 0,
    });
    setEditingSubjectId(subject.id);
    setShowSubjectForm(true);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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
        m.description?.toLowerCase().includes(query) ||
        m.tags?.some((t: string) => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Group materials by category
  const groupedMaterials = filteredMaterials?.reduce((acc, material) => {
    const catId = material.categoryId || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(material);
    return acc;
  }, {} as Record<string, typeof filteredMaterials>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary} flex items-center gap-3`}>
            <FolderOpen className="w-7 h-7 text-teal-600" />
            Materiale Didattico
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Gestisci PDF, video e risorse per gli studenti
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('materials');
              setShowForm(true);
            }}
            className={`px-4 py-2.5 ${colors.primary.bg} text-white rounded-xl hover:opacity-90 transition-opacity font-medium flex items-center gap-2`}
          >
            <Plus className="w-5 h-5" />
            Nuovo Materiale
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={`${colors.status.success.softBg} border ${colors.status.success.border} rounded-xl p-4 flex items-center gap-3`}>
          <Check className={`w-5 h-5 ${colors.status.success.text}`} />
          <span className={colors.status.success.text}>{successMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.totalMaterials}</p>
                <p className={`text-sm ${colors.text.muted}`}>Totale</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType?.PDF || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>PDF</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType?.VIDEO || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Video</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.byType?.LINK || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Link</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`${colors.background.card} rounded-xl shadow-sm`}>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'materials'
                ? 'border-red-600 text-red-600'
                : `border-transparent ${colors.text.muted} hover:text-gray-700 dark:hover:text-gray-300`
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Materiali
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-red-600 text-red-600'
                : `border-transparent ${colors.text.muted} hover:text-gray-700 dark:hover:text-gray-300`
            }`}
          >
            <Settings className="w-4 h-4" />
            Categorie
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'subjects'
                ? 'border-red-600 text-red-600'
                : `border-transparent ${colors.text.muted} hover:text-gray-700 dark:hover:text-gray-300`
            }`}
          >
            <Palette className="w-4 h-4" />
            Materie
          </button>
        </div>

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="p-6">
            {/* Material Form */}
            {showForm && (
              <div className={`mb-6 p-6 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                  {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingId ? 'Modifica Materiale' : 'Nuovo Materiale'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Titolo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                        placeholder="Es: Introduzione alla Biologia Cellulare"
                        required
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Tipo <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as MaterialType })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      >
                        {Object.entries(typeLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                      Descrizione
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      placeholder="Descrivi brevemente il contenuto..."
                    />
                  </div>

                  {/* File Upload / URL */}
                  {(formData.type === 'PDF' || formData.type === 'VIDEO' || formData.type === 'DOCUMENT') && (
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Carica File
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        accept={formData.type === 'PDF' ? '.pdf' : formData.type === 'VIDEO' ? 'video/*' : '*'}
                        className="hidden"
                      />
                      {formData.fileUrl ? (
                        <div className={`flex items-center gap-3 p-4 rounded-lg border ${colors.border.primary} ${colors.background.input}`}>
                          <FileText className="w-8 h-8 text-red-600" />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${colors.text.primary} truncate`}>{formData.fileName}</p>
                            <p className={`text-sm ${colors.text.muted}`}>{formatFileSize(formData.fileSize)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, fileUrl: '', fileName: '', fileSize: 0 })}
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
                          className={`w-full p-6 border-2 border-dashed ${colors.border.primary} rounded-xl hover:border-red-400 transition-colors flex flex-col items-center gap-2 ${colors.text.muted}`}
                        >
                          {uploading ? (
                            <>
                              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              <span>Caricamento... {uploadProgress}%</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8" />
                              <span>Clicca per caricare un file</span>
                              <span className="text-sm">
                                {formData.type === 'PDF' ? 'Solo file PDF' : formData.type === 'VIDEO' ? 'File video (MP4, WebM, etc.)' : 'Qualsiasi file'}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {formData.type === 'LINK' && (
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        URL Esterno <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={formData.externalUrl}
                        onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                        placeholder="https://example.com/video"
                        required={formData.type === 'LINK'}
                      />
                    </div>
                  )}

                  {/* Category & Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Categoria
                      </label>
                      <CustomSelect
                        value={formData.categoryId}
                        onChange={(value) => setFormData({ ...formData, categoryId: value })}
                        options={[
                          { value: '', label: 'Nessuna categoria' },
                          ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || [])
                        ]}
                        placeholder="Seleziona categoria..."
                        searchable
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Materia
                      </label>
                      <CustomSelect
                        value={formData.subjectId}
                        onChange={(value) => setFormData({ ...formData, subjectId: value })}
                        options={[
                          { value: '', label: 'Nessuna materia' },
                          ...(subjects?.map((s) => ({ value: s.id, label: s.name })) || [])
                        ]}
                        placeholder="Seleziona materia..."
                        searchable
                      />
                    </div>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                      Visibilità <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(visibilityLabels).map(([key, label]) => {
                        const Icon = visibilityIcons[key as MaterialVisibility];
                        const isSelected = formData.visibility === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData({ ...formData, visibility: key as MaterialVisibility })}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                              isSelected
                                ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                                : `${colors.border.primary} hover:border-gray-300 dark:hover:border-gray-600`
                            }`}
                          >
                            <Icon className={`w-6 h-6 ${isSelected ? 'text-red-600' : colors.text.muted}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-red-600' : colors.text.secondary}`}>
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Course Selection */}
                  {formData.visibility === 'COURSE_BASED' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`block text-sm font-medium ${colors.text.primary}`}>
                          Seleziona Corsi
                          {formData.courseIds.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                              {formData.courseIds.length} selezionati
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, courseIds: [] })}
                          className={`text-xs ${colors.text.muted} hover:text-red-600 transition-colors`}
                        >
                          Deseleziona tutti
                        </button>
                      </div>
                      <div className={`rounded-xl border ${colors.border.primary} ${colors.background.secondary} overflow-hidden`}>
                        {/* Search */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.muted}`} />
                            <input
                              type="text"
                              value={courseSearch}
                              onChange={(e) => setCourseSearch(e.target.value)}
                              placeholder="Cerca corso..."
                              className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                            />
                          </div>
                        </div>
                        {/* List */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                          {templates
                            ?.filter((t) => t.name.toLowerCase().includes(courseSearch.toLowerCase()))
                            .map((template) => {
                              const isChecked = formData.courseIds.includes(template.id);
                              return (
                                <label
                                  key={template.id}
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                    isChecked 
                                      ? 'bg-red-50 dark:bg-red-900/20' 
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isChecked 
                                      ? 'bg-red-600 border-red-600' 
                                      : `${colors.border.primary} bg-transparent`
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({ ...formData, courseIds: [...formData.courseIds, template.id] });
                                      } else {
                                        setFormData({ ...formData, courseIds: formData.courseIds.filter((id) => id !== template.id) });
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${colors.text.primary}`}>{template.name}</p>
                                  </div>
                                  <BookOpen className={`w-4 h-4 ${isChecked ? 'text-red-600' : colors.text.muted}`} />
                                </label>
                              );
                            })}
                          {templates?.filter((t) => t.name.toLowerCase().includes(courseSearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-6 text-center">
                              <p className={`text-sm ${colors.text.muted}`}>Nessun corso trovato</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Student Selection */}
                  {formData.visibility === 'SELECTED_STUDENTS' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`block text-sm font-medium ${colors.text.primary}`}>
                          Seleziona Studenti
                          {formData.studentIds.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                              {formData.studentIds.length} selezionati
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, studentIds: [] })}
                          className={`text-xs ${colors.text.muted} hover:text-red-600 transition-colors`}
                        >
                          Deseleziona tutti
                        </button>
                      </div>
                      <div className={`rounded-xl border ${colors.border.primary} ${colors.background.secondary} overflow-hidden`}>
                        {/* Search */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.muted}`} />
                            <input
                              type="text"
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              placeholder="Cerca studente per nome o email..."
                              className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                            />
                          </div>
                        </div>
                        {/* List */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                          {allStudents
                            ?.filter((s) => 
                              s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              s.email.toLowerCase().includes(studentSearch.toLowerCase())
                            )
                            .map((student) => {
                              const studentId = student.student?.id;
                              const isChecked = studentId ? formData.studentIds.includes(studentId) : false;
                              const isDisabled = !studentId;
                              return (
                                <label
                                  key={student.id}
                                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                    isDisabled 
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : isChecked 
                                        ? 'bg-red-50 dark:bg-red-900/20 cursor-pointer' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isDisabled
                                      ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                      : isChecked 
                                        ? 'bg-red-600 border-red-600' 
                                        : `${colors.border.primary} bg-transparent`
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={(e) => {
                                      if (!studentId) return;
                                      if (e.target.checked) {
                                        setFormData({ ...formData, studentIds: [...formData.studentIds, studentId] });
                                      } else {
                                        setFormData({ ...formData, studentIds: formData.studentIds.filter((id) => id !== studentId) });
                                      }
                                    }}
                                    className="sr-only"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${colors.text.primary} truncate`}>{student.name}</p>
                                    <p className={`text-xs ${colors.text.muted} truncate`}>{student.email}</p>
                                  </div>
                                  <Users className={`w-4 h-4 flex-shrink-0 ${isChecked ? 'text-red-600' : colors.text.muted}`} />
                                </label>
                              );
                            })}
                          {allStudents?.filter((s) => 
                            s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            s.email.toLowerCase().includes(studentSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-6 text-center">
                              <p className={`text-sm ${colors.text.muted}`}>Nessuno studente trovato</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={resetForm}
                      className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-50 dark:hover:bg-gray-700`}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className={`px-6 py-2.5 ${colors.primary.bg} text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2 disabled:opacity-50`}
                    >
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {editingId ? 'Salva Modifiche' : 'Carica Materiale'}
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
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                />
              </div>
              <div className="w-full sm:w-48">
                <CustomSelect
                  value={filterType}
                  onChange={(value) => setFilterType(value as MaterialType | '')}
                  options={[
                    { value: '', label: 'Tutti i tipi' },
                    ...Object.entries(typeLabels).map(([key, label]) => ({ value: key, label }))
                  ]}
                  placeholder="Tutti i tipi"
                  size="md"
                />
              </div>
              <div className="w-full sm:w-52">
                <CustomSelect
                  value={filterCategory}
                  onChange={setFilterCategory}
                  options={[
                    { value: '', label: 'Tutte le categorie' },
                    ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || [])
                  ]}
                  placeholder="Tutte le categorie"
                  searchable
                  size="md"
                />
              </div>
            </div>

            {/* Materials List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !filteredMaterials?.length ? (
              <div className="text-center py-12">
                <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
                <p className={`text-lg font-medium ${colors.text.primary}`}>Nessun materiale</p>
                <p className={`mt-1 ${colors.text.secondary}`}>Clicca su "Nuovo Materiale" per iniziare</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grouped by category */}
                {categories?.map((category) => {
                  const catMaterials = groupedMaterials?.[category.id];
                  if (!catMaterials?.length) return null;
                  
                  const isExpanded = expandedCategories.has(category.id);
                  
                  return (
                    <div key={category.id} className={`border ${colors.border.primary} rounded-xl overflow-hidden`}>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                          <FolderOpen className="w-5 h-5 text-teal-600" />
                          <span className={`font-medium ${colors.text.primary}`}>{category.name}</span>
                          <span className={`text-sm ${colors.text.muted}`}>({catMaterials.length})</span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                          {catMaterials.map((material: any) => (
                            <MaterialRow
                              key={material.id}
                              material={material}
                              onEdit={handleEdit}
                              onDelete={(id) => {
                                if (confirm('Sei sicuro di voler eliminare questo materiale?')) {
                                  deleteMutation.mutate({ id });
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Uncategorized */}
                {groupedMaterials?.uncategorized?.length > 0 && (
                  <div className={`border ${colors.border.primary} rounded-xl overflow-hidden`}>
                    <button
                      onClick={() => toggleCategory('uncategorized')}
                      className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        {expandedCategories.has('uncategorized') ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        <FolderOpen className="w-5 h-5 text-gray-400" />
                        <span className={`font-medium ${colors.text.primary}`}>Senza categoria</span>
                        <span className={`text-sm ${colors.text.muted}`}>({groupedMaterials.uncategorized.length})</span>
                      </div>
                    </button>
                    
                    {expandedCategories.has('uncategorized') && (
                      <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        {groupedMaterials.uncategorized.map((material: any) => (
                          <MaterialRow
                            key={material.id}
                            material={material}
                            onEdit={handleEdit}
                            onDelete={(id) => {
                              if (confirm('Sei sicuro di voler eliminare questo materiale?')) {
                                deleteMutation.mutate({ id });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="p-6">
            {/* Category Form */}
            {showCategoryForm && (
              <div className={`mb-6 p-6 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                  {editingCategoryId ? <Edit2 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
                  {editingCategoryId ? 'Modifica Categoria' : 'Nuova Categoria'}
                </h3>

                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                        placeholder="Es: Biologia Molecolare"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Ordine
                      </label>
                      <input
                        type="number"
                        value={categoryFormData.order}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, order: parseInt(e.target.value) || 0 })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                      Descrizione
                    </label>
                    <textarea
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      rows={2}
                      className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetCategoryForm}
                      className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-50 dark:hover:bg-gray-700`}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                      className={`px-6 py-2.5 ${colors.primary.bg} text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2 disabled:opacity-50`}
                    >
                      <Save className="w-4 h-4" />
                      {editingCategoryId ? 'Salva' : 'Crea Categoria'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!showCategoryForm && (
              <button
                onClick={() => setShowCategoryForm(true)}
                className={`mb-6 px-4 py-2.5 border-2 border-dashed ${colors.border.primary} rounded-xl hover:border-red-400 transition-colors ${colors.text.muted} hover:text-red-600 flex items-center gap-2`}
              >
                <FolderPlus className="w-5 h-5" />
                Nuova Categoria
              </button>
            )}

            {/* Categories List */}
            <div className="space-y-3">
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className={`font-medium ${colors.text.primary}`}>{category.name}</p>
                      {category.description && (
                        <p className={`text-sm ${colors.text.muted}`}>{category.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${colors.background.secondary} ${colors.text.muted}`}>
                      {category._count?.materials || 0} materiali
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Modifica"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Sei sicuro di voler eliminare questa categoria?')) {
                          deleteCategoryMutation.mutate({ id: category.id });
                        }
                      }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Elimina"
                      disabled={(category._count?.materials || 0) > 0}
                    >
                      <Trash2 className={`w-4 h-4 ${(category._count?.materials || 0) > 0 ? 'text-gray-300 dark:text-gray-600' : 'text-red-500'}`} />
                    </button>
                  </div>
                </div>
              ))}

              {!categories?.length && (
                <div className="text-center py-8">
                  <FolderOpen className={`w-12 h-12 mx-auto mb-3 ${colors.text.muted}`} />
                  <p className={colors.text.secondary}>Nessuna categoria creata</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="p-6">
            {/* Subject Form */}
            {showSubjectForm && (
              <div className={`mb-6 p-6 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                  {editingSubjectId ? <Edit2 className="w-5 h-5" /> : <Palette className="w-5 h-5" />}
                  {editingSubjectId ? 'Modifica Materia' : 'Nuova Materia'}
                </h3>

                <form onSubmit={handleSubjectSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={subjectFormData.name}
                        onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                        placeholder="Es: Biologia"
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Codice <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={subjectFormData.code}
                        onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value.toUpperCase() })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent uppercase`}
                        placeholder="Es: BIO"
                        maxLength={10}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Ordine
                      </label>
                      <input
                        type="number"
                        value={subjectFormData.order}
                        onChange={(e) => setSubjectFormData({ ...subjectFormData, order: parseInt(e.target.value) || 0 })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Colore
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={subjectFormData.color}
                          onChange={(e) => setSubjectFormData({ ...subjectFormData, color: e.target.value })}
                          className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={subjectFormData.color}
                          onChange={(e) => setSubjectFormData({ ...subjectFormData, color: e.target.value })}
                          className={`flex-1 px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono`}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Icona (nome Lucide)
                      </label>
                      <input
                        type="text"
                        value={subjectFormData.icon}
                        onChange={(e) => setSubjectFormData({ ...subjectFormData, icon: e.target.value })}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                        placeholder="Es: dna, atom, calculator..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                      Descrizione
                    </label>
                    <textarea
                      value={subjectFormData.description}
                      onChange={(e) => setSubjectFormData({ ...subjectFormData, description: e.target.value })}
                      rows={2}
                      className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      placeholder="Descrizione opzionale della materia..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetSubjectForm}
                      className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-50 dark:hover:bg-gray-700`}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={createSubjectMutation.isPending || updateSubjectMutation.isPending}
                      className={`px-6 py-2.5 ${colors.primary.bg} text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2 disabled:opacity-50`}
                    >
                      <Save className="w-4 h-4" />
                      {editingSubjectId ? 'Salva' : 'Crea Materia'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!showSubjectForm && (
              <button
                onClick={() => setShowSubjectForm(true)}
                className={`mb-6 px-4 py-2.5 border-2 border-dashed ${colors.border.primary} rounded-xl hover:border-red-400 transition-colors ${colors.text.muted} hover:text-red-600 flex items-center gap-2`}
              >
                <Palette className="w-5 h-5" />
                Nuova Materia
              </button>
            )}

            {/* Subjects List */}
            <div className="space-y-3">
              {subjects?.map((subject) => (
                <div
                  key={subject.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${colors.border.primary} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: subject.color || '#6366f1' }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${colors.text.primary}`}>{subject.name}</p>
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-mono"
                          style={{ backgroundColor: `${subject.color}20`, color: subject.color || '#6366f1' }}
                        >
                          {subject.code}
                        </span>
                      </div>
                      {subject.description && (
                        <p className={`text-sm ${colors.text.muted}`}>{subject.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${colors.background.secondary} ${colors.text.muted}`}>
                      {subject._count?.materials || 0} materiali
                    </span>
                    {!subject.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500 dark:bg-gray-700">
                        Inattiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditSubject(subject)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Modifica"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Sei sicuro di voler eliminare questa materia?')) {
                          deleteSubjectMutation.mutate({ id: subject.id });
                        }
                      }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Elimina"
                      disabled={(subject._count?.materials || 0) > 0}
                    >
                      <Trash2 className={`w-4 h-4 ${(subject._count?.materials || 0) > 0 ? 'text-gray-300 dark:text-gray-600' : 'text-red-500'}`} />
                    </button>
                  </div>
                </div>
              ))}

              {!subjects?.length && (
                <div className="text-center py-8">
                  <Palette className={`w-12 h-12 mx-auto mb-3 ${colors.text.muted}`} />
                  <p className={colors.text.secondary}>Nessuna materia creata</p>
                  <p className={`text-sm ${colors.text.muted} mt-1`}>
                    Crea delle materie per organizzare i materiali didattici
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Material Row Component
function MaterialRow({ 
  material, 
  onEdit, 
  onDelete 
}: { 
  material: any; 
  onEdit: (m: any) => void; 
  onDelete: (id: string) => void;
}) {
  const TypeIcon = typeIcons[material.type as MaterialType] || File;
  const VisIcon = visibilityIcons[material.visibility as MaterialVisibility] || Globe;

  return (
    <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        material.type === 'PDF' ? 'bg-red-100 dark:bg-red-900/30' :
        material.type === 'VIDEO' ? 'bg-blue-100 dark:bg-blue-900/30' :
        material.type === 'LINK' ? 'bg-purple-100 dark:bg-purple-900/30' :
        'bg-gray-100 dark:bg-gray-700'
      }`}>
        <TypeIcon className={`w-5 h-5 ${
          material.type === 'PDF' ? 'text-red-600' :
          material.type === 'VIDEO' ? 'text-blue-600' :
          material.type === 'LINK' ? 'text-purple-600' :
          'text-gray-600'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${colors.text.primary} truncate`}>{material.title}</p>
        <div className={`flex items-center gap-3 text-sm ${colors.text.muted}`}>
          <span className="flex items-center gap-1">
            <VisIcon className="w-3.5 h-3.5" />
            {visibilityLabels[material.visibility as MaterialVisibility]}
          </span>
          {material.subject && (
            <span 
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: material.subject.color ? `${material.subject.color}20` : '#e5e7eb',
                color: material.subject.color || '#6b7280'
              }}
            >
              {material.subject.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {material.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            {material.downloadCount}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
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
          onClick={() => onEdit(material)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          title="Modifica"
        >
          <Edit2 className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={() => onDelete(material.id)}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          title="Elimina"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}
