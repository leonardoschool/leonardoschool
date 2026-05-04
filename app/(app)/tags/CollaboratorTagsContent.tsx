'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  BarChart3,
  ArrowUpDown,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Lock,
} from 'lucide-react';

interface TagFormData {
  name: string;
  description: string;
  color: string;
  categoryId: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  order: number;
}

export default function CollaboratorTagsContent() {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'tag'; id: string; name: string } | null>(null);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#6366f1',
    order: 0,
  });
  const [tagForm, setTagForm] = useState<TagFormData>({
    name: '',
    description: '',
    color: '',
    categoryId: '',
  });

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Get current user to check ownership
  const { data: currentUser } = trpc.auth.me.useQuery();

  // Helper to check if user owns a tag/category
  const isOwner = (createdBy: string | null | undefined) => {
    return createdBy === currentUser?.id;
  };

  // Queries
  const { data: categories, isLoading } = trpc.questionTags.getCategories.useQuery({
    includeInactive: showInactive,
    search: searchTerm || undefined,
  });

  // Query for uncategorized tags
  const { data: uncategorizedTagsData } = trpc.questionTags.getTags.useQuery({
    includeInactive: showInactive,
    uncategorized: true,
    pageSize: 200,
  });

  // Filter uncategorized tags by search term
  const uncategorizedTags = useMemo(() => {
    const tags = uncategorizedTagsData?.tags || [];
    if (!searchTerm) return tags;
    return tags.filter(tag => 
      tag.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uncategorizedTagsData?.tags, searchTerm]);

  const { data: stats } = trpc.questionTags.getStats.useQuery();

  // Mutations
  const createCategoryMutation = trpc.questionTags.createCategory.useMutation({
    onSuccess: () => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess('Categoria creata', 'La categoria è stata creata con successo.');
      setShowCategoryModal(false);
      resetCategoryForm();
    },
    onError: handleMutationError,
  });

  const updateCategoryMutation = trpc.questionTags.updateCategory.useMutation({
    onSuccess: () => {
      utils.questionTags.getCategories.invalidate();
      showSuccess('Categoria aggiornata', 'La categoria è stata aggiornata con successo.');
      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
    },
    onError: handleMutationError,
  });

  const deleteCategoryMutation = trpc.questionTags.deleteCategory.useMutation({
    onSuccess: (data) => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess('Categoria eliminata', `Categoria eliminata. ${data.unlinkedTags} tag scollegati.`);
      setDeleteConfirm(null);
    },
    onError: handleMutationError,
  });

  const createTagMutation = trpc.questionTags.createTag.useMutation({
    onSuccess: () => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getTags.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess('Tag creato', 'Il tag è stato creato con successo.');
      setShowTagModal(false);
      resetTagForm();
    },
    onError: handleMutationError,
  });

  const updateTagMutation = trpc.questionTags.updateTag.useMutation({
    onSuccess: () => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getTags.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess('Tag aggiornato', 'Il tag è stato aggiornato con successo.');
      setShowTagModal(false);
      setEditingTag(null);
      resetTagForm();
    },
    onError: handleMutationError,
  });

  const deleteTagMutation = trpc.questionTags.deleteTag.useMutation({
    onSuccess: (data) => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getTags.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess('Tag eliminato', `Tag eliminato. ${data.removedAssignments} assegnazioni rimosse.`);
      setDeleteConfirm(null);
    },
    onError: handleMutationError,
  });

  // Toggle tag active status
  const toggleTagActiveMutation = trpc.questionTags.updateTag.useMutation({
    onSuccess: (data) => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getTags.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess(
        data.isActive ? 'Tag attivato' : 'Tag disattivato',
        `Il tag "${data.name}" è stato ${data.isActive ? 'attivato' : 'disattivato'}.`
      );
    },
    onError: handleMutationError,
  });

  // Toggle category active status
  const toggleCategoryActiveMutation = trpc.questionTags.updateCategory.useMutation({
    onSuccess: (data) => {
      utils.questionTags.getCategories.invalidate();
      utils.questionTags.getTags.invalidate();
      utils.questionTags.getStats.invalidate();
      showSuccess(
        data.isActive ? 'Categoria attivata' : 'Categoria disattivata',
        `La categoria "${data.name}" è stata ${data.isActive ? 'attivata' : 'disattivata'}.`
      );
    },
    onError: handleMutationError,
  });

  // Helper functions
  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '', color: '#6366f1', order: 0 });
  };

  const resetTagForm = () => {
    setTagForm({ name: '', description: '', color: '', categoryId: '' });
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

  const openEditCategory = (category: { id?: string; name?: string; description?: string | null; color?: string | null; order?: number; createdBy?: string | null }) => {
    if (!category.id || !category.name) return;
    setEditingCategory(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#6366f1',
      order: category.order ?? 0,
    });
    setShowCategoryModal(true);
  };

  const openEditTag = (tag: { id?: string; name?: string; description?: string | null; color?: string | null; categoryId?: string | null }) => {
    if (!tag.id || !tag.name) return;
    setEditingTag(tag.id);
    setTagForm({
      name: tag.name,
      description: tag.description || '',
      color: tag.color || '',
      categoryId: tag.categoryId || '',
    });
    setShowTagModal(true);
  };

  const openNewTag = (categoryId?: string) => {
    resetTagForm();
    if (categoryId) {
      setTagForm(prev => ({ ...prev, categoryId }));
    }
    setShowTagModal(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory,
        ...categoryForm,
        description: categoryForm.description || undefined,
      });
    } else {
      createCategoryMutation.mutate({
        ...categoryForm,
        description: categoryForm.description || undefined,
      });
    }
  };

  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      updateTagMutation.mutate({
        id: editingTag,
        ...tagForm,
        description: tagForm.description || undefined,
        color: tagForm.color || undefined,
        categoryId: tagForm.categoryId || undefined,
      });
    } else {
      createTagMutation.mutate({
        ...tagForm,
        description: tagForm.description || undefined,
        color: tagForm.color || undefined,
        categoryId: tagForm.categoryId || undefined,
      });
    }
  };

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${colors.text.primary}`}>
            <Tag className="w-8 h-8" />
            Gestione Tag
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Visualizza e gestisci i tag per organizzare le domande
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { resetCategoryForm(); setEditingCategory(null); setShowCategoryModal(true); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.background.secondary} hover:${colors.background.tertiary}`}
          >
            <FolderOpen className="w-4 h-4" />
            Nuova Categoria
          </button>
          <button
            onClick={() => openNewTag()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${colors.primary.gradient} text-white`}
          >
            <Plus className="w-4 h-4" />
            Nuovo Tag
          </button>
        </div>
      </div>

      {/* Info Banner for collaborators */}
      <div className={`p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800`}>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Permessi limitati
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
              Puoi creare nuovi tag e categorie, ma puoi modificare o eliminare solo quelli che hai creato tu.
              I tag e le categorie degli altri utenti sono di sola lettura.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30`}>
                <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.categories.active}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Categorie</p>
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-green-100 dark:bg-green-900/30`}>
                <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.tags.active}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Tag attivi</p>
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30`}>
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.assignments.total}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Assegnazioni</p>
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${colors.background.card} border ${colors.border.primary}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30`}>
                <ArrowUpDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.tags.uncategorized}</p>
                <p className={`text-sm ${colors.text.secondary}`}>Senza categoria</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${colors.icon.secondary}`} />
          <input
            type="text"
            placeholder="Cerca categorie e tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            showInactive ? colors.primary.bg + ' text-white' : colors.background.secondary
          }`}
        >
          {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showInactive ? 'Nascondi inattivi' : 'Mostra inattivi'}
        </button>
      </div>

      {/* Categories and Tags List */}
      <div className={`${colors.background.card} rounded-xl shadow-sm border ${colors.border.primary} overflow-hidden`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento...</p>
          </div>
        ) : !categories?.length ? (
          <div className="p-12 text-center">
            <Tag className={`w-12 h-12 mx-auto ${colors.text.muted} mb-4`} />
            <p className={colors.text.secondary}>Nessuna categoria trovata</p>
            <button
              onClick={() => { resetCategoryForm(); setShowCategoryModal(true); }}
              className={`mt-4 px-4 py-2 rounded-lg ${colors.primary.gradient} text-white text-sm font-medium`}
            >
              Crea la prima categoria
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {categories.map((category) => {
              const canEditCategory = isOwner(category.createdBy);
              
              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <div
                    className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition-all cursor-pointer ${colors.background.hover} ${
                      !category.isActive ? 'opacity-50' : ''
                    }`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <button className="p-1 text-gray-600 dark:text-gray-400">
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color || '#6366f1' }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${colors.text.primary}`}>
                        {category.name}
                        {!category.isActive && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Inattivo
                          </span>
                        )}
                      </p>
                      {category.description && (
                        <p className={`text-sm ${colors.text.secondary} truncate`}>{category.description}</p>
                      )}
                    </div>
                    
                    <span className={`text-sm ${colors.text.muted}`}>
                      {category._count.tags} tag
                    </span>
                    
                    {!canEditCategory && (
                      <span title="Sola lettura">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </span>
                    )}
                    
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEditCategory && (
                        <>
                          <button
                            onClick={() => toggleCategoryActiveMutation.mutate({ id: category.id, isActive: !category.isActive })}
                            disabled={toggleCategoryActiveMutation.isPending}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              category.isActive 
                                ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                                : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                            }`}
                            title={category.isActive ? 'Disattiva' : 'Attiva'}
                          >
                            {category.isActive ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditCategory(category)}
                            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.text.secondary} transition-colors`}
                            title="Modifica"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'category', id: category.id, name: category.name })}
                            className={`p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors`}
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* Always show add tag button - anyone can add tags to any category */}
                      <button
                        onClick={() => openNewTag(category.id)}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.text.secondary} transition-colors`}
                        title="Aggiungi tag"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tags in Category */}
                  {expandedCategories.has(category.id) && category.tags.length > 0 && (
                    <div className={`${colors.background.secondary} border-t ${colors.border.primary}`}>
                      {category.tags.map((tag) => {
                        const canEditTag = isOwner(tag.createdBy);
                        
                        return (
                          <div
                            key={tag.id}
                            className={`pl-14 pr-4 py-3 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
                              !tag.isActive ? 'opacity-50' : ''
                            }`}
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tag.color || category.color || '#6366f1' }}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${colors.text.primary}`}>
                                {tag.name}
                                {!tag.isActive && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                    Inattivo
                                  </span>
                                )}
                              </p>
                              {tag.description && (
                                <p className={`text-xs ${colors.text.secondary} truncate`}>{tag.description}</p>
                              )}
                            </div>
                            
                            {!canEditTag && (
                              <span title="Sola lettura">
                                <Lock className="w-4 h-4 text-gray-400" />
                              </span>
                            )}
                            
                            <span className={`text-xs ${colors.text.muted}`}>
                              {tag._count.questions} domande
                            </span>
                            
                            {canEditTag && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleTagActiveMutation.mutate({ id: tag.id, isActive: !tag.isActive })}
                                  disabled={toggleTagActiveMutation.isPending}
                                  className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                                    tag.isActive 
                                      ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                                      : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                                  }`}
                                  title={tag.isActive ? 'Disattiva' : 'Attiva'}
                                >
                                  {tag.isActive ? (
                                    <ToggleRight className="w-3.5 h-3.5" />
                                  ) : (
                                    <ToggleLeft className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => openEditTag(tag)}
                                  className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.text.secondary} transition-colors`}
                                  title="Modifica"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'tag', id: tag.id, name: tag.name })}
                                  className={`p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors`}
                                  title="Elimina"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            {/* Uncategorized Tags Section */}
            {uncategorizedTags.length > 0 && (
              <div className={`border-t-2 ${colors.border.primary}`}>
                {/* Uncategorized Header */}
                <div className="p-4 flex items-center gap-4 bg-gray-50 dark:bg-gray-800/30">
                  <div className="w-6" />
                  
                  <div className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-400 dark:bg-gray-600" />
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${colors.text.primary}`}>
                      Senza categoria
                    </p>
                    <p className={`text-sm ${colors.text.secondary}`}>
                      Tag non associati a nessuna categoria
                    </p>
                  </div>
                  
                  <span className={`text-sm ${colors.text.muted}`}>
                    {uncategorizedTags.length} tag
                  </span>
                </div>

                {/* Uncategorized Tags */}
                <div className={`${colors.background.secondary} border-t ${colors.border.primary}`}>
                  {uncategorizedTags.map((tag) => {
                    const canEditTag = isOwner(tag.createdBy);
                    
                    return (
                      <div
                        key={tag.id}
                        className={`pl-14 pr-4 py-3 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
                          !tag.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color || '#6b7280' }}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${colors.text.primary}`}>
                            {tag.name}
                            {!tag.isActive && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                Inattivo
                              </span>
                            )}
                          </p>
                          {tag.description && (
                            <p className={`text-xs ${colors.text.secondary} truncate`}>{tag.description}</p>
                          )}
                        </div>
                        
                        {!canEditTag && (
                          <span title="Sola lettura">
                            <Lock className="w-4 h-4 text-gray-400" />
                          </span>
                        )}
                        
                        <span className={`text-xs ${colors.text.muted}`}>
                          {tag._count?.questions || 0} domande
                        </span>
                        
                        {canEditTag && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleTagActiveMutation.mutate({ id: tag.id!, isActive: !tag.isActive })}
                              disabled={toggleTagActiveMutation.isPending}
                              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                                tag.isActive 
                                  ? 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                                  : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                              }`}
                              title={tag.isActive ? 'Disattiva' : 'Attiva'}
                            >
                              {tag.isActive ? (
                                <ToggleRight className="w-3.5 h-3.5" />
                              ) : (
                                <ToggleLeft className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => openEditTag(tag)}
                              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${colors.text.secondary} transition-colors`}
                              title="Modifica"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'tag', id: tag.id!, name: tag.name! })}
                              className={`p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors`}
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className={`w-full max-w-md ${colors.background.card} rounded-xl shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${colors.border.primary}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h2>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                    placeholder="Es. Database di riferimento"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Descrizione
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                    placeholder="Descrizione opzionale"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Colore
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          categoryForm.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Ordine
                  </label>
                  <input
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                    min={0}
                    className={`w-24 px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                  />
                </div>
              </div>
              <div className={`px-6 py-4 border-t ${colors.border.primary} flex justify-end gap-3`}>
                <button
                  type="button"
                  onClick={() => { setShowCategoryModal(false); setEditingCategory(null); resetCategoryForm(); }}
                  className={`px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80 transition-opacity`}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50`}
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Tag Modal */}
      {showTagModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className={`w-full max-w-md ${colors.background.card} rounded-xl shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b ${colors.border.primary}`}>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {editingTag ? 'Modifica Tag' : 'Nuovo Tag'}
              </h2>
            </div>
            <form onSubmit={handleTagSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={tagForm.name}
                    onChange={(e) => setTagForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                    placeholder="Es. TOLC-MED 2024"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Descrizione
                  </label>
                  <textarea
                    value={tagForm.description}
                    onChange={(e) => setTagForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className={`w-full px-4 py-2 rounded-lg ${colors.background.input} ${colors.text.primary} border ${colors.border.primary} focus:ring-2 focus:ring-[#a8012b]/30 focus:border-[#a8012b]`}
                    placeholder="Descrizione opzionale"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-1`}>
                    Categoria
                  </label>
                  <CustomSelect
                    value={tagForm.categoryId}
                    onChange={(value) => setTagForm(prev => ({ ...prev, categoryId: value }))}
                    options={[
                      { value: '', label: 'Nessuna categoria' },
                      ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []),
                    ]}
                    placeholder="Seleziona categoria"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Colore (opzionale, altrimenti usa quello della categoria)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTagForm(prev => ({ ...prev, color: '' }))}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${
                        !tagForm.color ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                      } bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-600 dark:to-gray-800`}
                    >
                      <span className="text-xs">Auto</span>
                    </button>
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setTagForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          tagForm.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={`px-6 py-4 border-t ${colors.border.primary} flex justify-end gap-3`}>
                <button
                  type="button"
                  onClick={() => { setShowTagModal(false); setEditingTag(null); resetTagForm(); }}
                  className={`px-4 py-2 rounded-lg ${colors.background.secondary} ${colors.text.primary} hover:opacity-80 transition-opacity`}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={createTagMutation.isPending || updateTagMutation.isPending}
                  className={`px-4 py-2 rounded-lg ${colors.primary.gradient} text-white font-medium disabled:opacity-50`}
                >
                  {(createTagMutation.isPending || updateTagMutation.isPending) ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm?.type === 'category') {
            deleteCategoryMutation.mutate({ id: deleteConfirm.id });
          } else if (deleteConfirm?.type === 'tag') {
            deleteTagMutation.mutate({ id: deleteConfirm.id });
          }
        }}
        title={`Elimina ${deleteConfirm?.type === 'category' ? 'categoria' : 'tag'}`}
        message={
          deleteConfirm?.type === 'category'
            ? `Sei sicuro di voler eliminare la categoria "${deleteConfirm?.name}"? I tag associati non verranno eliminati ma resteranno senza categoria.`
            : `Sei sicuro di voler eliminare il tag "${deleteConfirm?.name}"? Verrà rimosso da tutte le domande a cui è assegnato.`
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteCategoryMutation.isPending || deleteTagMutation.isPending}
      />
    </div>
  );
}
