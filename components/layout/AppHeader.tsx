'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';
import { playNotificationSound } from '@/lib/utils/notificationSound';
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
  Calendar,
  GraduationCap,
  Tag,
  UserMinus,
  Menu,
  type LucideIcon,
} from 'lucide-react';

// Notification type config with icons and colors - Extended for all notification types
type NotificationTypeKey = 
  | 'ACCOUNT_ACTIVATED' | 'NEW_REGISTRATION' | 'PROFILE_COMPLETED'
  | 'CONTRACT_ASSIGNED' | 'CONTRACT_SIGNED' | 'CONTRACT_REMINDER' | 'CONTRACT_EXPIRED' | 'CONTRACT_CANCELLED'
  | 'EVENT_INVITATION' | 'EVENT_REMINDER' | 'EVENT_UPDATED' | 'EVENT_CANCELLED'
  | 'SIMULATION_ASSIGNED' | 'SIMULATION_REMINDER' | 'SIMULATION_READY' | 'SIMULATION_STARTED' | 'SIMULATION_RESULTS' | 'SIMULATION_COMPLETED'
  | 'STAFF_ABSENCE' | 'ABSENCE_REQUEST' | 'ABSENCE_CONFIRMED' | 'ABSENCE_REJECTED' | 'SUBSTITUTION_ASSIGNED'
  | 'QUESTION_FEEDBACK' | 'OPEN_ANSWER_TO_REVIEW'
  | 'MATERIAL_AVAILABLE' | 'MESSAGE_RECEIVED'
  | 'JOB_APPLICATION' | 'CONTACT_REQUEST'
  | 'ATTENDANCE_RECORDED' | 'SYSTEM_ALERT' | 'GENERAL';

