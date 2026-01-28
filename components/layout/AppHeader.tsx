'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { firebaseAuth } from '@/lib/firebase/auth';
import { colors } from '@/lib/theme/colors';
import { playNotificationSound } from '@/lib/utils/notificationSound';
import { useFocusAwarePolling } from '@/lib/hooks/useWindowFocus';
import {
  Bell,
  Menu,
  X,
  Home,
  MessageSquare,
  ChevronDown,
  ClipboardList,
  ClipboardCheck,
  BookOpen,
  Settings,
  LogOut,
  Eye,
} from 'lucide-react';

import {
  NotificationsDropdown,
  UserMenu,
  ThemeToggle,
  NavDropdown,
  getNavigationItems,
  getNotificationNavigationUrl,
  checkCollaboratorNavigation,
  getRoleBadgeText,
  getGestioneItems,
  getRegistroItems,
  getDidatticaItems,
  getGestioneBadgeCount,
} from './appHeaderParts';
import type { Theme, NotificationData } from './appHeaderParts';

// Polling interval for real-time updates (120 seconds - optimized for cost efficiency)
// Polling is automatically disabled when tab is not focused
const POLLING_INTERVAL = 120 * 1000;

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Menu states
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
  const [effectiveLogoTheme, setEffectiveLogoTheme] = useState<'light' | 'dark'>('light');

  // Get current user
  const { data: user } = trpc.auth.me.useQuery();

  // Focus-aware polling - stops polling when tab is not active to save serverless invocations
  const focusAwarePollingInterval = useFocusAwarePolling(POLLING_INTERVAL, !!user);
  
  // Get collaborator contract status
  const { data: collaboratorContract } = trpc.contracts.getMyCollaboratorContract.useQuery(
    undefined,
    { 
      enabled: (user?.role as string) === 'COLLABORATOR', 
      retry: false,
      refetchInterval: focusAwarePollingInterval,
    }
  );
  
  // Get notifications
  const { data: notificationsData, refetch: refetchNotifications } = trpc.notifications.getNotifications.useQuery(
    { unreadOnly: true, pageSize: 10 },
    { 
      enabled: !!user,
      refetchInterval: focusAwarePollingInterval,
    }
  );
  
  const notifications = notificationsData?.notifications || [];
  const filteredNotifications = notifications.filter(n => n.type !== 'MESSAGE_RECEIVED');
  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  // Play sound on new notifications
  const prevUnreadCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadCountRef.current === null) {
      prevUnreadCountRef.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnreadCountRef.current) {
      playNotificationSound(0.5);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Stats for badges (admin only)
  const { data: jobApplicationsStats } = trpc.jobApplications.getStats.useQuery(
    undefined,
    { enabled: user?.role === 'ADMIN', refetchInterval: focusAwarePollingInterval }
  );
  const { data: contactRequestsStats } = trpc.contactRequests.getStats.useQuery(
    undefined,
    { enabled: user?.role === 'ADMIN', refetchInterval: focusAwarePollingInterval }
  );
  const { data: studentsPendingContract } = trpc.contracts.getStudentsPendingContract.useQuery(
    undefined,
    { enabled: user?.role === 'ADMIN', refetchInterval: focusAwarePollingInterval }
  );
  const { data: unreadMessagesData } = trpc.messages.getUnreadCount.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: focusAwarePollingInterval }
  );
  const unreadMessagesCount = unreadMessagesData?.unreadCount || 0;

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  // Role flags
  const isAdmin = user?.role === 'ADMIN';
  const isCollaborator = (user?.role as string) === 'COLLABORATOR';
  const isStudent = user?.role === 'STUDENT';
  const isStaff = isAdmin || isCollaborator;

  // Badge counts
  const pendingApplicationsCount = jobApplicationsStats?.pending || 0;
  const pendingContactRequestsCount = contactRequestsStats?.pending || 0;
  const pendingContractUsersCount = studentsPendingContract?.length || 0;
  const totalGestionePending = pendingApplicationsCount + pendingContactRequestsCount + pendingContractUsersCount;

  // Navigation permissions
  const collaboratorCanNavigate = checkCollaboratorNavigation(
    isCollaborator,
    user?.isActive,
    collaboratorContract?.status
  );
  const studentCanNavigate = isStudent ? user?.isActive : true;

  // Menu items
  const navItems = getNavigationItems(isAdmin, isCollaborator, isStudent);
  const gestioneItems = getGestioneItems(isAdmin);
  const registroItems = getRegistroItems(isAdmin);
  const didatticaItems = getDidatticaItems(isAdmin);

  // Check active sections
  const isGestioneActive = gestioneItems.some(item => pathname.startsWith(item.href));
  const isRegistroActive = registroItems.some(item => pathname.startsWith(item.href));
  const isDidatticaActive = didatticaItems.some(item => pathname.startsWith(item.href));

  // Theme handling
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      setEffectiveLogoTheme(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.toggle('dark', theme === 'dark');
      setEffectiveLogoTheme(theme);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (currentTheme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme]);

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    setThemeMenuOpen(false);
  };

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

  const handleNotificationClick = (notification: NotificationData) => {
    handleMarkAsRead(notification.id);
    setNotificationsOpen(false);
    const url = getNotificationNavigationUrl(notification.type, notification.linkUrl, isAdmin);
    router.push(url);
  };

  const getBadgeCountForHref = (href: string) => 
    getGestioneBadgeCount(href, isAdmin, pendingContractUsersCount, pendingApplicationsCount, pendingContactRequestsCount);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setExpandedSection(null);
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

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center flex-shrink-0">
            <div className="relative w-[10rem] h-[10rem] mt-3">
              <Image
                src={`/images/logo-${effectiveLogoTheme}.png`}
                alt="Leonardo School"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* Staff Desktop Navigation */}
          {isStaff && collaboratorCanNavigate && (
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-4 xl:gap-6">
              {/* Dashboard Link */}
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

              {/* Gestione Dropdown */}
              <NavDropdown
                label="Gestione"
                icon={ClipboardList}
                items={gestioneItems}
                isOpen={gestioneMenuOpen}
                onClose={() => setGestioneMenuOpen(false)}
                onToggle={() => setGestioneMenuOpen(!gestioneMenuOpen)}
                isActive={isGestioneActive}
                pathname={pathname}
                totalBadgeCount={isAdmin ? totalGestionePending : 0}
                getBadgeCount={getBadgeCountForHref}
              />

              {/* Didattica Dropdown */}
              <NavDropdown
                label="Didattica"
                icon={BookOpen}
                items={didatticaItems}
                isOpen={didatticaMenuOpen}
                onClose={() => setDidatticaMenuOpen(false)}
                onToggle={() => setDidatticaMenuOpen(!didatticaMenuOpen)}
                isActive={isDidatticaActive}
                pathname={pathname}
              />

              {/* Registro Dropdown */}
              <NavDropdown
                label="Registro"
                icon={ClipboardCheck}
                items={registroItems}
                isOpen={registroMenuOpen}
                onClose={() => setRegistroMenuOpen(false)}
                onToggle={() => setRegistroMenuOpen(!registroMenuOpen)}
                isActive={isRegistroActive}
                pathname={pathname}
              />

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

          {/* Student Desktop Navigation */}
          {isStudent && studentCanNavigate && (
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-6 xl:gap-8">
              {navItems.map((item) => {
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
            <ThemeToggle
              isOpen={themeMenuOpen}
              onClose={() => setThemeMenuOpen(false)}
              onToggle={() => setThemeMenuOpen(!themeMenuOpen)}
              currentTheme={currentTheme}
              onThemeChange={handleThemeChange}
            />

            {/* Messages Icon */}
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

            {/* Notifications */}
            {user && (
              <NotificationsDropdown
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                notifications={filteredNotifications as NotificationData[]}
                unreadCount={unreadCount}
                onToggle={() => setNotificationsOpen(!notificationsOpen)}
                onMarkAsRead={handleMarkAsRead}
                onNotificationClick={handleNotificationClick}
              />
            )}

            {/* User Menu */}
            <UserMenu
              isOpen={userMenuOpen}
              onClose={() => setUserMenuOpen(false)}
              onToggle={() => setUserMenuOpen(!userMenuOpen)}
              user={user}
              isAdmin={isAdmin}
              isCollaborator={isCollaborator}
              isStudent={isStudent}
              collaboratorCanNavigate={collaboratorCanNavigate}
              loggingOut={loggingOut}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <MobileMenu
          user={user}
          isAdmin={isAdmin}
          isCollaborator={isCollaborator}
          isStudent={isStudent}
          isStaff={isStaff}
          collaboratorCanNavigate={collaboratorCanNavigate}
          studentCanNavigate={studentCanNavigate ?? false}
          pathname={pathname}
          effectiveLogoTheme={effectiveLogoTheme}
          navItems={navItems}
          gestioneItems={gestioneItems}
          didatticaItems={didatticaItems}
          registroItems={registroItems}
          expandedSection={expandedSection}
          setExpandedSection={setExpandedSection}
          unreadMessagesCount={unreadMessagesCount}
          unreadCount={unreadCount}
          totalGestionePending={totalGestionePending}
          getBadgeCountForHref={getBadgeCountForHref}
          isGestioneActive={isGestioneActive}
          isDidatticaActive={isDidatticaActive}
          isRegistroActive={isRegistroActive}
          loggingOut={loggingOut}
          onClose={closeMobileMenu}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}

// Mobile Menu Component
interface MobileMenuProps {
  user: {
    name?: string | null;
    role?: string;
  } | null | undefined;
  isAdmin: boolean;
  isCollaborator: boolean;
  isStudent: boolean;
  isStaff: boolean;
  collaboratorCanNavigate: boolean;
  studentCanNavigate: boolean;
  pathname: string;
  effectiveLogoTheme: 'light' | 'dark';
  navItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  gestioneItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  didatticaItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  registroItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
  unreadMessagesCount: number;
  unreadCount: number;
  totalGestionePending: number;
  getBadgeCountForHref: (href: string) => number;
  isGestioneActive: boolean;
  isDidatticaActive: boolean;
  isRegistroActive: boolean;
  loggingOut: boolean;
  onClose: () => void;
  onLogout: () => void;
}

function MobileMenu({
  user,
  isAdmin,
  isCollaborator,
  isStudent,
  isStaff,
  collaboratorCanNavigate,
  studentCanNavigate,
  pathname,
  effectiveLogoTheme,
  navItems,
  gestioneItems,
  didatticaItems,
  registroItems,
  expandedSection,
  setExpandedSection,
  unreadMessagesCount,
  unreadCount,
  totalGestionePending,
  getBadgeCountForHref,
  isGestioneActive,
  isDidatticaActive,
  isRegistroActive,
  loggingOut,
  onClose,
  onLogout,
}: MobileMenuProps) {
  const roleBadge = getRoleBadgeText(isAdmin, isCollaborator);

  return (
    <div className={`fixed inset-0 ${colors.background.primary} z-50 lg:hidden flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${colors.border.primary} ${colors.background.card}`}>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image
              src={`/images/logo-${effectiveLogoTheme}.png`}
              alt="Leonardo School"
              fill
              className="object-contain"
            />
          </div>
          <span className={`font-bold text-lg ${colors.text.primary}`}>Leonardo School</span>
        </div>
        <button
          onClick={onClose}
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
              <p className="text-sm text-white/80">{roleBadge}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Staff Navigation */}
        {isStaff && collaboratorCanNavigate && (
          <StaffMobileNav
            pathname={pathname}
            navItems={navItems}
            gestioneItems={gestioneItems}
            didatticaItems={didatticaItems}
            registroItems={registroItems}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            unreadMessagesCount={unreadMessagesCount}
            totalGestionePending={totalGestionePending}
            getBadgeCountForHref={getBadgeCountForHref}
            isGestioneActive={isGestioneActive}
            isDidatticaActive={isDidatticaActive}
            isRegistroActive={isRegistroActive}
            isAdmin={isAdmin}
            onClose={onClose}
          />
        )}

        {/* Student Navigation */}
        {isStudent && studentCanNavigate && (
          <StudentMobileNav
            pathname={pathname}
            navItems={navItems}
            unreadMessagesCount={unreadMessagesCount}
            unreadCount={unreadCount}
            onClose={onClose}
          />
        )}
      </div>

      {/* Bottom Actions */}
      <div className={`p-4 border-t ${colors.border.primary} ${colors.background.card}`}>
        <div className="flex items-center gap-3">
          <Link href="/profilo" onClick={onClose} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} transition-colors`}>
            <Eye className="w-5 h-5" />
            <span className="font-medium">Profilo</span>
          </Link>
          <Link href="/impostazioni" onClick={onClose} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl ${colors.background.secondary} ${colors.text.primary} transition-colors`}>
            <Settings className="w-5 h-5" />
            <span className="font-medium">Impostazioni</span>
          </Link>
          <button
            onClick={() => { onClose(); onLogout(); }}
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
  );
}

// Staff Mobile Navigation
interface StaffMobileNavProps {
  pathname: string;
  navItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  gestioneItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  didatticaItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  registroItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  expandedSection: string | null;
  setExpandedSection: (section: string | null) => void;
  unreadMessagesCount: number;
  totalGestionePending: number;
  getBadgeCountForHref: (href: string) => number;
  isGestioneActive: boolean;
  isDidatticaActive: boolean;
  isRegistroActive: boolean;
  isAdmin: boolean;
  onClose: () => void;
}

function StaffMobileNav({
  pathname,
  navItems,
  gestioneItems,
  didatticaItems,
  registroItems,
  expandedSection,
  setExpandedSection,
  unreadMessagesCount,
  totalGestionePending,
  getBadgeCountForHref,
  isGestioneActive,
  isDidatticaActive,
  isRegistroActive,
  isAdmin,
  onClose,
}: StaffMobileNavProps) {
  return (
    <div className="space-y-3">
      {/* Dashboard Link */}
      <Link
        href="/dashboard"
        onClick={onClose}
        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
          pathname === '/dashboard'
            ? `${colors.primary.gradient} text-white shadow-lg`
            : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pathname === '/dashboard' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          <Home className={`w-6 h-6 ${pathname === '/dashboard' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
        </div>
        <span className="font-semibold text-lg">Dashboard</span>
      </Link>

      {/* Gestione Section */}
      <MobileExpandableSection
        title="Gestione"
        icon={ClipboardList}
        items={gestioneItems}
        isActive={isGestioneActive}
        isExpanded={expandedSection === 'gestione'}
        onToggle={() => setExpandedSection(expandedSection === 'gestione' ? null : 'gestione')}
        pathname={pathname}
        onClose={onClose}
        badgeCount={isAdmin ? totalGestionePending : undefined}
        getBadgeCount={getBadgeCountForHref}
        iconBgClass="bg-purple-100 dark:bg-purple-900/30"
        iconColorClass="text-purple-600 dark:text-purple-400"
      />

      {/* Didattica Section */}
      <MobileExpandableSection
        title="Didattica"
        icon={BookOpen}
        items={didatticaItems}
        isActive={isDidatticaActive}
        isExpanded={expandedSection === 'didattica'}
        onToggle={() => setExpandedSection(expandedSection === 'didattica' ? null : 'didattica')}
        pathname={pathname}
        onClose={onClose}
        iconBgClass="bg-green-100 dark:bg-green-900/30"
        iconColorClass="text-green-600 dark:text-green-400"
      />

      {/* Registro Section */}
      <MobileExpandableSection
        title="Registro"
        icon={ClipboardCheck}
        items={registroItems}
        isActive={isRegistroActive}
        isExpanded={expandedSection === 'registro'}
        onToggle={() => setExpandedSection(expandedSection === 'registro' ? null : 'registro')}
        pathname={pathname}
        onClose={onClose}
        iconBgClass="bg-amber-100 dark:bg-amber-900/30"
        iconColorClass="text-amber-600 dark:text-amber-400"
      />

      {/* Direct Links */}
      <div className="space-y-3">
        {navItems.filter(item => item.href !== '/dashboard').map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                isActive ? `${colors.primary.gradient} text-white shadow-lg` : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : colors.background.secondary}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">{item.label}</span>
            </Link>
          );
        })}
        
        {/* Messages Link */}
        <Link
          href="/messaggi"
          onClick={onClose}
          className={`flex items-center gap-4 p-4 rounded-2xl transition-all relative ${
            pathname === '/messaggi' ? `${colors.primary.gradient} text-white shadow-lg` : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${pathname === '/messaggi' ? 'bg-white/20' : colors.background.secondary}`}>
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
  );
}

// Mobile Expandable Section
interface MobileExpandableSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  pathname: string;
  onClose: () => void;
  badgeCount?: number;
  getBadgeCount?: (href: string) => number;
  iconBgClass: string;
  iconColorClass: string;
}

function MobileExpandableSection({
  title,
  icon: Icon,
  items,
  isActive,
  isExpanded,
  onToggle,
  pathname,
  onClose,
  badgeCount,
  getBadgeCount,
  iconBgClass,
  iconColorClass,
}: MobileExpandableSectionProps) {
  return (
    <div className={`rounded-2xl overflow-hidden ${colors.background.card}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 transition-all ${isActive ? colors.primary.text : colors.text.primary}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? colors.primary.softBg : iconBgClass}`}>
            <Icon className={`w-6 h-6 ${isActive ? colors.primary.text : iconColorClass}`} />
          </div>
          <div className="text-left">
            <span className="font-semibold text-lg">{title}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${colors.primary.gradient} text-white`}>
                {badgeCount}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className={`px-4 pb-4 pt-2 border-t ${colors.border.primary}`}>
          <div className="space-y-1">
            {items.map((item) => {
              const isItemActive = pathname.startsWith(item.href);
              const itemBadgeCount = getBadgeCount ? getBadgeCount(item.href) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    isItemActive
                      ? `${colors.primary.softBg} ${colors.primary.text}`
                      : `${colors.text.secondary} hover:${colors.background.secondary}`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {itemBadgeCount > 0 && (
                    <span className={`min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center ${colors.primary.gradient} text-white`}>
                      {itemBadgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Student Mobile Navigation
interface StudentMobileNavProps {
  pathname: string;
  navItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  unreadMessagesCount: number;
  unreadCount: number;
  onClose: () => void;
}

function StudentMobileNav({
  pathname,
  navItems,
  unreadMessagesCount,
  unreadCount,
  onClose,
}: StudentMobileNavProps) {
  return (
    <div className="space-y-3">
      {/* Grid layout for student nav items */}
      <div className="grid grid-cols-2 gap-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                isActive ? `${colors.primary.gradient} text-white shadow-lg` : `${colors.background.card} ${colors.text.primary} hover:shadow-md`
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : colors.background.secondary}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-sm text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Communication Links */}
      <div className={`rounded-2xl ${colors.background.card} p-4`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${colors.text.muted} mb-3`}>Comunicazione</h3>
        <div className="space-y-2">
          <Link
            href="/messaggi"
            onClick={onClose}
            className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
              pathname === '/messaggi' ? `${colors.primary.softBg} ${colors.primary.text}` : `${colors.background.secondary} ${colors.text.primary}`
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
            onClick={onClose}
            className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
              pathname === '/notifiche' ? `${colors.primary.softBg} ${colors.primary.text}` : `${colors.background.secondary} ${colors.text.primary}`
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
  );
}
