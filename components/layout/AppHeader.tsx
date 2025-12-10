'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';
import {
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  Home,
  Users,
  FileText,
  BookOpen,
  BarChart3,
  FolderOpen,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [loggingOut, setLoggingOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Get current user
  const { data: user } = trpc.auth.me.useQuery();
  
  // Get notifications (admin only)
  const { data: notifications, refetch: refetchNotifications } = trpc.contracts.getAdminNotifications.useQuery(
    { unreadOnly: true, limit: 10 },
    { enabled: user?.role === 'ADMIN' }
  );

  // Mark notification as read
  const markAsReadMutation = trpc.contracts.markNotificationRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  const isAdmin = user?.role === 'ADMIN';
  const unreadCount = notifications?.length || 0;

  // Theme handling
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    setThemeMenuOpen(false);
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await firebaseAuth.logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const themeOptions = [
    { value: 'light' as Theme, label: 'Chiaro', icon: Sun },
    { value: 'dark' as Theme, label: 'Scuro', icon: Moon },
    { value: 'system' as Theme, label: 'Sistema', icon: Monitor },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/studenti', label: 'Studenti', icon: Users },
    { href: '/admin/contratti', label: 'Contratti', icon: FileText },
    { href: '/admin/materiali', label: 'Materiali', icon: FolderOpen },
    { href: '/admin/domande', label: 'Domande', icon: BookOpen },
    { href: '/admin/statistiche', label: 'Statistiche', icon: BarChart3 },
  ];

  const formatNotificationTime = (date: Date | string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ora';
    if (minutes < 60) return `${minutes}m fa`;
    if (hours < 24) return `${hours}h fa`;
    return `${days}g fa`;
  };

  return (
    <header className={`sticky top-0 z-50 ${colors.background.card} border-b ${colors.border.primary} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isAdmin ? '/admin' : '/studente'} className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#8B1A1A] p-1">
              <Image
                src="/images/NEW_LOGO_2026/logo_sito_proof.png"
                alt="Leonardo School"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-lg hidden sm:block">Leonardo School</span>
          </Link>

          {/* Admin Navigation (desktop) */}
          {isAdmin && (
            <nav className="hidden lg:flex items-center gap-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? `${colors.primary.softBg} ${colors.primary.text}`
                        : `hover:${colors.background.secondary}`
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div ref={themeMenuRef} className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
                title="Cambia tema"
              >
                {currentTheme === 'dark' ? (
                  <Moon className="w-5 h-5" />
                ) : currentTheme === 'light' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Monitor className="w-5 h-5" />
                )}
              </button>

              {themeMenuOpen && (
                <div className={`absolute right-0 mt-2 w-40 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={`w-full px-4 py-2 flex items-center gap-3 text-sm hover:${colors.background.secondary} transition-colors ${
                        currentTheme === option.value ? colors.primary.text : ''
                      }`}
                    >
                      <option.icon className="w-4 h-4" />
                      {option.label}
                      {currentTheme === option.value && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Bell (Admin only) */}
            {isAdmin && (
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`p-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors relative`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className={`absolute right-0 mt-2 w-80 sm:w-96 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} z-50 overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${colors.border.primary} flex items-center justify-between`}>
                      <h3 className="font-semibold">Notifiche</h3>
                      <Link 
                        href="/admin/notifiche" 
                        className={`text-sm ${colors.primary.text} hover:underline`}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        Vedi tutte
                      </Link>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications && notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b ${colors.border.primary} hover:${colors.background.secondary} transition-colors`}
                          >
                            <div className="flex items-start gap-3">
                              {notification.isUrgent && (
                                <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text} flex-shrink-0 mt-0.5`} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{notification.title}</p>
                                <p className={`text-sm ${colors.text.secondary} line-clamp-2`}>
                                  {notification.message}
                                </p>
                                <p className={`text-xs ${colors.text.muted} mt-1`}>
                                  {formatNotificationTime(notification.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className={`p-1 rounded hover:${colors.background.tertiary} transition-colors`}
                                title="Segna come letta"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell className={`w-10 h-10 mx-auto ${colors.text.muted} mb-2`} />
                          <p className={colors.text.secondary}>Nessuna nuova notifica</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.background.secondary} hover:${colors.background.tertiary} transition-colors`}
              >
                <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center text-white font-medium text-sm`}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                  {user?.name?.split(' ')[0] || 'Utente'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className={`absolute right-0 mt-2 w-56 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} py-2 z-50`}>
                  {/* User info */}
                  <div className={`px-4 py-3 border-b ${colors.border.primary}`}>
                    <p className="font-medium truncate">{user?.name}</p>
                    <p className={`text-sm ${colors.text.secondary} truncate`}>{user?.email}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isAdmin 
                        ? `${colors.primary.softBg} ${colors.primary.text}` 
                        : `${colors.status.info.softBg} ${colors.status.info.text}`
                    }`}>
                      {isAdmin ? 'Amministratore' : 'Studente'}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <Link
                      href={isAdmin ? '/admin' : '/studente'}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm hover:${colors.background.secondary} transition-colors`}
                    >
                      <Home className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href={isAdmin ? '/admin/profilo' : '/studente/profilo'}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm hover:${colors.background.secondary} transition-colors`}
                    >
                      <User className="w-4 h-4" />
                      Il mio profilo
                    </Link>
                    <Link
                      href={isAdmin ? '/admin/impostazioni' : '/studente/impostazioni'}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm hover:${colors.background.secondary} transition-colors`}
                    >
                      <Settings className="w-4 h-4" />
                      Impostazioni
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className={`border-t ${colors.border.primary} pt-1 mt-1`}>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50`}
                    >
                      {loggingOut ? (
                        <>
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
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
          </div>
        </div>
      </div>

      {/* Mobile Navigation (Admin) */}
      {isAdmin && (
        <div className={`lg:hidden border-t ${colors.border.primary} overflow-x-auto`}>
          <nav className="flex items-center gap-1 px-4 py-2">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? `${colors.primary.softBg} ${colors.primary.text}`
                      : `hover:${colors.background.secondary}`
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
