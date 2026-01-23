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
import ConfirmModal from '@/components/ui/ConfirmModal';
import TopicsManager from '@/components/admin/TopicsManager';
import CategoryManager from '@/components/admin/CategoryManager';
import { GroupInfoModal } from '@/components/ui/GroupInfoModal';
import { EditMaterialModal } from '@/components/ui/EditMaterialModal';
import { SubjectEditModal } from '@/components/ui/SubjectEditModal';
import type { SubjectFormData } from '@/components/ui/SubjectEditModal';
import { 
  Folder,
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
  EyeOff,
  Users,
  User,
  BookOpen,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Globe,
  UserCheck,
  ExternalLink,
  Palette,
  List,
  AlertCircle,
  GraduationCap,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { firebaseStorage } from '@/lib/firebase/storage';

// ==================== TYPES ====================

type MaterialType = 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';
type MaterialVisibility = 'NONE' | 'ALL_STUDENTS' | 'GROUP_BASED' | 'SELECTED_STUDENTS';
type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

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
  NONE: EyeOff,
  ALL_STUDENTS: Globe,
  GROUP_BASED: Users,
  SELECTED_STUDENTS: UserCheck,
};

const visibilityLabels: Record<MaterialVisibility, string> = {
  NONE: 'Non assegnato',
  ALL_STUDENTS: 'Tutti gli studenti',
  GROUP_BASED: 'Per gruppo',
  SELECTED_STUDENTS: 'Studenti selezionati',
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  EASY: 'Facile',
  MEDIUM: 'Medio',
  HARD: 'Difficile',
};

