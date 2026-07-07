'use client';

/**
 * UserGroupsCell — inline, editable "Gruppi" cell for the users table.
 * Shows the user's group badges and, on click, opens a checkbox dropdown to
 * add/remove groups. Changes are committed immediately via groups.setUserGroups.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc/client';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/loaders';

type GroupType = 'STUDENTS' | 'COLLABORATORS' | 'MIXED';

interface GroupOption {
  id: string;
  name: string;
  color?: string | null;
  type: GroupType;
}

interface SimpleGroup {
  id: string;
  name: string;
  color?: string | null;
}

interface UserGroupsCellProps {
  role: 'STUDENT' | 'COLLABORATOR';
  /** student.id or collaborator.id — the membership target */
  targetId?: string | null;
  currentGroups: SimpleGroup[];
  allGroups: GroupOption[];
  /** Called after a successful save so the parent can refetch. */
  onSaved: () => void;
}

const FALLBACK_COLOR = '#6b7280';

export default function UserGroupsCell({ role, targetId, currentGroups, allGroups, onSaved }: UserGroupsCellProps) {
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const [selectedIds, setSelectedIds] = useState<string[]>(() => currentGroups.map((g) => g.id));

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Latest desired group set that still needs to be persisted, and an indirection
  // to the flush function so the mutation's onSettled can call it despite ordering.
  const pendingRef = useRef<string[] | null>(null);
  const flushRef = useRef<() => void>(() => {});

  const setGroupsMutation = trpc.groups.setUserGroups.useMutation({
    onSuccess: (res) => {
      onSaved();
      if (res.added > 0 || res.removed > 0) {
        showSuccess('Gruppi aggiornati', "L'assegnazione ai gruppi è stata aggiornata.");
      }
    },
    onError: (err) => {
      pendingRef.current = null;
      setSelectedIds(currentGroups.map((g) => g.id)); // revert optimistic change
      handleMutationError(err);
    },
    // Persist any change queued while this request was in flight (serialize saves so
    // the last click wins instead of a stale set clobbering it).
    onSettled: () => flushRef.current(),
  });

  const isSaving = setGroupsMutation.isPending;

  const flush = useCallback(() => {
    const ids = pendingRef.current;
    if (ids === null || !targetId) return;
    pendingRef.current = null;
    setGroupsMutation.mutate({
      ...(role === 'STUDENT' ? { studentId: targetId } : { collaboratorId: targetId }),
      groupIds: ids,
    });
  }, [role, targetId, setGroupsMutation]);
  flushRef.current = flush;

  useEffect(() => { setIsMounted(true); }, []);

  // Re-sync local selection with server state when it changes (and we're not mid-save)
  const currentKey = currentGroups.map((g) => g.id).sort().join(',');
  useEffect(() => {
    if (!isSaving) setSelectedIds(currentGroups.map((g) => g.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const compatibleGroups = useMemo(
    () => allGroups.filter((g) => (role === 'STUDENT' ? g.type !== 'COLLABORATORS' : g.type !== 'STUDENTS')),
    [allGroups, role]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? compatibleGroups.filter((g) => g.name.toLowerCase().includes(q)) : compatibleGroups;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [compatibleGroups, search]);

  const selectedGroups = useMemo(() => {
    const byId = new Map<string, SimpleGroup>(allGroups.map((g) => [g.id, { id: g.id, name: g.name, color: g.color }]));
    const result: SimpleGroup[] = [];
    for (const id of selectedIds) {
      const g = byId.get(id) ?? currentGroups.find((c) => c.id === id);
      if (g) result.push(g);
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [selectedIds, allGroups, currentGroups]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = globalThis.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > spaceBelow;
    setPosition({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 240),
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    globalThis.addEventListener('scroll', updatePosition, true);
    globalThis.addEventListener('resize', updatePosition);
    return () => {
      globalThis.removeEventListener('scroll', updatePosition, true);
      globalThis.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const dropdown = document.querySelector('[data-user-groups-dropdown]');
      if (dropdown?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const readOnly = !targetId;

  const commit = (ids: string[]) => {
    if (!targetId) return;
    setSelectedIds(ids);        // optimistic
    pendingRef.current = ids;   // remember the latest desired state
    if (!setGroupsMutation.isPending) flush();
  };

  const toggleGroup = (groupId: string) => {
    commit(
      selectedIds.includes(groupId)
        ? selectedIds.filter((id) => id !== groupId)
        : [...selectedIds, groupId]
    );
  };

  const displayGroups = selectedGroups.slice(0, 3);
  const remaining = selectedGroups.length - displayGroups.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={readOnly}
        onClick={() => { if (!readOnly) { setIsOpen((o) => !o); setSearch(''); } }}
        className={`group/gc flex items-center gap-1.5 min-w-0 max-w-[200px] rounded-lg px-1.5 py-1 -mx-1.5 text-left transition-colors ${
          readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={readOnly ? undefined : 'Gestisci gruppi'}
      >
        <div className="flex flex-wrap gap-1 min-w-0">
          {selectedGroups.length === 0 ? (
            <span className={`text-xs ${colors.text.muted} italic`}>Nessun gruppo</span>
          ) : (
            <>
              {displayGroups.map((g) => (
                <span
                  key={g.id}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: (g.color || FALLBACK_COLOR) + '20', color: g.color || FALLBACK_COLOR }}
                  title={g.name}
                >
                  {g.name.length > 12 ? g.name.substring(0, 10) + '...' : g.name}
                </span>
              ))}
              {remaining > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.background.secondary} ${colors.text.muted}`}
                  title={selectedGroups.slice(3).map((g) => g.name).join(', ')}
                >
                  +{remaining}
                </span>
              )}
            </>
          )}
        </div>
        {!readOnly && (
          isSaving ? (
            <Spinner size="sm" />
          ) : (
            <ChevronDown
              className={`w-3.5 h-3.5 flex-shrink-0 ${colors.text.muted} transition-all opacity-0 group-hover/gc:opacity-100 ${isOpen ? 'rotate-180 opacity-100' : ''}`}
            />
          )
        )}
      </button>

      {isOpen && isMounted && !readOnly && createPortal(
        <div
          data-user-groups-dropdown
          className={`fixed z-[9999] ${colors.background.card} border ${colors.border.primary} rounded-xl shadow-2xl overflow-hidden`}
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            ...(position.openUpward && { transform: 'translateY(-100%)' }),
          }}
        >
          {compatibleGroups.length > 6 && (
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${colors.border.primary}`}>
              <Search className={`w-3.5 h-3.5 shrink-0 ${colors.text.muted}`} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca gruppo..."
                className={`w-full bg-transparent text-sm focus:outline-none ${colors.text.primary}`}
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {filteredGroups.length === 0 ? (
              <p className={`px-4 py-3 text-sm ${colors.text.muted}`}>Nessun gruppo disponibile</p>
            ) : (
              filteredGroups.map((g) => {
                const checked = selectedIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      checked ? colors.background.secondary : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                        checked ? `${colors.primary.bg} ${colors.primary.border}` : `border-gray-400 dark:border-gray-500 ${colors.background.input}`
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color || FALLBACK_COLOR }} />
                    <span className={`text-sm truncate ${colors.text.primary}`}>{g.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
