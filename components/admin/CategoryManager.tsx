'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc/client';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner, ButtonLoader } from '@/components/ui/loaders';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  FolderPlus,
  Folder,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Users,
  UserCheck,
  Globe,
  EyeOff,
  FileText,
  Plus,
  Minus,
  Eye,
  Search,
} from 'lucide-react';

// ==================== TYPES ====================

type MaterialVisibility = 'NONE' | 'ALL_STUDENTS' | 'GROUP_BASED' | 'SELECTED_STUDENTS';

interface CategoryData {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  order: number;
  isActive: boolean;
  visibility: MaterialVisibility;
  _count?: { materials: number };
  groupAccess?: Array<{ group: { id: string; name: string } }>;
  studentAccess?: Array<{ student: { user: { id: string; name: string } } }>;
}

interface MaterialData {
  id?: string;
  title?: string;
  type?: string;
  subjectId?: string | null;
  categories?: Array<{
    id?: string;
    categoryId?: string;
    materialId?: string;
    createdAt?: string;
    category?: {
      id?: string;
      name?: string;
      description?: string;
      visibility?: MaterialVisibility;
      order?: number;
      icon?: string;
    };
  }>;
}

interface CategoryManagerProps {
  onClose: () => void;
  role?: 'ADMIN' | 'COLLABORATOR';
}

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
}

interface AssignmentData {
  visibility: MaterialVisibility;
  groupIds: string[];
  studentIds: string[];
}

// ==================== CONSTANTS ====================

const visibilityOptions: { value: MaterialVisibility; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'NONE',
    label: 'Nessuno',
    icon: <EyeOff className="h-4 w-4" />,
    description: 'Non visibile a nessuno studente',
  },
  {
    value: 'ALL_STUDENTS',
    label: 'Tutti gli studenti',
    icon: <Globe className="h-4 w-4" />,
    description: 'Visibile a tutti gli studenti attivi',
  },
  {
    value: 'GROUP_BASED',
    label: 'Gruppi specifici',
    icon: <Users className="h-4 w-4" />,
    description: 'Visibile solo ai membri dei gruppi selezionati',
  },
  {
    value: 'SELECTED_STUDENTS',
    label: 'Studenti selezionati',
    icon: <UserCheck className="h-4 w-4" />,
    description: 'Visibile solo agli studenti selezionati',
  },
];

const defaultFormData: CategoryFormData = {
  name: '',
  description: '',
  icon: '',
};

const defaultAssignmentData: AssignmentData = {
  visibility: 'NONE',
  groupIds: [],
  studentIds: [],
};

// ==================== MAIN COMPONENT ====================