const difficultyColors: Record<DifficultyLevel, { bg: string; text: string }> = {
  EASY: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  MEDIUM: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  HARD: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

// Material type background colors
const materialTypeBgColors: Record<MaterialType, string> = {
  PDF: 'bg-red-100 dark:bg-red-900/30',
  VIDEO: 'bg-blue-100 dark:bg-blue-900/30',
  LINK: 'bg-purple-100 dark:bg-purple-900/30',
  DOCUMENT: 'bg-gray-100 dark:bg-gray-800',
};

// Material type text colors  
const materialTypeTextColors: Record<MaterialType, string> = {
  PDF: 'text-red-600 dark:text-red-400',
  VIDEO: 'text-blue-600 dark:text-blue-400',
  LINK: 'text-purple-600 dark:text-purple-400',
  DOCUMENT: 'text-gray-600 dark:text-gray-400',
};

// Visibility badge styles
const _visibilityBadgeStyles: Record<MaterialVisibility, string> = {
  NONE: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  ALL_STUDENTS: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
  GROUP_BASED: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  SELECTED_STUDENTS: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
};

// File accept types for input
const _fileAcceptTypes: Record<MaterialType, string> = {
  PDF: '.pdf',
  VIDEO: 'video/*',
  LINK: '*',
  DOCUMENT: '*',
};

// Get difficulty label
const _getDifficultyLabel = (difficulty: DifficultyLevel): string => difficultyLabels[difficulty];

// Icon map for subjects
const iconMap: Record<string, LucideIcon> = {
  dna: GraduationCap,
  atom: GraduationCap,
  calculator: GraduationCap,
  brain: GraduationCap,
  beaker: GraduationCap,
  microscope: GraduationCap,
  book: BookOpen,
};

// Helper to check if string is an emoji
const isEmoji = (str: string): boolean => {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  return emojiRegex.test(str);
};

// ==================== SUBJECT ICON COMPONENT ====================

// Size classes for SubjectIcon component
const SUBJECT_ICON_SIZES = {
  sm: { icon: 'w-4 h-4', container: 'w-8 h-8', emoji: 'text-lg' },
  md: { icon: 'w-5 h-5', container: 'w-10 h-10', emoji: 'text-xl' },
  lg: { icon: 'w-6 h-6', container: 'w-12 h-12', emoji: 'text-2xl' },
} as const;

interface SubjectIconProps {
  readonly icon?: string | null;
  readonly color?: string | null;
  readonly size?: 'sm' | 'md' | 'lg';
}

const SubjectIcon = ({ icon, color, size = 'md' }: SubjectIconProps) => {
  const sizes = SUBJECT_ICON_SIZES[size];
  const sizeClasses = sizes.icon;
  const containerSize = sizes.container;
  const emojiSize = sizes.emoji;
  
  if (!icon) {
    return (
      <div 
        className={`${containerSize} rounded-lg flex items-center justify-center`}
        style={{ backgroundColor: `${color || '#6366f1'}20` }}
      >
        <div 
          className={sizeClasses}
          style={{ backgroundColor: color || '#6366f1', borderRadius: '50%' }}
        />
      </div>
    );
  }

  if (isEmoji(icon)) {
    return (
      <div 
        className={`${containerSize} rounded-lg flex items-center justify-center ${emojiSize}`}
        style={{ backgroundColor: `${color || '#6366f1'}20` }}
      >
        {icon}
      </div>
    );
  }

  const IconComponent = iconMap[icon.toLowerCase()] || GraduationCap;
  return (
    <div 
      className={`${containerSize} rounded-lg flex items-center justify-center`}
      style={{ backgroundColor: `${color || '#6366f1'}20` }}
    >
      <IconComponent className={sizeClasses} style={{ color: color || '#6366f1' }} />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

interface AdminMaterialsContentProps {
  readonly role: 'ADMIN' | 'COLLABORATOR';
}

export default function AdminMaterialsContent({ role }: AdminMaterialsContentProps) {
  // Active tab: 'subjects', 'materials', or 'categories'
  const [activeTab, setActiveTab] = useState<'subjects' | 'materials' | 'categories'>('subjects');
  
  // Subject management
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  
  // Topics modal
  const [topicsModal, setTopicsModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
    subjectColor: string | null;
  }>({ isOpen: false, subjectId: '', subjectName: '', subjectColor: null });

  // Material management
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningMaterialId, setAssigningMaterialId] = useState<string | null>(null);
  
  // Edit material modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  
  // Group info modal
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'subject' | 'material';
    id: string;
    name: string;
  } | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<MaterialType | ''>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  
  // Multi-upload (unified for files and links)
  const [showMultiUpload, setShowMultiUpload] = useState(false);
  const [multiUploadFiles, setMultiUploadFiles] = useState<File[]>([]);
  const [multiUploadLinks, setMultiUploadLinks] = useState<Array<{ title: string; url: string }>>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [multiUploadProgress, setMultiUploadProgress] = useState<Record<string, number>>({});
  const [multiUploadData, setMultiUploadData] = useState({
    subjectId: '',
    topicId: '',      // Classification - Argomento
    subTopicId: '',   // Classification - Sotto-argomento
    categoryId: '',   // Container category (optional)
    type: 'PDF' as MaterialType,
  });

  // Form states
  const [materialFormData, setMaterialFormData] = useState({
    title: '',
    description: '',
    type: 'PDF' as MaterialType,
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    externalUrl: '',
    subjectId: '',
    topicId: '',       // Classification - Argomento
    subTopicId: '',    // Classification - Sotto-argomento
    categoryId: '',    // Container category (optional)
    tags: [] as string[],
  });

  // Assignment state (for modal)
  const [assignmentData, setAssignmentData] = useState({
    visibility: 'ALL_STUDENTS' as MaterialVisibility,
    groupIds: [] as string[],
    studentIds: [] as string[],
  });
  
  // User filter and search for assignment modal
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'students' | 'collaborators'>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');

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
  
  const { data: subjects, isLoading: subjectsLoading } = trpc.materials.getAllSubjects.useQuery();
  const { data: materials, isLoading: materialsLoading } = trpc.materials.getAll.useQuery({
    type: filterType || undefined,
    subjectId: filterSubject || undefined,
  });
  const { data: groupsData } = trpc.groups.getGroups.useQuery({ page: 1, pageSize: 100 });
  const { data: allStudents } = trpc.students.getAllForAdmin.useQuery();
  const { data: allCollaborators } = trpc.users.getCollaborators.useQuery();
  const { data: stats } = trpc.materials.getStats.useQuery();

  // Categories for material forms (standalone containers) - fetched but used for cache invalidation
  const { data: _allCategories } = trpc.materials.getAllCategories.useQuery();

  // Topics for the selected subject in material form
  const { data: formTopics } = trpc.materials.getTopics.useQuery(
    { subjectId: materialFormData.subjectId },
    { enabled: !!materialFormData.subjectId }
  );

  // Topics for multi-upload form
  const { data: multiFormTopics } = trpc.materials.getTopics.useQuery(
    { subjectId: multiUploadData.subjectId },
    { enabled: !!multiUploadData.subjectId }
  );

  // Topics for edit modal
  const { data: editModalTopics } = trpc.materials.getTopics.useQuery(
    { subjectId: editingMaterial?.subjectId || '' },
    { enabled: !!editingMaterial?.subjectId }
  );

  // Find selected topic to get its subtopics (for single form)
  const selectedTopic = formTopics?.find((t: { id: string }) => t.id === materialFormData.topicId) as {
    id: string;
    name: string;
    subTopics?: Array<{ id: string; name: string; difficulty: string }>;
  } | undefined;

  // Find selected topic for multi-upload
  const multiSelectedTopic = multiFormTopics?.find((t: { id: string }) => t.id === multiUploadData.topicId) as {
    id: string;
    name: string;
    subTopics?: Array<{ id: string; name: string; difficulty: string }>;
  } | undefined;

  // Find selected topic for edit modal
  const editModalSelectedTopic = editModalTopics?.find((t: { id: string }) => t.id === editingMaterial?.topicId) as {
    id: string;
    name: string;
    subTopics?: Array<{ id: string; name: string; difficulty: string }>;
  } | undefined;

  // ==================== SUBJECT MUTATIONS ====================

  const createSubjectMutation = trpc.materials.createSubject.useMutation({
    onSuccess: () => {
      utils.materials.getAllSubjects.invalidate();
      showSuccess('Materia creata', 'La nuova materia è stata aggiunta.');
      setShowSubjectModal(false);
      setEditingSubject(null);
    },
    onError: handleMutationError,
  });

  const updateSubjectMutation = trpc.materials.updateSubject.useMutation({
    onSuccess: () => {
      utils.materials.getAllSubjects.invalidate();
      showSuccess('Materia aggiornata', 'Le modifiche sono state salvate.');
      setShowSubjectModal(false);
      setEditingSubject(null);
    },
    onError: handleMutationError,
  });

  const deleteSubjectMutation = trpc.materials.deleteSubject.useMutation({
    onSuccess: () => {
      utils.materials.getAllSubjects.invalidate();
      showSuccess('Materia eliminata', 'La materia è stata rimossa.');
    },
    onError: handleMutationError,
  });

  // ==================== MATERIAL MUTATIONS ====================

  const createMaterialMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getStats.invalidate();
      showSuccess('Materiale creato', 'Il nuovo materiale è stato aggiunto.');
      resetMaterialForm();
    },
    onError: handleMutationError,
  });

  const updateMaterialMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      showSuccess('Materiale aggiornato', 'Le modifiche sono state salvate.');
      resetMultiUpload();
    },
    onError: handleMutationError,
  });

  const updateMaterialFromModalMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      showSuccess('Materiale aggiornato', 'Le modifiche sono state salvate.');
      setShowEditModal(false);
      setEditingMaterial(null);
    },
    onError: handleMutationError,
  });

  const deleteMaterialMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getStats.invalidate();
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

  // Batch upload mutation
  const createBatchMaterialsMutation = trpc.materials.createBatch.useMutation({
    onSuccess: (result) => {
      utils.materials.getAll.invalidate();
      utils.materials.getStats.invalidate();
      showSuccess('Materiali caricati', `${result.created} materiali sono stati creati con successo.`);
      resetMultiUpload();
    },
    onError: handleMutationError,
  });

  // ==================== MATERIAL HANDLERS ====================

  const handleSaveMaterialFromModal = (data: any) => {
    updateMaterialFromModalMutation.mutate(data);
  };

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
      topicId: '',
      subTopicId: '',
      categoryId: '',
      tags: [],
    });
    setShowMaterialForm(false);
    setEditingMaterialId(null);
  };

  const handleEditMaterial = (material: any) => {
    setEditingMaterial(material);
    setShowEditModal(true);
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

  // Multi-file upload handler
  const handleMultiFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setMultiUploadFiles(files);
    }
  };

  const handleMultiUpload = async () => {
    // If editing, use update mutation
    if (editingMaterialId) {
      const isLinkType = multiUploadData.type === 'LINK';
      const material = materials?.find((m: any) => m.id === editingMaterialId);
      
      // For editing, we keep existing file data unless new files are uploaded
      let fileData: any = {
        fileUrl: material?.fileUrl,
        fileName: material?.fileName,
        fileSize: material?.fileSize,
        externalUrl: material?.externalUrl,
      };

      // If user uploaded a new file, use it
      if (!isLinkType && multiUploadFiles.length > 0) {
        setUploading(true);
        try {
          const file = multiUploadFiles[0]; // Take first file for edit
          setMultiUploadProgress({ [file.name]: 0 });

          const { url } = await firebaseStorage.uploadMaterialFile(
            file,
            multiUploadData.type.toLowerCase(),
            (progress) => setMultiUploadProgress({ [file.name]: progress })
          );

          fileData = {
            fileUrl: url,
            fileName: file.name,
            fileSize: file.size,
          };
        } catch {
          showError('Errore caricamento', 'Si è verificato un errore durante il caricamento.');
          setUploading(false);
          return;
        }
      } else if (isLinkType && multiUploadLinks.length > 0) {
        fileData.externalUrl = multiUploadLinks[0].url;
      }

      // Update material
      updateMaterialMutation.mutate({
        id: editingMaterialId,
        type: multiUploadData.type,
        ...fileData,
        subjectId: multiUploadData.subjectId || undefined,
        topicId: multiUploadData.topicId || undefined,
        subTopicId: multiUploadData.subTopicId || undefined,
        categoryId: multiUploadData.categoryId || undefined,
      });
      
      setUploading(false);
      return;
    }

    // CREATION MODE: For LINK type, use multiUploadLinks; for others, use multiUploadFiles
    const isLinkType = multiUploadData.type === 'LINK';
    
    if (isLinkType && multiUploadLinks.length === 0) return;
    if (!isLinkType && multiUploadFiles.length === 0) return;

    setUploading(true);
    const uploadedMaterials: Array<{
      title: string;
      type: MaterialType;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      externalUrl?: string;
    }> = [];

    try {
      if (isLinkType) {
        // Handle links - no upload needed
        for (const link of multiUploadLinks) {
          uploadedMaterials.push({
            title: link.title,
            type: 'LINK',
            externalUrl: link.url,
          });
        }
      } else {
        // Handle files - upload to Firebase
        for (const file of multiUploadFiles) {
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension for title
          
          setMultiUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

          const { url } = await firebaseStorage.uploadMaterialFile(
            file,
            multiUploadData.type.toLowerCase(),
            (progress) => setMultiUploadProgress((prev) => ({ ...prev, [file.name]: progress }))
          );

          uploadedMaterials.push({
            title: fileName,
            type: multiUploadData.type,
            fileUrl: url,
            fileName: file.name,
            fileSize: file.size,
          });
        }
      }

      // Create all materials via batch mutation
      createBatchMaterialsMutation.mutate({
        files: uploadedMaterials,
        subjectId: multiUploadData.subjectId || undefined,
        topicId: multiUploadData.topicId || undefined,
        subTopicId: multiUploadData.subTopicId || undefined,
        categoryId: multiUploadData.categoryId || undefined,
        visibility: 'NONE', // Materials are not assigned by default, use "Gestisci destinatari" button
      });
    } catch {
      showError('Errore caricamento', 'Si è verificato un errore durante il caricamento.');
    } finally {
      setUploading(false);
      setMultiUploadProgress({});
    }
  };

  const resetMultiUpload = () => {
    setMultiUploadFiles([]);
    setMultiUploadLinks([]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setMultiUploadProgress({});
    setMultiUploadData({
      subjectId: '',
      topicId: '',
      subTopicId: '',
      categoryId: '',
      type: 'PDF',
    });
    setEditingMaterialId(null);
    setShowMultiUpload(false);
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
      categoryId: materialFormData.categoryId || undefined,
      subTopicId: materialFormData.subTopicId || undefined,
      tags: materialFormData.tags,
      visibility: 'ALL_STUDENTS' as const, // Default, will be changed via assignment modal
    };

    if (editingMaterialId) {
      updateMaterialMutation.mutate({ id: editingMaterialId, ...data });
    } else {
      createMaterialMutation.mutate(data);
    }
  };

  const openAssignModal = (materialId: string, material: any) => {
    setAssigningMaterialId(materialId);
    setAssignmentData({
      visibility: material.visibility ?? 'NONE', // Default to NONE if not set
      groupIds: material.groupAccess?.map((ga: any) => ga.groupId) || [],
      studentIds: material.studentAccess?.map((sa: any) => sa.studentId) || [],
    });
    setUserTypeFilter('all');
    setUserSearchTerm('');
    setShowAssignModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter materials based on search
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

  // ==================== SUBJECT HANDLERS ====================

  const handleEditSubject = (subject: any) => {
    setEditingSubject({
      id: subject.id,
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      color: subject.color || '#6366f1',
      icon: subject.icon || '',
      order: subject.order || 0,
    });
    setShowSubjectModal(true);
  };

  const handleCreateSubject = () => {
    setEditingSubject(null);
    setShowSubjectModal(true);
  };

  const handleSubjectSave = (data: SubjectFormData) => {
    if (editingSubject?.id) {
      updateSubjectMutation.mutate({
        id: editingSubject.id,
        ...data,
      });
    } else {
      createSubjectMutation.mutate(data);
    }
  };

  const handleSubjectModalClose = () => {
    setShowSubjectModal(false);
    setEditingSubject(null);
  };

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${colors.text.primary} flex items-center gap-3`}>
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Materie & Materiali
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            Gestisci materie, argomenti e materiali didattici
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Palette className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{subjects?.length || 0}</p>
                <p className={`text-sm ${colors.text.muted}`}>Materie</p>
              </div>
            </div>
          </div>
          <div className={`${colors.background.card} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text.primary}`}>{stats.totalMaterials}</p>
                <p className={`text-sm ${colors.text.muted}`}>Materiali</p>
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
        </div>
      )}

      {/* Tabs */}
      <div className={`${colors.background.card} rounded-xl shadow-sm`}>
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-5 py-4 font-medium text-sm flex items-center gap-2.5 border-b-2 transition-all rounded-t-lg ${
              activeTab === 'subjects'
                ? 'border-[#a8012b] text-[#a8012b] dark:text-[#d1163b] bg-red-50 dark:bg-red-950/30'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#a8012b] dark:hover:text-[#d1163b] hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === 'subjects' ? 'text-[#a8012b] dark:text-[#d1163b]' : ''}`} />
            Materie e Argomenti
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-5 py-4 font-medium text-sm flex items-center gap-2.5 border-b-2 transition-all rounded-t-lg ${
              activeTab === 'materials'
                ? 'border-[#a8012b] text-[#a8012b] dark:text-[#d1163b] bg-red-50 dark:bg-red-950/30'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#a8012b] dark:hover:text-[#d1163b] hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'materials' ? 'text-[#a8012b] dark:text-[#d1163b]' : ''}`} />
            Materiali
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-4 font-medium text-sm flex items-center gap-2.5 border-b-2 transition-all rounded-t-lg ${
              activeTab === 'categories'
                ? 'border-[#a8012b] text-[#a8012b] dark:text-[#d1163b] bg-red-50 dark:bg-red-950/30'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#a8012b] dark:hover:text-[#d1163b] hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Folder className={`w-5 h-5 ${activeTab === 'categories' ? 'text-[#a8012b] dark:text-[#d1163b]' : ''}`} />
            Cartelle
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* eslint-disable-next-line sonarjs/cognitive-complexity -- Tab switching IIFE for conditional rendering */}
          {(() => {
            if (activeTab === 'subjects') {
              return (
            <div className="space-y-6">
              {/* Add Subject Button */}
              <button
                onClick={handleCreateSubject}
                className="px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-[#a8012b] hover:text-[#a8012b] dark:hover:text-[#d1163b] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuova Materia
              </button>



              {/* Subjects List */}
              {(() => {
                if (subjectsLoading) {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  );
                }
                
                if ((subjects?.length ?? 0) === 0) {
                  return (
                    <div className="text-center py-12">
                      <Palette className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
                      <p className={`text-lg font-medium ${colors.text.primary}`}>Nessuna materia</p>
                      <p className={`mt-1 ${colors.text.secondary}`}>Crea la prima materia per organizzare i materiali</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className={`rounded-xl border ${colors.border.primary} overflow-hidden`}
                      >
                        {/* Subject Header */}
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <button
                            onClick={() => toggleSubject(subject.id)}
                          className="flex items-center gap-4 flex-1"
                        >
                          {expandedSubjects.has(subject.id) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <SubjectIcon icon={subject.icon} color={subject.color} />
                          <div className="text-left">
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
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${colors.background.secondary} ${colors.text.muted}`}>
                            {subject._count?.materials || 0} materiali
                          </span>
                          {/* Topics button - visible if user can edit this subject */}
                          {subject.canEdit && (
                            <button
                              onClick={() => setTopicsModal({
                                isOpen: true,
                                subjectId: subject.id,
                                subjectName: subject.name,
                                subjectColor: subject.color,
                              })}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                              title="Gestisci argomenti"
                            >
                              <List className="w-4 h-4 text-blue-500" />
                            </button>
                          )}
                          {/* Edit button - visible if user can edit this subject */}
                          {subject.canEdit && (
                            <button
                              onClick={() => handleEditSubject(subject)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              title="Modifica"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {/* Delete button - visible only for admins */}
                          {subject.canDelete && (
                            <button
                              onClick={() => setDeleteConfirm({
                                type: 'subject',
                                id: subject.id,
                                name: subject.name,
                              })}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Elimina"
                              disabled={(subject._count?.materials || 0) > 0}
                            >
                              <Trash2 className={`w-4 h-4 ${(subject._count?.materials || 0) > 0 ? 'text-gray-300 dark:text-gray-600' : 'text-red-500'}`} />
                            </button>
                          )}
                          {/* View only indicator for subjects user cannot edit */}
                          {!subject.canEdit && (
                            <button
                              onClick={() => toggleSubject(subject.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              title="Visualizza"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Topics Preview (when expanded) */}
                      {expandedSubjects.has(subject.id) && (
                        <SubjectTopicsPreview subjectId={subject.id} subjectColor={subject.color} />
                      )}
                    </div>
                  ))}
                </div>
              );
              })()}
            </div>
              );
            }
            
            if (activeTab === 'materials') {
              return (
            <div className="space-y-6">
              {/* Add Material Button - Unified */}
              {!showMultiUpload && (
                <button
                  onClick={() => setShowMultiUpload(true)}
                  className="px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-[#a8012b] hover:text-[#a8012b] dark:hover:text-[#d1163b] hover:bg-red-50 dark:hover:bg-red-950/30 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Aggiungi Materiali
                </button>
              )}

              {/* Unified Upload Form */}
              {showMultiUpload && (
                <div className={`p-6 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                  <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                    {editingMaterialId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingMaterialId ? 'Modifica Materiale' : 'Aggiungi Materiali'}
                  </h3>

                  <div className="space-y-4">
                    {/* Type and Classification - Move FIRST */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="multi-upload-type" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Tipo
                        </label>
                        <CustomSelect
                          id="multi-upload-type"
                          value={multiUploadData.type}
                          onChange={(value) => {
                            setMultiUploadData({ ...multiUploadData, type: value as MaterialType });
                            // Reset files when switching to LINK
                            if (value === 'LINK') {
                              setMultiUploadFiles([]);
                            }
                          }}
                          options={Object.entries(typeLabels).map(([key, label]) => ({ value: key, label }))}
                          placeholder="Tipo"
                        />
                      </div>
                      <div>
                        <label htmlFor="multi-upload-subject" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Materia
                        </label>
                        <CustomSelect
                          id="multi-upload-subject"
                          value={multiUploadData.subjectId}
                          onChange={(value) => setMultiUploadData({ 
                            ...multiUploadData, 
                            subjectId: value,
                            topicId: '',
                            subTopicId: ''
                          })}
                          options={[
                            { value: '', label: 'Nessuna' },
                            ...(subjects?.map((s) => ({ value: s.id, label: s.name })) || [])
                          ]}
                          placeholder="Materia"
                        />
                      </div>
                      <div>
                        <label htmlFor="multi-upload-topic" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Argomento
                        </label>
                        <CustomSelect
                          id="multi-upload-topic"
                          value={multiUploadData.topicId}
                          onChange={(value) => setMultiUploadData({ 
                            ...multiUploadData, 
                            topicId: value,
                            subTopicId: ''
                          })}
                          options={[
                            { value: '', label: 'Nessuno' },
                            ...((multiFormTopics as Array<{ id: string; name: string }> | undefined)?.map((c) => ({ 
                              value: c.id, 
                              label: c.name 
                            })) || [])
                          ]}
                          placeholder="Argomento"
                          disabled={!multiUploadData.subjectId}
                        />
                      </div>
                      <div>
                        <label htmlFor="multi-upload-subtopic" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Sottoargomento
                        </label>
                        <CustomSelect
                          id="multi-upload-subtopic"
                          value={multiUploadData.subTopicId}
                          onChange={(value) => setMultiUploadData({ ...multiUploadData, subTopicId: value })}
                          options={[
                            { value: '', label: 'Nessuno' },
                            ...(multiSelectedTopic?.subTopics?.map((sc) => ({ 
                              value: sc.id, 
                              label: sc.name 
                            })) || [])
                          ]}
                          placeholder="Sottoargomento"
                          disabled={!multiUploadData.topicId}
                        />
                      </div>
                    </div>

                    {/* Category Assignment (Optional Container) */}
                    <div>
                      <label htmlFor="multi-upload-category" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Cartella{' '}
                        <span className={`ml-2 text-xs ${colors.text.muted} font-normal`}>Opzionale - Raggruppa i materiali in una cartella</span>
                      </label>
                      <CustomSelect
                        id="multi-upload-category"
                        value={multiUploadData.categoryId}
                        onChange={(value) => setMultiUploadData({ ...multiUploadData, categoryId: value })}
                        options={[
                          { value: '', label: 'Nessuna cartella' },
                          ...(_allCategories?.map((cat: any) => ({ 
                            value: cat.id, 
                            label: `${cat.name} (${cat._count?.materials || 0} materiali)` 
                          })) || [])
                        ]}
                        placeholder="Seleziona una cartella..."
                      />
                      {multiUploadData.categoryId && _allCategories?.find((c: any) => c.id === multiUploadData.categoryId) && (() => {
                        const selectedCategory = _allCategories.find((c: any) => c.id === multiUploadData.categoryId);
                        const categoryMaterials = materials?.filter((m: any) => m.categoryId === multiUploadData.categoryId) || [];
                        
                        return (
                          <div className={`mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30`}>
                            <div className="flex items-start gap-2">
                              <Folder className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                              <div className="flex-1">
                                <p className={`text-sm font-medium text-gray-900 dark:text-gray-100`}>
                                  {selectedCategory?.name}
                                </p>
                                <p className={`text-xs text-gray-600 dark:text-gray-400 mt-1`}>
                                  {selectedCategory?.description || 'Nessuna descrizione'}
                                </p>
                                <p className={`text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium`}>
                                  📁 {categoryMaterials.length} materiali già presenti
                                </p>
                                {categoryMaterials.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {categoryMaterials.slice(0, 5).map((mat: any) => (
                                      <div key={mat.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                        <FileText className="w-3 h-3 text-gray-400" />
                                        <span className="truncate">{mat.title}</span>
                                        <span className="text-gray-400">({mat.type})</span>
                                      </div>
                                    ))}
                                    {categoryMaterials.length > 5 && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                        ...e altri {categoryMaterials.length - 5} materiali
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* File Selection or Link Input */}
                    {multiUploadData.type === 'LINK' ? (
                      <div>
                        <label htmlFor="multi-upload-links" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Link Esterni
                        </label>
                        
                        {/* Existing links */}
                        {multiUploadLinks.length > 0 && (
                          <div className={`rounded-lg border ${colors.border.primary} ${colors.background.input} p-4 space-y-2 mb-4`}>
                            {multiUploadLinks.map((link, index) => (
                              <div key={`${link.url}-${link.title}`} className="flex items-center gap-3">
                                <LinkIcon className="w-5 h-5 text-indigo-500" />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${colors.text.primary} truncate`}>{link.title}</p>
                                  <p className={`text-xs ${colors.text.muted} truncate`}>{link.url}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setMultiUploadLinks(multiUploadLinks.filter((_, i) => i !== index))}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  <X className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add new link form */}
                        <div className={`p-4 rounded-lg border ${colors.border.primary} ${colors.background.input} space-y-3`}>
                          <div>
                            <label htmlFor="new-link-title" className={`block text-xs font-medium ${colors.text.muted} mb-1`}>
                              Titolo
                            </label>
                            <input
                              id="new-link-title"
                              type="text"
                              value={newLinkTitle}
                              onChange={(e) => setNewLinkTitle(e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.primary} text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                              placeholder="Es: Video lezione introduttiva"
                            />
                          </div>
                          <div>
                            <label htmlFor="new-link-url" className={`block text-xs font-medium ${colors.text.muted} mb-1`}>
                              URL
                            </label>
                            <input
                              id="new-link-url"
                              type="url"
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border ${colors.border.primary} ${colors.background.secondary} ${colors.text.primary} text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                              placeholder="https://..."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (newLinkTitle.trim() && newLinkUrl.trim()) {
                                setMultiUploadLinks([...multiUploadLinks, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
                                setNewLinkTitle('');
                                setNewLinkUrl('');
                              }
                            }}
                            disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                            className={`w-full py-2 text-sm font-medium rounded-lg ${colors.primary.bg} text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                          >
                            <Plus className="w-4 h-4" />
                            Aggiungi Link
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          {editingMaterialId ? 'File Attuale (carica nuovo per sostituire)' : 'Seleziona File'} {!editingMaterialId && <span className="text-red-500">*</span>}
                        </label>
                        
                        {/* Show existing file info when editing */}
                        {editingMaterialId && (() => {
                          const material = materials?.find((m: any) => m.id === editingMaterialId);
                          return material?.fileName ? (
                            <div className={`rounded-lg border ${colors.border.primary} ${colors.background.input} p-4 mb-4`}>
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${colors.text.primary}`}>{material.fileName}</p>
                                  <p className={`text-xs ${colors.text.muted}`}>
                                    {material.fileSize ? formatFileSize(material.fileSize) : 'N/A'}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${colors.background.secondary} ${colors.text.muted}`}>
                                  File corrente
                                </span>
                              </div>
                            </div>
                          ) : null;
                        })()}
                        
                        <input
                          ref={multiFileInputRef}
                          type="file"
                          multiple={!editingMaterialId}
                          onChange={handleMultiFileSelect}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.avi"
                          className="hidden"
                        />
                        {multiUploadFiles.length > 0 ? (
                          <div className={`rounded-lg border ${colors.border.primary} ${colors.background.input} p-4 space-y-2`}>
                            {multiUploadFiles.map((file) => (
                              <div key={file.name} className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className={`flex-1 text-sm ${colors.text.primary} truncate`}>{file.name}</span>
                                <span className={`text-xs ${colors.text.muted}`}>
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </span>
                                {multiUploadProgress[file.name] !== undefined && (
                                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-600 transition-all duration-300"
                                      style={{ width: `${multiUploadProgress[file.name]}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => multiFileInputRef.current?.click()}
                              className={`mt-2 text-sm ${colors.text.muted} hover:text-indigo-600 flex items-center gap-1`}
                            >
                              <Plus className="w-4 h-4" />
                              Aggiungi altri file
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => multiFileInputRef.current?.click()}
                            className={`w-full p-8 border-2 border-dashed ${colors.border.primary} rounded-xl hover:border-indigo-400 transition-colors flex flex-col items-center gap-2 ${colors.text.muted}`}
                          >
                            <Upload className="w-10 h-10" />
                            <span>{editingMaterialId ? 'Clicca per caricare un nuovo file' : 'Clicca per selezionare file'}</span>
                            <span className="text-xs">{editingMaterialId ? 'Il file corrente verrà sostituito' : 'Puoi selezionare più file contemporaneamente'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={resetMultiUpload}
                        className={`px-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.text.secondary} hover:bg-gray-50 dark:hover:bg-gray-700`}
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={handleMultiUpload}
                        disabled={(() => {
                          if (editingMaterialId) {
                            return uploading || updateMaterialMutation.isPending;
                          }
                          const hasContent = multiUploadData.type === 'LINK' 
                            ? multiUploadLinks.length > 0 
                            : multiUploadFiles.length > 0;
                          return !hasContent || uploading || createBatchMaterialsMutation.isPending;
                        })()}
                        className={`px-6 py-2.5 ${editingMaterialId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50`}
                      >
                        {(() => {
                          if (uploading || createBatchMaterialsMutation.isPending || updateMaterialMutation.isPending) {
                            return (
                              <>
                                <Spinner size="xs" variant="white" />
                                {editingMaterialId ? 'Salvataggio...' : 'Caricamento...'}
                              </>
                            );
                          }
                          
                          if (editingMaterialId) {
                            return (
                              <>
                                <Save className="w-4 h-4" />
                                Salva Modifiche
                              </>
                            );
                          }
                          
                          const count = multiUploadData.type === 'LINK' ? multiUploadLinks.length : multiUploadFiles.length;
                          const label = multiUploadData.type === 'LINK' ? 'link' : 'file';
                          return (
                            <>
                              <Upload className="w-4 h-4" />
                              Carica {count} {label}
                            </>
                          );
                        })()}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Form */}
              {showMaterialForm && (
                <div className={`p-6 rounded-xl border ${colors.border.primary} ${colors.background.secondary}`}>
                  <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4 flex items-center gap-2`}>
                    {editingMaterialId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingMaterialId ? 'Modifica Materiale' : 'Nuovo Materiale'}
                  </h3>

                  <form onSubmit={handleMaterialSubmit} className="space-y-6">
                    {/* Title & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="material-title" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Titolo <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="material-title"
                          type="text"
                          value={materialFormData.title}
                          onChange={(e) => setMaterialFormData({ ...materialFormData, title: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                          placeholder="Es: Introduzione alla Biologia Cellulare"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="material-type" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Tipo <span className="text-red-500">*</span>
                        </label>
                        <CustomSelect
                          id="material-type"
                          value={materialFormData.type}
                          onChange={(value) => setMaterialFormData({ ...materialFormData, type: value as MaterialType })}
                          options={Object.entries(typeLabels).map(([key, label]) => ({ value: key, label }))}
                          placeholder="Seleziona tipo"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="material-description" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                        Descrizione
                      </label>
                      <textarea
                        id="material-description"
                        value={materialFormData.description}
                        onChange={(e) => setMaterialFormData({ ...materialFormData, description: e.target.value })}
                        rows={3}
                        className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                        placeholder="Descrivi brevemente il contenuto..."
                      />
                    </div>

                    {/* File Upload / URL */}
                    {(materialFormData.type === 'PDF' || materialFormData.type === 'VIDEO' || materialFormData.type === 'DOCUMENT') && (
                      <div>
                        <label htmlFor="material-file" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Carica File
                        </label>
                        <input
                          id="material-file"
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          accept={(() => {
                            if (materialFormData.type === 'PDF') return '.pdf';
                            if (materialFormData.type === 'VIDEO') return 'video/*';
                            return '*';
                          })()}
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
                            className={`w-full p-6 border-2 border-dashed ${colors.border.primary} rounded-xl hover:border-indigo-400 transition-colors flex flex-col items-center gap-2 ${colors.text.muted}`}
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
                        <label htmlFor="material-external-url" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          URL Esterno <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="material-external-url"
                          type="url"
                          value={materialFormData.externalUrl}
                          onChange={(e) => setMaterialFormData({ ...materialFormData, externalUrl: e.target.value })}
                          className={`w-full px-4 py-3 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                          placeholder="https://example.com/video"
                          required={materialFormData.type === 'LINK'}
                        />
                      </div>
                    )}

                    {/* Hierarchical Selection: Subject > Category > SubCategory */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Subject */}
                      <div>
                        <label htmlFor="material-subject" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Materia
                        </label>
                        <CustomSelect
                          id="material-subject"
                          value={materialFormData.subjectId}
                          onChange={(value) => setMaterialFormData({ 
                            ...materialFormData, 
                            subjectId: value,
                            categoryId: '', // Reset category when subject changes
                            subTopicId: '' // Reset subcategory
                          })}
                          options={[
                            { value: '', label: 'Nessuna materia' },
                            ...(subjects?.map((s) => ({ value: s.id, label: s.name })) || [])
                          ]}
                          placeholder="Seleziona materia..."
                          searchable
                        />
                      </div>

                      {/* Topic */}
                      <div>
                        <label htmlFor="material-topic" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Argomento
                        </label>
                        <CustomSelect
                          id="material-topic"
                          value={materialFormData.categoryId}
                          onChange={(value) => setMaterialFormData({ 
                            ...materialFormData, 
                            categoryId: value,
                            subTopicId: '' // Reset subtopic when topic changes
                          })}
                          options={[
                            { value: '', label: 'Nessuno' },
                            ...((formTopics as Array<{ id: string; name: string }> | undefined)?.map((c) => ({ 
                              value: c.id, 
                              label: c.name 
                            })) || [])
                          ]}
                          placeholder={materialFormData.subjectId ? "Seleziona argomento..." : "Prima seleziona materia"}
                          disabled={!materialFormData.subjectId}
                        />
                      </div>

                      {/* SubTopic */}
                      <div>
                        <label htmlFor="material-subtopic" className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                          Sottoargomento
                        </label>
                        <CustomSelect
                          id="material-subtopic"
                          value={materialFormData.subTopicId}
                          onChange={(value) => setMaterialFormData({ ...materialFormData, subTopicId: value })}
                          options={[
                            { value: '', label: 'Nessuno' },
                            ...(selectedTopic?.subTopics?.map((sc) => {
                              const getDifficultyLabel = (difficulty: string): string => {
                                if (difficulty === 'EASY') return 'Facile';
                                if (difficulty === 'MEDIUM') return 'Medio';
                                return 'Difficile';
                              };
                              return { 
                                value: sc.id, 
                                label: `${sc.name} (${getDifficultyLabel(sc.difficulty)})` 
                              };
                            }) || [])
                          ]}
                          placeholder={materialFormData.categoryId ? "Seleziona sottoargomento..." : "Prima seleziona argomento"}
                          disabled={!materialFormData.categoryId}
                        />
                      </div>
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
                        className={`px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50`}
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.text.muted}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca materiali..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${colors.border.primary} ${colors.background.input} ${colors.text.primary} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
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
              {(() => {
                if (materialsLoading) {
                  return (
                    <div className="flex items-center justify-center py-12">
                      <Spinner size="lg" />
                    </div>
                  );
                }
                
                if ((filteredMaterials?.length ?? 0) === 0) {
                  return (
                    <div className="text-center py-12">
                      <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${colors.text.muted}`} />
                      <p className={`text-lg font-medium ${colors.text.primary}`}>Nessun materiale</p>
                      <p className={`mt-1 ${colors.text.secondary}`}>Clicca su &quot;Nuovo Materiale&quot; per iniziare</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {filteredMaterials.map((material: any) => {
                    const TypeIcon = typeIcons[material.type as MaterialType] || File;
                    const VisIcon = visibilityIcons[material.visibility as MaterialVisibility] || EyeOff;
                    const groups = material.groupAccess?.map((ga: any) => ga.group).filter(Boolean) || [];
                    const students = material.studentAccess?.map((sa: any) => sa.student).filter(Boolean) || [];
                    const hasAssignments = groups.length > 0 || students.length > 0;

                    return (
                      <div
                        key={material.id}
                        className={`p-5 rounded-xl border ${colors.border.primary} hover:shadow-lg transition-all ${colors.background.card}`}
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${materialTypeBgColors[material.type as MaterialType] || materialTypeBgColors.DOCUMENT}`}>
                              <TypeIcon className={`w-6 h-6 ${materialTypeTextColors[material.type as MaterialType] || materialTypeTextColors.DOCUMENT}`} />
                            </div>

                            {/* Title and Description */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-lg text-gray-900 dark:text-gray-100 truncate`}>
                                {material.title}
                              </h3>
                              {material.description && (
                                <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2`}>
                                  {material.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => openAssignModal(material.id, material)}
                              className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="Gestisci destinatari"
                            >
                              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </button>
                            {(material.fileUrl || material.externalUrl) && (
                              <a
                                href={material.fileUrl || material.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Apri"
                              >
                                <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              </a>
                            )}
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Modifica"
                            >
                              <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({
                                type: 'material',
                                id: material.id,
                                name: material.title,
                              })}
                              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* Info Row */}
                        <div className="flex items-center flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          {/* Subject Badge */}
                          {material.subject && (
                            (() => {
                              const bgColor = material.subject.color ? `${material.subject.color}15` : 'rgb(243 244 246)';
                              const textColor = material.subject.color || 'rgb(107 114 128)';
                              const borderColor = material.subject.color ? `${material.subject.color}30` : 'rgb(229 231 235)';
                              return (
                                <span 
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                  style={{
                                    backgroundColor: bgColor,
                                    color: textColor,
                                    border: `1px solid ${borderColor}`
                                  }}
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  {material.subject.name}
                                </span>
                              );
                            })()
                          )}

                          {/* Category Badges (Multiple) */}
                          {material.categories && material.categories.length > 0 && (
                            <>
                              {material.categories.map((cat: any) => (
                                <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                                  <Folder className="w-3.5 h-3.5" />
                                  {cat.category?.name || 'Cartella'}
                                </span>
                              ))}
                            </>
                          )}

                          {/* Visibility Badge */}
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${(() => {
                            if (material.visibility === 'NONE') {
                              return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
                            }
                            if (material.visibility === 'ALL_STUDENTS') {
                              return 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30';
                            }
                            return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30';
                          })()}`}>
                            <VisIcon className="w-3.5 h-3.5" />
                            {visibilityLabels[material.visibility as MaterialVisibility]}
                          </span>

                          {/* Warning if no assignments for SELECTED_STUDENTS */}
                          {material.visibility === 'SELECTED_STUDENTS' && !hasAssignments && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Nessun assegnatario
                            </span>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-3 ml-auto text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <Eye className="w-3.5 h-3.5" />
                              {material.viewCount}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <Download className="w-3.5 h-3.5" />
                              {material.downloadCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
              })()}
            </div>
              );
            }
            
            // Categories Tab
            return <CategoryManager onClose={() => setActiveTab('materials')} role={role} />;
          })()}
        </div>
      </div>

      {/* Assignment Modal - Using Portal */}
      {showAssignModal && assigningMaterialId && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <dialog 
            open
            className={`${colors.background.card} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col m-0`}
            aria-labelledby="assign-modal-title"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 id="assign-modal-title" className={`text-xl font-semibold ${colors.text.primary} flex items-center gap-2`}>
                <Users className="w-5 h-5 text-indigo-600" />
                Gestisci Destinatari
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
              {/* Visibility Selection */}
              <fieldset className="border-0 p-0 m-0">
                <legend className={`block text-sm font-medium ${colors.text.primary} mb-3`}>
                  Visibilità base
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAssignmentData({ ...assignmentData, visibility: 'NONE' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      assignmentData.visibility === 'NONE'
                        ? 'border-gray-500 dark:border-gray-400 bg-gray-100 dark:bg-gray-700'
                        : `${colors.border.primary} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    <EyeOff className={`w-6 h-6 ${assignmentData.visibility === 'NONE' ? 'text-gray-700 dark:text-gray-200' : colors.text.muted}`} />
                    <span className={`text-sm font-medium ${assignmentData.visibility === 'NONE' ? 'text-gray-700 dark:text-gray-200' : colors.text.secondary}`}>
                      Nessuno
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentData({ ...assignmentData, visibility: 'ALL_STUDENTS' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      assignmentData.visibility === 'ALL_STUDENTS'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : `${colors.border.primary} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    <Globe className={`w-6 h-6 ${assignmentData.visibility === 'ALL_STUDENTS' ? 'text-indigo-600' : colors.text.muted}`} />
                    <span className={`text-sm font-medium ${assignmentData.visibility === 'ALL_STUDENTS' ? 'text-indigo-600' : colors.text.secondary}`}>
                      Tutti gli studenti
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentData({ ...assignmentData, visibility: 'SELECTED_STUDENTS' })}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      assignmentData.visibility === 'SELECTED_STUDENTS'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : `${colors.border.primary} hover:border-gray-300 dark:hover:border-gray-600`
                    }`}
                  >
                    <UserCheck className={`w-6 h-6 ${assignmentData.visibility === 'SELECTED_STUDENTS' ? 'text-indigo-600' : colors.text.muted}`} />
                    <span className={`text-sm font-medium ${assignmentData.visibility === 'SELECTED_STUDENTS' ? 'text-indigo-600' : colors.text.secondary}`}>
                      Gruppi / Utenti specifici
                    </span>
                  </button>
                </div>
              </fieldset>

              {/* Groups and Students selection - shown only when SELECTED_STUDENTS */}
              {assignmentData.visibility === 'SELECTED_STUDENTS' && (
                <>
                  {/* Group Selection */}
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-2 flex items-center gap-2`}>
                      <Users className="w-4 h-4 text-indigo-600" />
                      Seleziona Gruppi
                      {assignmentData.groupIds.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full">
                          {assignmentData.groupIds.length} selezionati
                        </span>
                      )}
                    </label>
                    <div className={`rounded-xl border ${colors.border.primary} max-h-48 overflow-y-auto`}>
                      {groupsData?.groups?.length ? groupsData.groups.map((group) => {
                        const isChecked = assignmentData.groupIds.includes(group.id);
                        return (
                          <label
                            key={group.id}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                              isChecked ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isChecked ? 'bg-indigo-600 border-indigo-600' : colors.border.primary
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
                              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="Vedi membri del gruppo"
                            >
                              <Info className="w-4 h-4 text-indigo-500" />
                            </button>
                          </label>
                        );
                      }) : (
                        <div className="px-4 py-6 text-center">
                          <p className={`text-sm ${colors.text.muted}`}>Nessun gruppo disponibile</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Selection (Students + Collaborators) */}
                  <div>
                    <label className={`block text-sm font-medium ${colors.text.primary} mb-2 flex items-center gap-2`}>
                      <User className="w-4 h-4 text-indigo-600" />
                      Seleziona Utenti
                      {assignmentData.studentIds.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full">
                          {assignmentData.studentIds.length} selezionati
                        </span>
                      )}
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
                    
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                      {(() => {
                        // Combine students and collaborators into a single list
                        const users: Array<{ id: string; name: string; type: 'student' | 'collaborator' }> = [];
                        
                        if (userTypeFilter === 'all' || userTypeFilter === 'students') {
                          allStudents?.forEach((student) => {
                            const studentId = student.student?.id || student.id;
                            if (studentId) {
                              users.push({
                                id: studentId,
                                name: student.name,
                                type: 'student',
                              });
                            }
                          });
                        }
                        
                        if (userTypeFilter === 'all' || userTypeFilter === 'collaborators') {
                          allCollaborators?.forEach((collaborator) => {
                            users.push({
                              id: collaborator.id,
                              name: collaborator.name,
                              type: 'collaborator',
                            });
                          });
                        }
                        
                        if (users.length === 0) {
                          return <p className={`text-sm ${colors.text.muted}`}>Nessun utente disponibile</p>;
                        }
                        
                        const filtered = users.filter(user =>
                          user.name.toLowerCase().includes(userSearchTerm.toLowerCase())
                        );
                        
                        if (filtered.length === 0) {
                          return <p className={`text-sm ${colors.text.muted}`}>Nessun utente trovato</p>;
                        }
                        
                        return filtered.map((user) => {
                          const isSelected = assignmentData.studentIds.includes(user.id);
                          const getUserBadgeStyles = (): string => {
                            if (isSelected) return 'bg-white/20 text-white';
                            if (user.type === 'student') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
                          };
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
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getUserBadgeStyles()}`}>
                                {user.type === 'student' ? 'S' : 'C'}
                              </span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </>
              )}
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
                  // Use the visibility from assignmentData directly
                  let visibility: MaterialVisibility = assignmentData.visibility;
                  
                  // Only auto-detect visibility for SELECTED_STUDENTS mode
                  if (assignmentData.visibility === 'SELECTED_STUDENTS') {
                    if (assignmentData.groupIds.length > 0 && assignmentData.studentIds.length > 0) {
                      // Both groups and individual students selected
                      visibility = 'SELECTED_STUDENTS';
                    } else if (assignmentData.groupIds.length > 0) {
                      visibility = 'GROUP_BASED';
                    } else if (assignmentData.studentIds.length > 0) {
                      visibility = 'SELECTED_STUDENTS';
                    } else {
                      // Nothing selected in SELECTED_STUDENTS mode, default to NONE
                      visibility = 'NONE';
                    }
                  }
                  
                  updateAssignmentsMutation.mutate({
                    id: assigningMaterialId,
                    visibility,
                    groupIds: visibility === 'SELECTED_STUDENTS' || visibility === 'GROUP_BASED' ? assignmentData.groupIds : [],
                    studentIds: visibility === 'SELECTED_STUDENTS' ? assignmentData.studentIds : [],
                  });
                }}
                disabled={updateAssignmentsMutation.isPending}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
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
          </dialog>
        </div>,
        document.body
      )}

      {/* Subject Edit Modal */}
      <SubjectEditModal
        isOpen={showSubjectModal}
        onClose={handleSubjectModalClose}
        subject={editingSubject}
        onSave={handleSubjectSave}
        isLoading={createSubjectMutation.isPending || updateSubjectMutation.isPending}
      />

      {/* Topics Manager Modal */}
      <TopicsManager
        isOpen={topicsModal.isOpen}
        onClose={() => setTopicsModal({ isOpen: false, subjectId: '', subjectName: '', subjectColor: null })}
        subjectId={topicsModal.subjectId}
        subjectName={topicsModal.subjectName}
        subjectColor={topicsModal.subjectColor}
      />

      {/* Group Info Modal */}
      {selectedGroupInfo && (
        <GroupInfoModal
          groupId={selectedGroupInfo}
          isOpen={true}
          onClose={() => setSelectedGroupInfo(null)}
        />
      )}

      {/* Edit Material Modal */}
      {editingMaterial && (
        <EditMaterialModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingMaterial(null);
          }}
          material={editingMaterial}
          subjects={subjects || []}
          topics={editModalTopics || []}
          selectedTopic={editModalSelectedTopic}
          categories={_allCategories || []}
          onSave={handleSaveMaterialFromModal}
          isLoading={updateMaterialFromModalMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            if (deleteConfirm.type === 'subject') {
              deleteSubjectMutation.mutate({ id: deleteConfirm.id });
            } else {
              deleteMaterialMutation.mutate({ id: deleteConfirm.id });
            }
            setDeleteConfirm(null);
          }
        }}
        title={deleteConfirm?.type === 'subject' ? 'Elimina materia' : 'Elimina materiale'}
        message={
          deleteConfirm?.type === 'subject'
            ? `Sei sicuro di voler eliminare la materia "${deleteConfirm?.name}"?\n\nQuesta azione non può essere annullata.`
            : `Sei sicuro di voler eliminare il materiale "${deleteConfirm?.name}"?\n\nQuesta azione non può essere annullata.`
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={deleteSubjectMutation.isPending || deleteMaterialMutation.isPending}
      />
    </div>
  );
}

// ==================== SUBJECT TOPICS PREVIEW COMPONENT ====================

interface SubjectTopicsPreviewProps {
  readonly subjectId: string;
  readonly subjectColor?: string | null;
}

function SubjectTopicsPreview({ subjectId, subjectColor }: SubjectTopicsPreviewProps) {
  const { data: topics, isLoading } = trpc.materials.getTopics.useQuery({ 
    subjectId, 
    includeInactive: false 
  });

  if (isLoading) {
    return (
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" />
          Caricamento argomenti...
        </div>
      </div>
    );
  }

  if (!topics?.length) {
    return (
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <p className={`text-sm ${colors.text.muted} italic`}>
          Nessun argomento. Clicca su &quot;Gestisci argomenti&quot; per aggiungerne.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
      <p className={`text-xs font-medium uppercase tracking-wide ${colors.text.muted} mb-3`}>
        Argomenti ({topics.length})
      </p>
      {topics.map((topic) => (
        <div key={topic.id} className="ml-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: subjectColor || '#6366f1' }}
            />
            <span className={`text-sm font-medium ${colors.text.primary}`}>{topic.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[topic.difficulty as DifficultyLevel].bg} ${difficultyColors[topic.difficulty as DifficultyLevel].text}`}>
              {difficultyLabels[topic.difficulty as DifficultyLevel]}
            </span>
            {topic.subTopics && topic.subTopics.length > 0 && (
              <span className={`text-xs ${colors.text.muted}`}>
                ({topic.subTopics.length} sotto-argomenti)
              </span>
            )}
          </div>
          {/* Sub-topics */}
          {topic.subTopics && topic.subTopics.length > 0 && (
            <div className="ml-6 mt-1 space-y-1">
              {topic.subTopics.map((subTopic) => (
                <div key={subTopic.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className={`text-xs ${colors.text.secondary}`}>{subTopic.name}</span>
                  <span className={`text-xs px-1 py-0.5 rounded ${difficultyColors[subTopic.difficulty as DifficultyLevel].bg} ${difficultyColors[subTopic.difficulty as DifficultyLevel].text}`}>
                    {difficultyLabels[subTopic.difficulty as DifficultyLevel]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