const notificationConfig: Record<NotificationTypeKey, { icon: LucideIcon; bgClass: string; iconColor: string }> = {
  // Account & Auth
  ACCOUNT_ACTIVATED: { icon: UserCheck, bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  NEW_REGISTRATION: { icon: UserPlus, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  PROFILE_COMPLETED: { icon: UserPlus, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  // Contracts
  CONTRACT_ASSIGNED: { icon: FileText, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  CONTRACT_SIGNED: { icon: FileSignature, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  CONTRACT_REMINDER: { icon: FileText, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  CONTRACT_EXPIRED: { icon: XCircle, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  CONTRACT_CANCELLED: { icon: XCircle, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  // Events & Calendar
  EVENT_INVITATION: { icon: Calendar, bgClass: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  EVENT_REMINDER: { icon: Calendar, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  EVENT_UPDATED: { icon: Calendar, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  EVENT_CANCELLED: { icon: Calendar, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  // Simulations
  SIMULATION_ASSIGNED: { icon: ClipboardCheck, bgClass: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  SIMULATION_REMINDER: { icon: ClipboardCheck, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  SIMULATION_READY: { icon: ClipboardCheck, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  SIMULATION_STARTED: { icon: ClipboardCheck, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  SIMULATION_RESULTS: { icon: ClipboardCheck, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  SIMULATION_COMPLETED: { icon: ClipboardCheck, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  // Staff Absences
  STAFF_ABSENCE: { icon: UserCheck, bgClass: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  ABSENCE_REQUEST: { icon: UserCheck, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  ABSENCE_CONFIRMED: { icon: Check, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  ABSENCE_REJECTED: { icon: X, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  SUBSTITUTION_ASSIGNED: { icon: Users, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  // Questions
  QUESTION_FEEDBACK: { icon: MessageSquare, bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  OPEN_ANSWER_TO_REVIEW: { icon: BookOpen, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  // Materials
  MATERIAL_AVAILABLE: { icon: FolderOpen, bgClass: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400' },
  // Messages
  MESSAGE_RECEIVED: { icon: MessageSquare, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  // Applications
  JOB_APPLICATION: { icon: Briefcase, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  CONTACT_REQUEST: { icon: Mail, bgClass: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400' },
  // Attendance
  ATTENDANCE_RECORDED: { icon: GraduationCap, bgClass: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  // System
  SYSTEM_ALERT: { icon: AlertTriangle, bgClass: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  GENERAL: { icon: Bell, bgClass: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400' },
};

type Theme = 'light' | 'dark' | 'system';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [gestioneMenuOpen, setGestioneMenuOpen] = useState(false);
  const [registroMenuOpen, setRegistroMenuOpen] = useState(false);
  const [didatticaMenuOpen, setDidatticaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [loggingOut, setLoggingOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const gestioneMenuRef = useRef<HTMLDivElement>(null);
  const registroMenuRef = useRef<HTMLDivElement>(null);
  const didatticaMenuRef = useRef<HTMLDivElement>(null);
  const currentColorTheme = localStorage.getItem('theme') || 'light';

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
  
  // Get unified notifications (all roles) - auto-refresh every 30 seconds
  const { data: notificationsData, refetch: refetchNotifications } = trpc.notifications.getNotifications.useQuery(
    { unreadOnly: true, pageSize: 10 },
    { 
      enabled: !!user,
      refetchInterval: POLLING_INTERVAL,
    }
  );
  
  // Extract notifications from response
  const notifications = notificationsData?.notifications || [];
  // Filter out MESSAGE_RECEIVED notifications for the bell (they show on message icon instead)
  const filteredNotifications = notifications.filter(n => n.type !== 'MESSAGE_RECEIVED');
  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  // Track previous unread count to detect new notifications
  const prevUnreadCountRef = useRef<number | null>(null);
  
  // Play sound when new notifications arrive
  useEffect(() => {
    // Skip initial load (when prevUnreadCountRef is null)
    if (prevUnreadCountRef.current === null) {
      prevUnreadCountRef.current = unreadCount;
      return;
    }
    
    // If unread count increased, play notification sound
    if (unreadCount > prevUnreadCountRef.current) {
      playNotificationSound(0.5);
    }
    
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

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

  // Get unread messages count (all roles) - for badge in navigation
  const { data: unreadMessagesData } = trpc.messages.getUnreadCount.useQuery(
    undefined,
    { 
      enabled: !!user,
      refetchInterval: POLLING_INTERVAL,
    }
  );
  const unreadMessagesCount = unreadMessagesData?.unreadCount || 0;

  // Mark notification as read (unified system)
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  const isAdmin = user?.role === 'ADMIN';
  const isCollaborator = (user?.role as string) === 'COLLABORATOR';
  const isStudent = user?.role === 'STUDENT';
  const isStaff = isAdmin || isCollaborator;
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

  // Student can navigate only if account is active
  const studentCanNavigate = isStudent ? user?.isActive : true;

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
      if (registroMenuRef.current && !registroMenuRef.current.contains(e.target as Node)) {
        setRegistroMenuOpen(false);
      }
      if (didatticaMenuRef.current && !didatticaMenuRef.current.contains(e.target as Node)) {
        setDidatticaMenuOpen(false);
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

  // Menu Gestione (dropdown) - Admin: Utenti, Gruppi, Contratti, Candidature, Richieste
  const gestioneItemsAdmin = [
    { href: '/utenti', label: 'Utenti', icon: Users },
    { href: '/gruppi', label: 'Gruppi', icon: UsersRound },
    { href: '/contratti', label: 'Contratti', icon: FileSignature },
    { href: '/candidature', label: 'Candidature', icon: Briefcase },
    { href: '/richieste', label: 'Richieste', icon: Mail },
  ];

  // Menu Gestione (dropdown) - Collaboratore: Studenti, Gruppi
  const gestioneItemsCollaborator = [
    { href: '/studenti', label: 'Studenti', icon: GraduationCap },
    { href: '/gruppi', label: 'Gruppi', icon: UsersRound },
  ];

  // Menu Registro (dropdown) - Admin: Registro Elettronico, Assenze Staff
  const registroItemsAdmin = [
    { href: '/presenze', label: 'Registro Elettronico', icon: ClipboardCheck },
    { href: '/assenze', label: 'Assenze Staff', icon: UserMinus },
  ];

  // Menu Registro (dropdown) - Collaboratore: Registro Elettronico, Le Mie Assenze
  const registroItemsCollaborator = [
    { href: '/presenze', label: 'Registro Elettronico', icon: ClipboardCheck },
    { href: '/le-mie-assenze', label: 'Le Mie Assenze', icon: UserMinus },
  ];

  // Menu Didattica (dropdown) - Admin: Domande, Tags, Materie & Materiali, Simulazioni
  const didatticaItemsAdmin = [
    { href: '/domande', label: 'Domande', icon: BookOpen },
    { href: '/tags', label: 'Tag', icon: Tag },
    { href: '/materiali', label: 'Materie & Materiali', icon: FolderOpen },
    { href: '/simulazioni', label: 'Simulazioni', icon: ClipboardList },
  ];

  // Menu Didattica (dropdown) - Collaboratore: Domande, Tags, Materiali, Simulazioni
  const didatticaItemsCollaborator = [
    { href: '/domande', label: 'Domande', icon: BookOpen },
    { href: '/tags', label: 'Tag', icon: Tag },
    { href: '/materiali', label: 'Materiali', icon: FolderOpen },
    { href: '/simulazioni', label: 'Simulazioni', icon: ClipboardList },
  ];

  // Get gestione items based on role
  const gestioneItems = isAdmin ? gestioneItemsAdmin : gestioneItemsCollaborator;

  // Get registro items based on role
  const registroItems = isAdmin ? registroItemsAdmin : registroItemsCollaborator;

  // Get didattica items based on role
  const didatticaItems = isAdmin ? didatticaItemsAdmin : didatticaItemsCollaborator;

  // Simplified nav items - Dashboard, Calendario (standalone), Statistiche
  const adminNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/statistiche', label: 'Statistiche', icon: BarChart3 },
  ];

  // Collaborator: Dashboard, Calendario (standalone)
  const collaboratorNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
  ];

  // Student: simulazioni, calendario, materiale didattico, statistiche, il mio gruppo
  const studentNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/calendario', label: 'Calendario', icon: Calendar },
    { href: '/simulazioni', label: 'Simulazioni', icon: ClipboardList },
    { href: '/materiali', label: 'Materiale Didattico', icon: FolderOpen },
    { href: '/statistiche', label: 'Statistiche', icon: BarChart3 },
    { href: '/gruppo', label: 'Il Mio Gruppo', icon: UsersRound },
  ];

  const navItems = isAdmin ? adminNavItems : isCollaborator ? collaboratorNavItems : isStudent ? studentNavItems : [];

  // Check if current path is in Gestione
  const isGestioneActive = gestioneItems.some(item => pathname.startsWith(item.href));
  
  // Check if current path is in Registro section
  const isRegistroActive = registroItems.some(item => pathname.startsWith(item.href));
  
  // Check if current path is in Didattica section
  const isDidatticaActive = didatticaItems.some(item => pathname.startsWith(item.href));

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

  // Get notification page URL based on user role
  const getNotificationsPageUrl = () => {
    return '/notifiche';
  };

  // Handle notification click - navigate to relevant section or linkUrl
  const handleNotificationClick = (notification: {
    id: string;
    type: string;
    linkUrl?: string | null;
    linkType?: string | null;
    linkEntityId?: string | null;
  }) => {
    // Mark as read first
    handleMarkAsRead(notification.id);
    setNotificationsOpen(false);

    // If linkUrl is provided, navigate there
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
      return;
    }

    // Fallback navigation based on notification type
    switch (notification.type) {
      case 'JOB_APPLICATION':
        if (isAdmin) router.push('/candidature');
        break;
      case 'CONTACT_REQUEST':
        if (isAdmin) router.push('/richieste');
        break;
      case 'CONTRACT_ASSIGNED':
      case 'CONTRACT_SIGNED':
      case 'CONTRACT_REMINDER':
      case 'CONTRACT_EXPIRED':
      case 'CONTRACT_CANCELLED':
        if (isAdmin) router.push('/contratti');
        break;
      case 'SIMULATION_ASSIGNED':
      case 'SIMULATION_REMINDER':
      case 'SIMULATION_READY':
      case 'SIMULATION_STARTED':
      case 'SIMULATION_RESULTS':
      case 'SIMULATION_COMPLETED':
        router.push('/simulazioni');
        break;
      case 'MATERIAL_AVAILABLE':
        router.push('/materiali');
        break;
      case 'EVENT_INVITATION':
      case 'EVENT_REMINDER':
      case 'EVENT_UPDATED':
      case 'EVENT_CANCELLED':
        router.push('/calendario');
        break;
      case 'MESSAGE_RECEIVED':
        router.push('/messaggi');
        break;
      case 'ACCOUNT_ACTIVATED':
      case 'PROFILE_COMPLETED':
      case 'NEW_REGISTRATION':
        if (isAdmin) router.push('/utenti');
        break;
      default:
        router.push('/dashboard');
    }
  };

  return (
    <header className={`sticky top-0 z-50 ${colors.background.card} border-b ${colors.border.primary} shadow-sm`}>
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          {/* Hamburger Menu Button (Mobile/Tablet) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors flex-shrink-0`}
            aria-label="Apri menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Logo based on dark or light mode */}
          <Link href="/dashboard" className="flex items-center flex-shrink-0">
            <div className="relative w-[10rem] h-[10rem] mt-3">
              <Image
                src={`/images/logo-${currentColorTheme}.png`}
                alt="Leonardo School"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* Staff Navigation (desktop) - Admin & Collaborator */}
          {isStaff && collaboratorCanNavigate && (
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-4 xl:gap-6">
              {/* Dashboard link */}
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                  pathname === '/dashboard'
                    ? `${colors.primary.softBg} ${colors.primary.text}`
                    : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                }`}
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Link>

              {/* Gestione Dropdown (Admin & Collaborator) */}
              {isStaff && (
                <div ref={gestioneMenuRef} className="relative">
                    <button
                      onClick={() => setGestioneMenuOpen(!gestioneMenuOpen)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        isGestioneActive
                          ? `${colors.primary.softBg} ${colors.primary.text}`
                          : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      Gestione
                      {isAdmin && totalGestionePending > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none flex items-center justify-center ${colors.primary.gradient} text-white`}>
                          {totalGestionePending > 99 ? '99+' : totalGestionePending}
                        </span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform ${gestioneMenuOpen ? 'rotate-180' : ''}`} />
                    </button>                  {gestioneMenuOpen && (
                    <div className={`absolute left-0 top-full mt-1 w-56 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
                      {gestioneItems.map((item) => {
                        const isItemActive = pathname.startsWith(item.href);
                        // Show badge for Utenti, Candidature and Richieste (Admin only)
                        const badgeCount = isAdmin ? (
                          item.href === '/utenti' ? pendingContractUsersCount :
                          item.href === '/candidature' ? pendingApplicationsCount :
                          item.href === '/richieste' ? pendingContactRequestsCount : 0
                        ) : 0;
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

              {/* Didattica Dropdown (Admin & Collaborator) */}
              {isStaff && (
                <div ref={didatticaMenuRef} className="relative">
                  <button
                    onClick={() => setDidatticaMenuOpen(!didatticaMenuOpen)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                      isDidatticaActive
                        ? `${colors.primary.softBg} ${colors.primary.text}`
                        : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Didattica
                    <ChevronDown className={`w-4 h-4 transition-transform ${didatticaMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {didatticaMenuOpen && (
                    <div className={`absolute left-0 top-full mt-1 w-56 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
                      {didatticaItems.map((item) => {
                        const isItemActive = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDidatticaMenuOpen(false)}
                            className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                              isItemActive
                                ? `${colors.primary.softBg} ${colors.primary.text}`
                                : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Registro Dropdown (Admin & Collaborator - different items) */}
              {isStaff && (
                <div ref={registroMenuRef} className="relative">
                  <button
                    onClick={() => setRegistroMenuOpen(!registroMenuOpen)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                      isRegistroActive
                        ? `${colors.primary.softBg} ${colors.primary.text}`
                        : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Registro
                    <ChevronDown className={`w-4 h-4 transition-transform ${registroMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {registroMenuOpen && (
                    <div className={`absolute left-0 top-full mt-1 w-56 ${colors.background.card} rounded-xl shadow-lg border ${colors.border.primary} py-1 z-50`}>
                      {registroItems.map((item) => {
                        const isItemActive = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setRegistroMenuOpen(false)}
                            className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                              isItemActive
                                ? `${colors.primary.softBg} ${colors.primary.text}`
                                : `${colors.text.primary} ${colors.effects.hover.bgSubtle}`
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Other nav items */}
              {navItems.filter(item => item.href !== '/dashboard').map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
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

          {/* Student Navigation (desktop) - only visible when account is active */}
          {isStudent && studentCanNavigate && (
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-6 xl:gap-8">
              {studentNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
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
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Theme Toggle */}
            <div ref={themeMenuRef} className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className={`p-1.5 sm:p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors`}
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

            {/* Messages Icon (All authenticated users) */}
            {user && (
              <Link
                href="/messaggi"
                className={`p-1.5 sm:p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors relative`}
                title="Messaggi"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications Bell (All authenticated users) */}
            {user && (
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`p-1.5 sm:p-2 rounded-lg ${colors.effects.hover.bgSubtle} ${colors.icon.interactive} transition-colors relative`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-none rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className={`absolute right-0 mt-2 w-80 sm:w-96 ${colors.background.card} rounded-xl shadow-xl border ${colors.border.primary} z-50 overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${colors.border.primary} flex items-center justify-between`}>
                      <h3 className={`font-semibold ${colors.text.primary}`}>Notifiche</h3>
                      <Link 
                        href={getNotificationsPageUrl()} 
                        className={`text-sm ${colors.primary.text} hover:underline`}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        Vedi tutte
                      </Link>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification) => {
                          if (!notification.id || !notification.type) return null;
                          const config = notificationConfig[notification.type as NotificationTypeKey] || notificationConfig.GENERAL;
                          const NotificationIcon = config.icon;
                          
                          return (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick({
                                id: notification.id,
                                type: notification.type,
                                linkUrl: notification.linkUrl,
                                linkType: notification.linkType,
                                linkEntityId: notification.linkEntityId,
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
                className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg ${colors.effects.hover.bgSubtle} transition-colors`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${colors.primary.bg} flex items-center justify-center text-white font-semibold text-xs sm:text-sm leading-none flex-shrink-0`}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className={`hidden sm:block text-sm font-medium max-w-[100px] truncate ${colors.text.primary}`}>
                  {user?.name?.split(' ')[0] || 'Utente'}
                </span>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ${colors.icon.primary} transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
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
                        {/* Show matricola for students */}
                        {isStudent && user?.student?.matricola && (
                          <p className="text-xs text-white/70 mt-0.5 font-mono">
                            Matricola: {user.student.matricola}
                          </p>
                        )}
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
                      href="/profilo"
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm ${colors.text.primary} ${colors.effects.hover.bgSubtle} transition-colors`}
                    >
                      <Eye className={`w-4 h-4 ${colors.icon.secondary}`} />
                      Visualizza profilo
                    </Link>
                    {/* Hide settings for collaborators without signed contract/active account */}
                    {collaboratorCanNavigate && (
                      <Link
                        href="/impostazioni"
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

      {/* Mobile Navigation - Full Screen Menu */}
      {mobileMenuOpen && (
        <div className={`fixed inset-0 ${colors.background.primary} z-50 lg:hidden flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${colors.border.primary} ${colors.background.card}`}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/images/logo.png"
                  alt="Leonardo School"
                  fill
                  className="object-contain"
                />
              </div>
              <span className={`font-bold text-lg ${colors.text.primary}`}>Leonardo School</span>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setExpandedSection(null);
              }}
              className={`p-2.5 rounded-xl ${colors.background.secondary} ${colors.icon.interactive}`}
              aria-label="Chiudi menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Info Card */}
          <div className="p-4">
            <div className={`p-4 rounded-2xl ${colors.primary.gradient}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-lg truncate">{user?.name}</p>
                  <p className="text-sm text-white/80">
                    {isAdmin ? '👑 Amministratore' : isCollaborator ? '🤝 Collaboratore' : '📚 Studente'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content - hidden scrollbar */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Staff Navigation */}
            {isStaff && collaboratorCanNavigate && (
              <div className="space-y-3">
                {/* Dashboard - Direct Link */}
                <Link
                  href="/dashboard"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setExpandedSection(null);
                  }}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    pathname === '/dashboard'
                      ? `${colors.primary.gradient} text-white shadow-lg`
                      : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    pathname === '/dashboard' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <Home className={`w-6 h-6 ${pathname === '/dashboard' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                  </div>
                  <span className="font-semibold text-lg">Dashboard</span>
                </Link>

                {/* Gestione Section */}
                <div className={`rounded-2xl overflow-hidden ${colors.background.card}`}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'gestione' ? null : 'gestione')}
                    className={`w-full flex items-center justify-between p-4 transition-all ${
                      isGestioneActive ? colors.primary.text : colors.text.primary
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isGestioneActive ? colors.primary.softBg : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}>
                        <ClipboardList className={`w-6 h-6 ${isGestioneActive ? colors.primary.text : 'text-purple-600 dark:text-purple-400'}`} />
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-lg">Gestione</span>
                        {isAdmin && totalGestionePending > 0 && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${colors.primary.gradient} text-white`}>
                            {totalGestionePending}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedSection === 'gestione' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'gestione' && (
                    <div className={`px-4 pb-4 pt-2 border-t ${colors.border.primary}`}>
                      <div className="space-y-1">
                        {gestioneItems.map((item) => {
                          const isActive = pathname.startsWith(item.href);
                          const badgeCount = isAdmin ? (
                            item.href === '/utenti' ? pendingContractUsersCount :
                            item.href === '/candidature' ? pendingApplicationsCount :
                            item.href === '/richieste' ? pendingContactRequestsCount : 0
                          ) : 0;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setExpandedSection(null);
                              }}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                isActive
                                  ? `${colors.primary.softBg} ${colors.primary.text}`
                                  : `${colors.text.secondary} hover:${colors.background.secondary}`
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                              </div>
                              {badgeCount > 0 && (
                                <span className={`min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center ${colors.primary.gradient} text-white`}>
                                  {badgeCount}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Didattica Section */}
                <div className={`rounded-2xl overflow-hidden ${colors.background.card}`}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'didattica' ? null : 'didattica')}
                    className={`w-full flex items-center justify-between p-4 transition-all ${
                      isDidatticaActive ? colors.primary.text : colors.text.primary
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isDidatticaActive ? colors.primary.softBg : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        <BookOpen className={`w-6 h-6 ${isDidatticaActive ? colors.primary.text : 'text-green-600 dark:text-green-400'}`} />
                      </div>
                      <span className="font-semibold text-lg">Didattica</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedSection === 'didattica' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'didattica' && (
                    <div className={`px-4 pb-4 pt-2 border-t ${colors.border.primary}`}>
                      <div className="space-y-1">
                        {didatticaItems.map((item) => {
                          const isActive = pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setExpandedSection(null);
                              }}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                                isActive
                                  ? `${colors.primary.softBg} ${colors.primary.text}`
                                  : `${colors.text.secondary} hover:${colors.background.secondary}`
                              }`}
                            >
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Registro Section */}
                <div className={`rounded-2xl overflow-hidden ${colors.background.card}`}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'registro' ? null : 'registro')}
                    className={`w-full flex items-center justify-between p-4 transition-all ${
                      isRegistroActive ? colors.primary.text : colors.text.primary
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isRegistroActive ? colors.primary.softBg : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        <ClipboardCheck className={`w-6 h-6 ${isRegistroActive ? colors.primary.text : 'text-amber-600 dark:text-amber-400'}`} />
                      </div>
                      <span className="font-semibold text-lg">Registro</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedSection === 'registro' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'registro' && (
                    <div className={`px-4 pb-4 pt-2 border-t ${colors.border.primary}`}>
                      <div className="space-y-1">
                        {registroItems.map((item) => {
                          const isActive = pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setExpandedSection(null);
                              }}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                                isActive
                                  ? `${colors.primary.softBg} ${colors.primary.text}`
                                  : `${colors.text.secondary} hover:${colors.background.secondary}`
                              }`}
                            >
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Links: Calendario, Statistiche, Messaggi */}
                <div className="space-y-3">
                  {navItems.filter(item => item.href !== '/dashboard').map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setExpandedSection(null);
                        }}
                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                          isActive
                            ? `${colors.primary.gradient} text-white shadow-lg`
                            : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20' : colors.background.secondary
                        }`}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <span className="font-semibold text-lg">{item.label}</span>
                      </Link>
                    );
                  })}
                  <Link
                    href="/messaggi"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setExpandedSection(null);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all relative ${
                      pathname === '/messaggi'
                        ? `${colors.primary.gradient} text-white shadow-lg`
                        : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${
                      pathname === '/messaggi' ? 'bg-white/20' : colors.background.secondary
                    }`}>
                      <MessageSquare className="w-6 h-6" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold">
                          {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-lg">Messaggi</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Student Navigation */}
            {isStudent && studentCanNavigate && (
              <div className="space-y-3">
                {/* Grid layout for student nav items */}
                <div className="grid grid-cols-2 gap-3">
                  {studentNavItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setExpandedSection(null);
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                          isActive
                            ? `${colors.primary.gradient} text-white shadow-lg`
                            : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20' : colors.background.secondary
                        }`}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <span className="font-medium text-sm text-center">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Communication Links */}
                <div className={`rounded-2xl ${colors.background.card} p-4`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${colors.text.muted} mb-3`}>
                    Comunicazione
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href="/messaggi"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setExpandedSection(null);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        pathname === '/messaggi'
                          ? `${colors.primary.softBg} ${colors.primary.text}`
                          : `${colors.background.secondary} ${colors.text.primary}`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-medium">Messaggi</span>
                      </div>
                      {unreadMessagesCount > 0 && (
                        <span className="min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center bg-red-500 text-white">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/notifiche"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setExpandedSection(null);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        pathname === '/notifiche'
                          ? `${colors.primary.softBg} ${colors.primary.text}`
                          : `${colors.background.secondary} ${colors.text.primary}`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5" />
                        <span className="font-medium">Notifiche</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center bg-red-500 text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className={`p-4 border-t ${colors.border.primary} ${colors.background.card}`}>
            <div className="flex items-center gap-3">
              <Link
                href="/profilo"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setExpandedSection(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} transition-colors`}
              >
                <Eye className="w-5 h-5" />
                <span className="font-medium">Profilo</span>
              </Link>
              <Link
                href="/impostazioni"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setExpandedSection(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} transition-colors`}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Impostazioni</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setExpandedSection(null);
                  handleLogout();
                }}
                disabled={loggingOut}
                className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
              >
                {loggingOut ? (
                  <div className="w-5 h-5 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
