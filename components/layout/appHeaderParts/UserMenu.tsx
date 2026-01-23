'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Eye, Settings, LogOut } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import { getRoleBadgeText } from './helpers';
import type { UserData } from './types';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  user: UserData | null | undefined;
  isAdmin: boolean;
  isCollaborator: boolean;
  isStudent: boolean;
  collaboratorCanNavigate: boolean;
  loggingOut: boolean;
  onLogout: () => void;
}

export function UserMenu({
  isOpen,
  onClose,
  onToggle,
  user,
  isAdmin,
  isCollaborator,
  isStudent,
  collaboratorCanNavigate,
  loggingOut,
  onLogout,
}: UserMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const roleBadge = getRoleBadgeText(isAdmin, isCollaborator);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
      >
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${colors.primary.bg} flex items-center justify-center text-white font-semibold text-xs sm:text-sm leading-none flex-shrink-0`}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className={`hidden sm:block text-sm font-medium max-w-[100px] truncate ${colors.text.primary}`}>
          {user?.name?.split(' ')[0] || 'Utente'}
        </span>
        <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ${colors.icon.primary} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-64 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} overflow-hidden z-50`}>
          {/* User info header */}
          <div className={`px-4 py-4 ${colors.primary.gradient}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg leading-none">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{user?.name}</p>
                <p className="text-sm text-white/80 truncate">{user?.email}</p>
                {isStudent && user?.student?.matricola && (
                  <p className="text-xs text-white/70 mt-0.5 font-mono">
                    Matricola: {user.student.matricola}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                {roleBadge}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <Link
              href="/profilo"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.primary} ${colors.effects.hover.bgSubtle} transition-colors`}
            >
              <Eye className={`w-4 h-4 ${colors.icon.secondary}`} />
              Visualizza profilo
            </Link>
            {collaboratorCanNavigate && (
              <Link
                href="/impostazioni"
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.primary} ${colors.effects.hover.bgSubtle} transition-colors`}
              >
                <Settings className={`w-4 h-4 ${colors.icon.secondary}`} />
                Impostazioni
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className={`border-t ${colors.border.primary}`}>
            <button
              onClick={onLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {loggingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin" />
                  Disconnessione...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Esci
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
