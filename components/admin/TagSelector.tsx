'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { Tag, X, ChevronDown, Search, Check } from 'lucide-react';

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

interface TagOption {
  id?: string;
  name?: string;
  color?: string | null;
  category?: {
    id?: string;
    name?: string;
    color?: string | null;
  } | null;
}

export default function TagSelector({
  selectedTagIds,
  onChange,
  disabled = false,
  placeholder = 'Seleziona tag...',
  maxTags,
  className = '',
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all active tags
  const { data: tagsData, isLoading, refetch: refetchTags } = trpc.questionTags.getTags.useQuery({
    includeInactive: false,
    pageSize: 200, // Max allowed by schema
  });

  // Fetch categories for grouping
  const { data: categoriesData, refetch: refetchCategories } = trpc.questionTags.getCategories.useQuery({
    includeInactive: false,
  });

  const tags = useMemo(() => tagsData?.tags ?? [], [tagsData]);
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);

  // Get selected tags with their data
  const selectedTags = useMemo(() => {
    return selectedTagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [selectedTagIds, tags]);

  // Group tags by category
  const groupedTags = useMemo(() => {
    const filtered = tags.filter(
      (tag) =>
        !searchTerm ||
        tag.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups = new Map<string | null, TagOption[]>();
    
    // Initialize uncategorized group first
    groups.set(null, []);
    
    // Initialize groups with categories
    categories.forEach((cat) => {
      if (cat.id) groups.set(cat.id, []);
    });

    // Distribute tags - if category not found, put in uncategorized
    filtered.forEach((tag) => {
      const catId = tag.categoryId ?? null;
      // Check if category exists in our loaded categories, otherwise use uncategorized
      const targetCatId = (catId && groups.has(catId)) ? catId : null;
      const group = groups.get(targetCatId)!;
      group.push({
        id: tag.id!,
        name: tag.name!,
        color: tag.color,
        category: tag.category
          ? { id: tag.category.id!, name: tag.category.name!, color: tag.category.color }
          : null,
      });
    });

    return groups;
  }, [tags, categories, searchTerm]);

  // Refetch data when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetchTags();
      refetchCategories();
    }
  }, [isOpen, refetchTags, refetchCategories]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleTag = useCallback(
    (tagId: string) => {
      if (selectedTagIds.includes(tagId)) {
        onChange(selectedTagIds.filter((id) => id !== tagId));
      } else {
        if (maxTags && selectedTagIds.length >= maxTags) return;
        onChange([...selectedTagIds, tagId]);
      }
    },
    [selectedTagIds, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(selectedTagIds.filter((id) => id !== tagId));
    },
    [selectedTagIds, onChange]
  );

  const getTagColor = (tag: TagOption) => {
    return tag.color || tag.category?.color || '#6366f1';
  };

  const getCategoryName = (catId: string | null) => {
    if (!catId) return 'Senza categoria';
    const cat = categories.find((c) => c.id === catId);
    return cat?.name || 'Categoria';
  };

  const getCategoryColor = (catId: string | null) => {
    if (!catId) return '#6b7280';
    const cat = categories.find((c) => c.id === catId);
    return cat?.color || '#6366f1';
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selected Tags Display & Toggle Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          min-h-[44px] w-full px-3 py-2 rounded-lg border cursor-pointer
          flex flex-wrap items-center gap-2
          ${colors.border.primary} ${colors.background.input}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#a8012b]/50'}
          ${isOpen ? 'ring-2 ring-[#a8012b]/20 border-[#a8012b]' : ''}
          transition-all
        `}
      >
        {/* Selected Tags */}
        {selectedTags.length === 0 ? (
          <span className={`${colors.text.muted} text-sm`}>{placeholder}</span>
        ) : (
          selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: getTagColor(tag) }}
            >
              <Tag className="w-3 h-3" />
              {tag.name}
              {!disabled && (
                <button
                  onClick={(e) => removeTag(tag.id!, e)}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}

        {/* Dropdown Arrow */}
        <div className="ml-auto flex items-center gap-1">
          {maxTags && (
            <span className={`text-xs ${colors.text.muted}`}>
              {selectedTagIds.length}/{maxTags}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 ${colors.text.muted} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1 w-full max-h-[320px] overflow-hidden
            rounded-lg border shadow-lg
            ${colors.border.primary} ${colors.background.card}
          `}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.text.muted}`} />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca tag..."
                className={`
                  w-full pl-9 pr-3 py-2 text-sm rounded-md border
                  ${colors.border.primary} ${colors.background.input} ${colors.text.primary}
                  focus:outline-none focus:ring-1 focus:ring-[#a8012b]
                `}
              />
            </div>
          </div>

          {/* Tags List */}
          <div className="max-h-[250px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner size="sm" />
              </div>
            ) : (
              <>
                {Array.from(groupedTags.entries()).map(([catId, catTags]) => {
                  if (catTags.length === 0) return null;

                  return (
                    <div key={catId ?? 'uncategorized'}>
                      {/* Category Header */}
                      <div
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: `${getCategoryColor(catId)}15`,
                          color: getCategoryColor(catId),
                        }}
                      >
                        {getCategoryName(catId)}
                      </div>

                      {/* Tags in Category */}
                      {catTags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        const isDisabled = maxTags && !isSelected && selectedTagIds.length >= maxTags;

                        return (
                          <button
                            key={tag.id}
                            onClick={() => !isDisabled && toggleTag(tag.id)}
                            disabled={!!isDisabled}
                            className={`
                              w-full px-3 py-2 flex items-center gap-2 text-left text-sm
                              transition-colors
                              ${isSelected 
                                ? 'bg-[#a8012b]/10 text-[#a8012b] dark:bg-[#a8012b]/20' 
                                : `${colors.text.primary} hover:bg-gray-100 dark:hover:bg-gray-800`
                              }
                              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            {/* Tag Color Dot */}
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getTagColor(tag) }}
                            />

                            {/* Tag Name */}
                            <span className="flex-1 truncate">{tag.name}</span>

                            {/* Checkmark */}
                            {isSelected && <Check className="w-4 h-4 text-[#a8012b]" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* No Results */}
                {Array.from(groupedTags.values()).every((g) => g.length === 0) && (
                  <div className={`py-6 text-center ${colors.text.muted}`}>
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun tag trovato</p>
                    {searchTerm && (
                      <p className="text-xs mt-1">Prova con una ricerca diversa</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
