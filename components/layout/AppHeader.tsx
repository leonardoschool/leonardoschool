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
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  Home,
  Users,
  UsersRound,
  UserCog,
  FileText,
  BookOpen,
  BarChart3,
  FolderOpen,
  Check,
  X,
  AlertTriangle,
  Briefcase,
  Eye,
  MessageSquare,
  UserCheck,
  UserPlus,
  FileSignature,
  XCircle,
  ClipboardList,
  ClipboardCheck,
  Mail,
  type LucideIcon,
} from 'lucide-react';

// Notification type config with icons and colors
type NotificationTypeKey = 'CONTRACT_ASSIGNED' | 'CONTRACT_SIGNED' | 'CONTRACT_CANCELLED' | 'ACCOUNT_ACTIVATED' | 'PROFILE_COMPLETED' | 'JOB_APPLICATION' | 'CONTACT_REQUEST' | 'GENERAL';

const notificationConfig: Record<NotificationTypeKey, { icon: LucideIcon; bgClass: string; iconColor: string }> = {
  CONTRACT_ASSIGNED: {
    icon: FileText,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  CONTRACT_SIGNED: {
    icon: FileSignature,
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  CONTRACT_CANCELLED: {
    icon: XCircle,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  ACCOUNT_ACTIVATED: {
    icon: UserCheck,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  PROFILE_COMPLETED: {
    icon: UserPlus,
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  JOB_APPLICATION: {
    icon: Briefcase,
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  CONTACT_REQUEST: {
    icon: MessageSquare,
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  GENERAL: {
    icon: Bell,
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
  },
};

type Theme = 'light' | 'dark' | 'system';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [gestioneMenuOpen, setGestioneMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [loggingOut, setLoggingOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const gestioneMenuRef = useRef<HTMLDivElement>(null);

  // Polling interval for real-time updates (30 seconds)
  const POLLING_INTERVAL = 30 * 1000;

  // Get current user
  const { data: user } = trpc.auth.me.useQuery();
  
  // Get collaborator contract status (collaborator only)
  const { data: collaboratorContract } = trpc.contracts.getMyCollaboratorContract.useQuery(
    undefined,
    { 
      enabled: (user?.role as string) === 'COLLABORATOR', 
      retry: false,
      refetchInterval: POLLING_INTERVAL,
    }
  );
  
  // Get notifications (admin only) - auto-refresh every 30 seconds
  const { data: notifications, refetch: refetchNotifications } = trpc.contracts.getAdminNotifications.useQuery(
    { unreadOnly: true, limit: 10 },
    { 
      enabled: user?.role === 'ADMIN',
      refetchInterval: POLLING_INTERVAL,
    }
  );

  // Get job applications stats (admin only) - for badge count
  const { data: jobApplicationsStats } = trpc.jobApplications.getStats.useQuery(
    undefined,
    { 
      enabled: user?.role === 'ADMIN',
      refetchInterval: POLLING_INTERVAL,
    }
  );

  // Get contact requests stats (admin only) - for badge count
  const { data: contactRequestsStats } = trpc.contactRequests.getStats.useQuery(
    undefined,
    { 
      enabled: user?.role === 'ADMIN',
      refetchInterval: POLLING_INTERVAL,
    }
  );

  // Get students pending contract (admin only) - for badge count
  const { data: studentsPendingContract } = trpc.contracts.getStudentsPendingContract.useQuery(
    undefined,
    { 
      enabled: user?.role === 'ADMIN',
      refetchInterval: POLLING_INTERVAL,
    }
  );

  // Mark notification as read
  const markAsReadMutation = trpc.contracts.markNotificationRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  const isAdmin = user?.role === 'ADMIN';
  const isCollaborator = (user?.role as string) === 'COLLABORATOR';
  const isStaff = isAdmin || isCollaborator;
  const unreadCount = notifications?.length || 0;
  const pendingApplicationsCount = jobApplicationsStats?.pending || 0;
  const pendingContactRequestsCount = contactRequestsStats?.pending || 0;
  const pendingContractUsersCount = studentsPendingContract?.length || 0;
  const totalGestionePending = pendingApplicationsCount + pendingContactRequestsCount + pendingContractUsersCount;
  
  // Collaborator can navigate only if:
  // 1. Account is active AND has signed contract
  // OR
  // 2. Account is active AND has no contract at all (admin activated without contract)
  // If there's a PENDING contract, navigation is blocked until signed
  const hasPendingContract = collaboratorContract?.status === 'PENDING';
  const hasSignedContract = collaboratorContract?.status === 'SIGNED';
  const hasNoContract = !collaboratorContract;
  const collaboratorCanNavigate = isCollaborator 
    ? user?.isActive && (hasSignedContract || (hasNoContract && !hasPendingContract))
    : true;

  // Theme application function (defined before useEffect to avoid hoisting issues)
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  // Theme handling - load saved preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

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
      if (gestioneMenuRef.current && !gestioneMenuRef.current.contains(e.target as Node)) {
        setGestioneMenuOpen(false);
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

  // Menu Gestione (dropdown) - Admin only: Utenti, Gruppi, Contratti, Candidature, Richieste
  const gestioneItems = [
    { href: '/admin/utenti', label: 'Utenti', icon: Users },
    { href: '/admin/gruppi', label: 'Gruppi', icon: UsersRound },
    { href: '/admin/contratti', label: 'Contratti', icon: FileSignature },
    { href: '/admin/candidature', label: 'Candidature', icon: Briefcase },
    { href: '/admin/richieste', label: 'Richieste', icon: Mail },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/materiali', label: 'Materiali', icon: FolderOpen },
    { href: '/admin/domande', label: 'Domande', icon: BookOpen },
    { href: '/admin/simulazioni', label: 'Simulazioni', icon: ClipboardCheck },
    { href: '/admin/statistiche', label: 'Statistiche', icon: BarChart3 },
  ];

  // Collaborator: no contratti, studenti con vista limitata
  const collaboratorNavItems = [
    { href: '/collaboratore', label: 'Dashboard', icon: Home },
    { href: '/collaboratore/studenti', label: 'Studenti', icon: Users },
    { href: '/collaboratore/materiali', label: 'Materiali', icon: FolderOpen },
    { href: '/collaboratore/domande', label: 'Domande', icon: BookOpen },
    { href: '/collaboratore/statistiche', label: 'Statistiche', icon: BarChart3 },
  ];

  // Student: simulazioni, materiale didattico, statistiche, il mio gruppo
  const studentNavItems = [
    { href: '/studente', label: 'Dashboard', icon: Home },
    { href: '/studente/simulazioni', label: 'Simulazioni', icon: ClipboardList },
    { href: '/studente/materiali', label: 'Materiale Didattico', icon: FolderOpen },
    { href: '/studente/statistiche', label: 'Statistiche', icon: BarChart3 },
    { href: '/studente/gruppo', label: 'Il Mio Gruppo', icon: UsersRound },
  ];

  const isStudent = user?.role === 'STUDENT';
  const navItems = isAdmin ? adminNavItems : isCollaborator ? collaboratorNavItems : isStudent ? studentNavItems : [];

  // Check if current path is in Gestione
  const isGestioneActive = gestioneItems.some(item => pathname.startsWith(item.href));

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

  // Handle notification click - navigate to relevant section
  const handleNotificationClick = (notification: {
    id: string;
    type: string;
    studentId?: string | null;
    collaboratorId?: string | null;
    contractId?: string | null;
  }) => {
    // Mark as read first
    handleMarkAsRead(notification.id);
    setNotificationsOpen(false);

    // Navigate based on notification type
    switch (notification.type) {
      case 'JOB_APPLICATION':
        router.push('/admin/candidature');
        break;
      case 'CONTACT_REQUEST':
        router.push('/admin/richieste');
        break;
      case 'CONTRACT_ASSIGNED':
      case 'CONTRACT_SIGNED':
      case 'CONTRACT_CANCELLED':
        // Navigate to contracts, with specific contract if available
        if (notification.contractId) {
          router.push(`/admin/contratti?contratto=${notification.contractId}`);
        } else {
          router.push('/admin/contratti');
        }
        break;
      case 'ACCOUNT_ACTIVATED':
      case 'PROFILE_COMPLETED':
        // Navigate to users, with specific user if available
        if (notification.studentId) {
          router.push(`/admin/utenti?utente=${notification.studentId}&tipo=studente`);
        } else if (notification.collaboratorId) {
          router.push(`/admin/utenti?utente=${notification.collaboratorId}&tipo=collaboratore`);
        } else {
          router.push('/admin/utenti');
        }
        break;
      default:
        router.push('/admin');
    }
  };

  return (
    <header className={`sticky top-0 z-50 ${colors.background.card} border-b ${colors.border.primary} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isAdmin ? '/admin' : isCollaborator ? '/collaboratore' : '/studente'} className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-lg p-1">
              <Image
                src="/images/logo.png"
                alt="Leonardo School"
                fill
                className="object-contain"
              />
            </div>
          </Link>

          {/* Staff Navigation (desktop) - Admin & Collaborator */}
          {isStaff && collaboratorCanNavigate && (
            <nav className="hidden lg:flex items-center gap-1">
              {/* Dashboard link */}
              <Link
                href={isAdmin ? '/admin' : '/collaboratore'}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  pathname === '/admin' || pathname === '/collaboratore'
                    ? `${colors.primary.softBg} ${colors.primary.text}`
                    : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                }`}
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Link>

              {/* Gestione Dropdown (Admin only) */}
              {isAdmin && (
                <div ref={gestioneMenuRef} className="relative">
                    <button
                      onClick={() => setGestioneMenuOpen(!gestioneMenuOpen)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        isGestioneActive
                          ? `${colors.primary.softBg} ${colors.primary.text}`
                          : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      Gestione
                      {totalGestionePending > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none flex items-center justify-center ${colors.primary.gradient} text-white`}>
                          {totalGestionePending > 99 ? '99+' : totalGestionePending}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform ${gestioneMenuOpen ? 'rotate-180' : ''}`} />
                    </button>                  {gestioneMenuOpen && (
                    <div className={`absolute left-0 top-full mt-1 w-56 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
                      {gestioneItems.map((item) => {
                        const isItemActive = pathname.startsWith(item.href);
                        // Show badge for Utenti, Candidature and Richieste
                        const badgeCount = 
                          item.href === '/admin/utenti' ? pendingContractUsersCount :
                          item.href === '/admin/candidature' ? pendingApplicationsCount :
                          item.href === '/admin/richieste' ? pendingContactRequestsCount : 0;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setGestioneMenuOpen(false)}
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
              )}

              {/* Other nav items */}
              {navItems.filter(item => item.href !== '/admin' && item.href !== '/collaboratore').map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? `${colors.primary.softBg} ${colors.primary.text}`
                        : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Student Navigation (desktop) */}
          {isStudent && (
            <nav className="hidden lg:flex items-center gap-1">
              {studentNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/studente' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? `${colors.primary.softBg} ${colors.primary.text}`
                        : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
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
                className={`p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors`}
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
                      className={`w-full px-4 py-2 flex items-center gap-3 text-sm ${colors.text.primary} ${colors.effects.hover.bgSubtle} transition-colors ${
                        currentTheme === option.value ? colors.primary.text : colors.icon.primary
                      }`}
                    >
                      <option.icon className="w-4 h-4" />
                      {option.label}
                      {currentTheme === option.value && (
                        <Check className={`w-4 h-4 ml-auto ${colors.primary.text}`} />
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
                  className={`p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors relative`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] leading-none rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className={`absolute right-0 mt-2 w-80 sm:w-96 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} z-50 overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${colors.border.primary} flex items-center justify-between`}>
                      <h3 className={`font-semibold ${colors.text.primary}`}>Notifiche</h3>
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
                        notifications.map((notification) => {
                          if (!notification.id || !notification.type) return null;
                          const config = notificationConfig[notification.type as NotificationTypeKey] || notificationConfig.GENERAL;
                          const NotificationIcon = config.icon;
                          
                          return (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick({
                                id: notification.id!,
                                type: notification.type!,
                                studentId: notification.studentId,
                                collaboratorId: notification.collaboratorId,
                                contractId: notification.contractId,
                              })}
                              className={`px-4 py-3 border-b ${colors.border.primary} ${colors.effects.hover.bg} transition-colors cursor-pointer`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon based on notification type */}
                                <div className={`w-9 h-9 rounded-lg ${config.bgClass} flex items-center justify-center flex-shrink-0`}>
                                  {notification.isUrgent ? (
                                    <AlertTriangle className={`w-5 h-5 ${colors.status.warning.text}`} />
                                  ) : (
                                    <NotificationIcon className={`w-5 h-5 ${config.iconColor}`} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium text-sm truncate ${colors.text.primary}`}>{notification.title}</p>
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
                                    if (notification.id) handleMarkAsRead(notification.id);
                                  }}
                                  className={`p-1 rounded ${colors.effects.hover.bgMuted} transition-colors text-gray-500 dark:text-gray-400`}
                                  title="Segna come letta"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell className={`w-10 h-10 mx-auto ${colors.icon.secondary} mb-2`} />
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
              >
                <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center text-white font-semibold text-sm leading-none`}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className={`hidden sm:block text-sm font-medium max-w-[120px] truncate ${colors.text.primary}`}>
                  {user?.name?.split(' ')[0] || 'Utente'}
                </span>
                <ChevronDown className={`w-4 h-4 ${colors.icon.primary} transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
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
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                        {isAdmin ? '👑 Amministratore' : isCollaborator ? '🤝 Collaboratore' : '📚 Studente'}
                      </span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <Link
                      href={isAdmin ? '/admin/profilo' : isCollaborator ? '/collaboratore/profilo' : '/studente/profilo'}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.primary} ${colors.effects.hover.bgSubtle} transition-colors`}
                    >
                      <Eye className={`w-4 h-4 ${colors.icon.secondary}`} />
                      Visualizza profilo
                    </Link>
                    {/* Hide settings for collaborators without signed contract/active account */}
                    {collaboratorCanNavigate && (
                      <Link
                        href={isAdmin ? '/admin/impostazioni' : isCollaborator ? '/collaboratore/impostazioni' : '/studente/impostazioni'}
                        onClick={() => setUserMenuOpen(false)}
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
                      onClick={handleLogout}
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
          </div>
        </div>
      </div>

      {/* Mobile Navigation (Staff) */}
      {isStaff && collaboratorCanNavigate && (
        <div className={`lg:hidden border-t ${colors.border.primary} overflow-x-auto`}>
          <nav className="flex items-center gap-1 px-4 py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && item.href !== '/collaboratore' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? `${colors.primary.softBg} ${colors.primary.text}`
                      : `${colors.text.secondary} ${colors.effects.hover.bgSubtle}`
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            {/* Gestione items for admin mobile */}
            {isAdmin && gestioneItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              // Show badge for Candidature and Richieste
              const badgeCount = 
                item.href === '/admin/candidature' ? pendingApplicationsCount :
                item.href === '/admin/richieste' ? pendingContactRequestsCount : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? `${colors.primary.softBg} ${colors.primary.text}`
                      : `${colors.text.secondary} ${colors.effects.hover.bgSubtle}`
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${colors.primary.gradient} text-white`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile Navigation (Student) */}
      {isStudent && (
        <div className={`lg:hidden border-t ${colors.border.primary} overflow-x-auto`}>
          <nav className="flex items-center gap-1 px-4 py-2">
            {studentNavItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/studente' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? `${colors.primary.softBg} ${colors.primary.text}`
                      : `${colors.text.secondary} ${colors.effects.hover.bgSubtle}`
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