export default function CategoryManager({ onClose: _onClose, role = 'ADMIN' }: CategoryManagerProps) {
  // _onClose kept for interface compatibility

  const isAdmin = role === 'ADMIN';

  // State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(defaultFormData);
  
  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningCategoryId, setAssigningCategoryId] = useState<string | null>(null);
  const [assignmentData, setAssignmentData] = useState<AssignmentData>(defaultAssignmentData);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'students' | 'collaborators'>('all');

  // Materials modal state
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [managingCategoryId, setManagingCategoryId] = useState<string | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');

  // Portal mounting
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hooks
  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Queries
  const { data: categoriesRaw, isLoading: categoriesLoading } = trpc.materials.getAllCategories.useQuery();
  const { data: groups } = trpc.groups.getAll.useQuery();
  const { data: students } = trpc.students.getAllForAdmin.useQuery();
  const { data: collaborators } = trpc.users.getCollaborators.useQuery();
  const { data: allMaterials } = trpc.materials.getAll.useQuery({});
  const { data: subjects } = trpc.materials.getAllSubjects.useQuery();

  const categories = (categoriesRaw || []) as CategoryData[];

  // Get materials for the selected category
  const categoryMaterials = (allMaterials || []).filter((m: MaterialData) => {
    if (!m.id) return false;
    // Check if material has this category in its categories array
    const hasCategory = m.categories?.some((c) => c.categoryId === managingCategoryId);
    if (!hasCategory) return false;
    if (filterSubjectId && m.subjectId !== filterSubjectId) return false;
    return true;
  });
  // Get materials NOT in this specific category (but can be in other categories)
  const unassignedMaterials = (allMaterials || []).filter((m: MaterialData) => {
    if (!m.id) return false;
    // Material is available if it's NOT already in THIS category
    const hasThisCategory = m.categories?.some((c) => c.categoryId === managingCategoryId);
    if (hasThisCategory) return false;
    if (filterSubjectId && m.subjectId !== filterSubjectId) return false;
    return true;
  });

  // Mutations
  const createCategoryMutation = trpc.materials.createCategory.useMutation({
    onSuccess: () => {
      showSuccess('Cartella creata', 'La cartella è stata creata con successo.');
      utils.materials.getAllCategories.invalidate();
      utils.materials.getCategories.invalidate();
      resetCategoryForm();
    },
    onError: handleMutationError,
  });

  const updateCategoryMutation = trpc.materials.updateCategory.useMutation({
    onSuccess: () => {
      showSuccess('Cartella aggiornata', 'La cartella è stata aggiornata con successo.');
      utils.materials.getAllCategories.invalidate();
      utils.materials.getCategories.invalidate();
      resetCategoryForm();
      setShowAssignModal(false);
      setAssigningCategoryId(null);
    },
    onError: handleMutationError,
  });

  const deleteCategoryMutation = trpc.materials.deleteCategory.useMutation({
    onSuccess: () => {
      showSuccess('Cartella eliminata', 'La cartella è stata eliminata con successo.');
      utils.materials.getAllCategories.invalidate();
      utils.materials.getCategories.invalidate();
    },
    onError: handleMutationError,
  });

  // Material update mutation (for adding/removing from category)
  const updateMaterialMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getAllCategories.invalidate();
    },
    onError: handleMutationError,
  });

  // Form handlers
  const resetCategoryForm = () => {
    setCategoryFormData(defaultFormData);
    setShowCategoryForm(false);
    setEditingCategoryId(null);
  };

  const handleEditCategory = (category: CategoryData) => {
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
    });
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
  };

  const handleOpenAssignModal = (category: CategoryData) => {
    setAssigningCategoryId(category.id);
    setAssignmentData({
      visibility: category.visibility,
      groupIds: category.groupAccess?.map(ga => ga.group.id) || [],
      studentIds: category.studentAccess?.map(sa => sa.student.user.id) || [],
    });
    setGroupSearchTerm('');
    setUserSearchTerm('');
    setUserTypeFilter('all');
    setShowAssignModal(true);
  };

  const handleSubmitCategory = () => {
    if (!categoryFormData.name.trim()) return;

    if (editingCategoryId) {
      const currentCategory = categories.find(c => c.id === editingCategoryId);
      updateCategoryMutation.mutate({
        id: editingCategoryId,
        name: categoryFormData.name,
        description: categoryFormData.description || null,
        icon: categoryFormData.icon || null,
        visibility: currentCategory?.visibility || 'NONE',
        groupIds: currentCategory?.groupAccess?.map(ga => ga.group.id) || [],
        studentIds: currentCategory?.studentAccess?.map(sa => sa.student.user.id) || [],
      });
    } else {
      createCategoryMutation.mutate({
        name: categoryFormData.name,
        description: categoryFormData.description || undefined,
        icon: categoryFormData.icon || undefined,
        visibility: 'NONE',
      });
    }
  };

  const handleSubmitAssignment = () => {
    if (!assigningCategoryId) return;
    
    const currentCategory = categories.find(c => c.id === assigningCategoryId);
    if (!currentCategory) return;

    updateCategoryMutation.mutate({
      id: assigningCategoryId,
      name: currentCategory.name,
      visibility: assignmentData.visibility,
      groupIds: assignmentData.groupIds,
      studentIds: assignmentData.studentIds,
    });
  };

  const handleDeleteCategory = (categoryId: string, materialCount: number) => {
    const message = materialCount > 0 
      ? `Sei sicuro di voler eliminare questa categoria? I ${materialCount} materiali associati non verranno eliminati, ma verranno scollegati dalla categoria.`
      : 'Sei sicuro di voler eliminare questa categoria?';
    
    if (confirm(message)) {
      deleteCategoryMutation.mutate({ id: categoryId });
    }
  };

  const handleOpenMaterialsModal = (categoryId: string) => {
    setManagingCategoryId(categoryId);
    setFilterSubjectId(''); // Reset filter when opening modal
    setShowMaterialsModal(true);
  };

  const handleAddMaterialToCategory = (materialId: string) => {
    if (!managingCategoryId) return;
    
    // Get current material to preserve existing categories
    const material = allMaterials?.find((m: MaterialData) => m.id === materialId);
    const currentCategoryIds = material?.categories?.map((c) => c.categoryId) || [];
    
    // Add the new category if not already present
    if (!currentCategoryIds.includes(managingCategoryId)) {
      updateMaterialMutation.mutate({
        id: materialId,
        categoryIds: [...currentCategoryIds, managingCategoryId],
      });
    }
  };

  const handleRemoveMaterialFromCategory = (materialId: string) => {
    if (!managingCategoryId) return;
    
    // Get current material categories
    const material = allMaterials?.find((m: MaterialData) => m.id === materialId);
    const currentCategoryIds = material?.categories?.map((c) => c.categoryId) || [];
    
    // Remove the current category
    const newCategoryIds = currentCategoryIds.filter((id: string) => id !== managingCategoryId);
    
    updateMaterialMutation.mutate({
      id: materialId,
      categoryIds: newCategoryIds,
    });
  };

  // Render
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      {!showCategoryForm && (
        <button
          onClick={() => {
            resetCategoryForm();
            setShowCategoryForm(true);
          }}
          className="px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-[#a8012b] hover:text-[#a8012b] dark:hover:text-[#d1163b] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex items-center gap-2"
        >
          <FolderPlus className="w-5 h-5" />
          Nuova Cartella
        </button>
      )}

      {/* Category Form - Simplified */}
      {showCategoryForm && (
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            {editingCategoryId ? <Edit2 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            {editingCategoryId ? 'Modifica Cartella' : 'Nuova Cartella'}
          </h3>
          
          <div className="space-y-4">
            {/* Name & Icon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Nome cartella"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Icona (nome Lucide)
                </label>
                <input
                  type="text"
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="es. BookOpen, Video, FileText"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrizione
              </label>
              <textarea
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Descrizione opzionale..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={resetCategoryForm}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmitCategory}
                disabled={!categoryFormData.name.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                <ButtonLoader loading={createCategoryMutation.isPending || updateCategoryMutation.isPending} loadingText="Salvataggio...">
                  <Save className="h-4 w-4" />
                  {editingCategoryId ? 'Salva Modifiche' : 'Crea Cartella'}
                </ButtonLoader>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Nessuna cartella</p>
          <p className="text-sm">Crea la prima cartella per organizzare i materiali</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const materialCount = category._count?.materials || 0;
            // Admin can edit all, Collaborator cannot edit categories (view only)
            const canEdit = isAdmin;
            
            return (
              <div
                key={category.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Folder className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                        {!category.isActive && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Inattiva
                          </span>
                        )}
                      </h4>
                      {category.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{category.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {materialCount} materiali
                        </span>
                        <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {category.visibility === 'NONE' && <EyeOff className="h-3 w-3" />}
                          {category.visibility === 'ALL_STUDENTS' && <Globe className="h-3 w-3" />}
                          {category.visibility === 'GROUP_BASED' && <Users className="h-3 w-3" />}
                          {category.visibility === 'SELECTED_STUDENTS' && <UserCheck className="h-3 w-3" />}
                          {visibilityOptions.find(v => v.value === category.visibility)?.label || 'Non assegnato'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit ? (
                      <>
                        {/* Manage Materials Button */}
                        <button
                          onClick={() => handleOpenMaterialsModal(category.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                          title="Gestisci materiali"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {/* Manage Recipients Button */}
                        <button
                          onClick={() => handleOpenAssignModal(category)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Gestisci destinatari"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteCategory(category.id, materialCount)}
                          disabled={deleteCategoryMutation.isPending}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title={materialCount > 0 ? `Elimina (${materialCount} materiali verranno scollegati)` : 'Elimina'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      /* View materials button for collaborators */
                      <button
                        onClick={() => handleOpenMaterialsModal(category.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        title="Visualizza materiali"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 text-sm p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="space-y-2">
          <p className="text-blue-900 dark:text-blue-100 font-medium">
            📁 Come funzionano le cartelle:
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm">
            <li>Le cartelle raggruppano materiali per argomento o tipo</li>
            <li>Quando rendi una cartella visibile agli studenti, <strong>tutti i materiali al suo interno</strong> diventano automaticamente accessibili</li>
            <li>Non serve impostare la visibilità dei singoli materiali se sono dentro una cartella visibile</li>
            <li>Gli studenti vedranno le cartelle nella loro sezione materiali</li>
          </ul>
          <p className="text-orange-600 dark:text-orange-400 text-sm font-medium pt-1">
            ⚠️ Le cartelle con visibilità &quot;Nessuno&quot; non sono visibili agli studenti. Usa l&apos;icona 👥 per modificare chi può vederle.
          </p>
        </div>
      </div>

      {/* Materials Management Modal */}
      {showMaterialsModal && managingCategoryId && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                {isAdmin ? 'Gestisci' : 'Visualizza'} Materiali - {categories.find(c => c.id === managingCategoryId)?.name}
              </h2>
              <button
                onClick={() => {
                  setShowMaterialsModal(false);
                  setManagingCategoryId(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Filter by Subject */}
              <div>
                <CustomSelect
                  label="Filtra per materia"
                  value={filterSubjectId}
                  onChange={setFilterSubjectId}
                  options={[
                    { value: '', label: 'Tutte le materie' },
                    ...(subjects?.map((subject) => ({
                      value: subject.id,
                      label: subject.name,
                    })) || []),
                  ]}
                  placeholder="Seleziona materia..."
                  searchable
                />
              </div>

              {/* Materials in this category */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Folder className="h-4 w-4 text-amber-500" />
                  Materiali in questa categoria ({categoryMaterials.length})
                </h3>
                {categoryMaterials.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    Nessun materiale in questa categoria
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categoryMaterials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{material.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                            {material.type}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMaterialFromCategory(material.id)}
                            disabled={updateMaterialMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                            title="Rimuovi dalla categoria"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available materials (not in this category) - Only for Admin */}
              {isAdmin && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-teal-500" />
                    Materiali disponibili ({unassignedMaterials.length})
                  </h3>
                  {unassignedMaterials.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      Tutti i materiali sono già in questa categoria
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unassignedMaterials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">{material.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                              {material.type}
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddMaterialToCategory(material.id)}
                            disabled={updateMaterialMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 transition-colors disabled:opacity-50"
                            title="Aggiungi alla categoria"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setShowMaterialsModal(false);
                  setManagingCategoryId(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Assignment Modal */}
      {showAssignModal && assigningCategoryId && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Gestisci Destinatari
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningCategoryId(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Visibilità
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAssignmentData({ ...assignmentData, visibility: option.value })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        assignmentData.visibility === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={assignmentData.visibility === option.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}>
                          {option.icon}
                        </span>
                        <span className={`font-medium ${assignmentData.visibility === option.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Selection */}
              {assignmentData.visibility === 'GROUP_BASED' && groups && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleziona Gruppi
                  </label>
                  {/* Search Input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      placeholder="Cerca gruppo..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    {(() => {
                      if (groups.length === 0) {
                        return <p className="text-sm text-gray-500 dark:text-gray-400">Nessun gruppo disponibile</p>;
                      }
                      const filtered = groups.filter((group) => 
                        group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return <p className="text-sm text-gray-500 dark:text-gray-400">Nessun gruppo trovato</p>;
                      }
                      return filtered.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            const newIds = assignmentData.groupIds.includes(group.id)
                              ? assignmentData.groupIds.filter(id => id !== group.id)
                              : [...assignmentData.groupIds, group.id];
                            setAssignmentData({ ...assignmentData, groupIds: newIds });
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            assignmentData.groupIds.includes(group.id)
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-gray-500'
                          }`}
                        >
                          {group.name}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* User Selection (Students + Collaborators) */}
              {assignmentData.visibility === 'SELECTED_STUDENTS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seleziona Utenti
                  </label>
                  {/* User Type Filter */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setUserTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        userTypeFilter === 'all'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Tutti
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserTypeFilter('students')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        userTypeFilter === 'students'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Studenti
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserTypeFilter('collaborators')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        userTypeFilter === 'collaborators'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Collaboratori
                    </button>
                  </div>
                  {/* Search Input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Cerca utente..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                    {(() => {
                      // Build combined users list based on filter
                      const users: Array<{ id: string; name: string; type: 'student' | 'collaborator' }> = [];
                      
                      if (userTypeFilter === 'all' || userTypeFilter === 'students') {
                        students?.forEach((student: { id: string; name: string; student?: { id: string } }) => {
                          const studentId = student.student?.id || student.id;
                          if (studentId) {
                            users.push({ id: studentId, name: student.name, type: 'student' });
                          }
                        });
                      }
                      
                      if (userTypeFilter === 'all' || userTypeFilter === 'collaborators') {
                        collaborators?.forEach((collaborator: { id: string; name: string }) => {
                          users.push({ id: collaborator.id, name: collaborator.name, type: 'collaborator' });
                        });
                      }
                      
                      if (users.length === 0) {
                        return <p className="text-sm text-gray-500 dark:text-gray-400">Nessun utente disponibile</p>;
                      }
                      
                      const filtered = users.filter(user =>
                        user.name.toLowerCase().includes(userSearchTerm.toLowerCase())
                      );
                      
                      if (filtered.length === 0) {
                        return <p className="text-sm text-gray-500 dark:text-gray-400">Nessun utente trovato</p>;
                      }
                      
                      return filtered.map((user) => {
                        const isSelected = assignmentData.studentIds.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              const newIds = isSelected
                                ? assignmentData.studentIds.filter(id => id !== user.id)
                                : [...assignmentData.studentIds, user.id];
                              setAssignmentData({ ...assignmentData, studentIds: newIds });
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-gray-200 dark:border-gray-500'
                            }`}
                          >
                            {user.name}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : user.type === 'student'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            }`}>
                              {user.type === 'student' ? 'S' : 'C'}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningCategoryId(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={updateCategoryMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                <ButtonLoader loading={updateCategoryMutation.isPending} loadingText="Salvataggio...">
                  <Save className="h-4 w-4" />
                  Salva Assegnazioni
                </ButtonLoader>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
