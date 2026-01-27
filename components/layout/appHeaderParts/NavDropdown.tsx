'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { colors } from '@/lib/theme/colors';
import type { NavItem } from './types';

interface NavDropdownProps {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  isActive: boolean;
  pathname: string;
  totalBadgeCount?: number;
  getBadgeCount?: (href: string) => number;
}

export function NavDropdown({
  label,
  icon: Icon,
  items,
  isOpen,
  onClose,
  onToggle,
  isActive,
  pathname,
  totalBadgeCount = 0,
  getBadgeCount,
}: NavDropdownProps) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
          isActive
            ? `${colors.primary.softBg} ${colors.primary.text}`
            : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
        {totalBadgeCount > 0 && (
          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none flex items-center justify-center ${colors.primary.gradient} text-white`}>
            {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-1 w-56 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
          {items.map((item) => {
            const isItemActive = pathname.startsWith(item.href);
            const badgeCount = getBadgeCount ? getBadgeCount(item.href) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-sm transition-colors ${
                  isItemActive
                    ? `${colors.primary.softBg} ${colors.primary.text}`
                    : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                {badgeCount > 0 && (
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none flex items-center justify-center ${colors.primary.gradient} text-white`}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
