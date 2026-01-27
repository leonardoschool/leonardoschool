/**
 * Leonardo School Mobile - Profile & Settings Screen
 * 
 * Profilo utente e impostazioni unificati, allineati alla webapp.
 * Combina le funzionalità di /profilo e /impostazioni della webapp.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  Pressable,
  Alert,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, getThemedColor } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/stores/authStore';
import { PageLoader, Spinner } from '@/components/ui/Loader';
import { useTheme } from '@/contexts/ThemeContext';
import firebaseAuth from '@/lib/firebase/auth';

// Role configuration
const roleConfig = {
  ADMIN: { label: 'Amministratore', icon: '👑', color: colors.roles.admin },
  COLLABORATOR: { label: 'Collaboratore', icon: '🤝', color: colors.roles.collaborator },
  STUDENT: { label: 'Studente', icon: '📚', color: colors.roles.student },
};

// Relationship labels
const relationshipLabels: Record<string, string> = {
  MOTHER: 'Madre',
  FATHER: 'Padre',
  LEGAL_GUARDIAN: 'Tutore Legale',
  OTHER: 'Altro',
};

// Theme type
type ThemeMode = 'light' | 'dark' | 'system';

// Notification categories matching webapp
const NOTIFICATION_CATEGORIES = {
  account: {
    label: 'Account e Registrazione',
    icon: 'person-add' as const,
    types: ['ACCOUNT_ACTIVATED', 'NEW_REGISTRATION', 'PROFILE_COMPLETED']
  },
  contracts: {
    label: 'Contratti',
    icon: 'document-text' as const,
    types: ['CONTRACT_ASSIGNED', 'CONTRACT_SIGNED', 'CONTRACT_REMINDER', 'CONTRACT_EXPIRED', 'CONTRACT_CANCELLED']
  },
  events: {
    label: 'Eventi e Calendario',
    icon: 'calendar' as const,
    types: ['EVENT_INVITATION', 'EVENT_REMINDER', 'EVENT_UPDATED', 'EVENT_CANCELLED']
  },
  simulations: {
    label: 'Simulazioni',
    icon: 'clipboard' as const,
    types: ['SIMULATION_ASSIGNED', 'SIMULATION_REMINDER', 'SIMULATION_READY', 'SIMULATION_STARTED', 'SIMULATION_RESULTS', 'SIMULATION_COMPLETED']
  },
  materials: {
    label: 'Materiali',
    icon: 'book' as const,
    types: ['MATERIAL_AVAILABLE']
  },
  messages: {
    label: 'Messaggi',
    icon: 'chatbubble' as const,
    types: ['MESSAGE_RECEIVED']
  },
  groups: {
    label: 'Gruppi',
    icon: 'people' as const,
    types: ['GROUP_MEMBER_ADDED', 'GROUP_REFERENT_ASSIGNED']
  }
};

export default function ProfileScreen() {
  const systemColorScheme = useColorScheme() ?? 'light';
  const { themePreference, setThemePreference } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Active section for accordion-style navigation
  const [activeSection, setActiveSection] = useState<'profile' | 'settings' | null>('profile');
  
  // Settings states
  const [notificationSounds, setNotificationSounds] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Fetch student profile
  const { 
    data: studentProfile, 
    isLoading: studentLoading,
    refetch: refetchStudentProfile 
  } = trpc.students.getProfile.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  // Fetch student contract
  const { 
    data: studentContract, 
    isLoading: contractLoading,
    refetch: refetchContract
  } = trpc.contracts.getMyContract.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  // Fetch group memberships
  const { 
    data: groupsData, 
    refetch: refetchGroups 
  } = trpc.groups.getMyGroups.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  // Fetch parent/guardian data
  const { 
    data: parentGuardian, 
    isLoading: parentLoading,
    refetch: refetchParent 
  } = trpc.students.getMyParentGuardian.useQuery(undefined, {
    enabled: !!user && user.role === 'STUDENT',
  });

  // Fetch notification preferences
  const { 
    data: notificationPrefs, 
    isLoading: prefsLoading,
    refetch: refetchPrefs 
  } = trpc.notifications.getPreferences.useQuery(undefined, {
    enabled: !!user,
  });

  // Update notification preference mutation
  const updatePrefMutation = trpc.notifications.updatePreference.useMutation({
    onSuccess: () => {
      refetchPrefs();
    },
  });

  // Disable all emails mutation
  const disableAllEmailsMutation = trpc.notifications.disableAllEmails.useMutation({
    onSuccess: () => {
      Alert.alert('Successo', 'Tutte le notifiche email sono state disabilitate.');
      refetchPrefs();
    },
  });

  // Reset preferences mutation
  const resetPrefsMutation = trpc.notifications.resetPreferences.useMutation({
    onSuccess: () => {
      Alert.alert('Successo', 'Le preferenze di notifica sono state ripristinate.');
      refetchPrefs();
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  const isLoading = studentLoading || contractLoading || parentLoading;

  // Load notification sounds preference
  useEffect(() => {
    AsyncStorage.getItem('notificationSounds').then(value => {
      setNotificationSounds(value === 'true');
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStudentProfile(),
      refetchContract(),
      refetchGroups(),
      refetchParent(),
      refetchPrefs(),
    ]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Esci', 
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await logout();
              router.replace('/login');
            })();
          }
        },
      ]
    );
  };

  const handleThemeChange = useCallback((newTheme: ThemeMode) => {
    setThemePreference(newTheme);
  }, [setThemePreference]);

  const handleSoundsChange = useCallback(async (enabled: boolean) => {
    setNotificationSounds(enabled);
    await AsyncStorage.setItem('notificationSounds', enabled ? 'true' : 'false');
  }, []);

  const handleNotificationToggle = useCallback((notificationType: string, field: 'inAppEnabled' | 'emailEnabled', newValue: boolean) => {
    updatePrefMutation.mutate({
      notificationType: notificationType as never,
      [field]: newValue,
    });
  }, [updatePrefMutation]);

  // Get preference for a specific type
  const getPref = useCallback((type: string) => {
    return notificationPrefs?.find((p: { notificationType: string }) => p.notificationType === type) || {
      notificationType: type,
      inAppEnabled: true,
      emailEnabled: true,
    };
  }, [notificationPrefs]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  const profile = user.role === 'STUDENT' ? studentProfile : null;
  const roleInfo = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.STUDENT;
  const groups = (groupsData as { id?: string; name?: string; color?: string | null }[] | undefined) || [];
  const colorScheme = themePreference === 'system' ? systemColorScheme : themePreference;

  // Format address helper
  const formatAddress = (data: { address?: string; city?: string; province?: string; postalCode?: string } | null) => {
    if (!data) return null;
    const parts = [
      data.address,
      data.city,
      data.province ? `(${data.province})` : null,
      data.postalCode
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: getThemedColor(colors.background.primary, colorScheme) }]} 
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Contract Alert */}
        {studentContract?.status === 'PENDING' && (
          <ContractAlert contract={studentContract} colorScheme={colorScheme} />
        )}

        {/* Header Card with Gradient */}
      <View style={[styles.headerCard, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
        <LinearGradient
          colors={[colors.primary.main, colors.primary.dark, colors.primary.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBanner}
        />
        
        {/* Profile Info */}
        <View style={styles.profileInfoContainer}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          
          {/* Name & Role */}
          <Text style={[styles.userName, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
            {user.name}
          </Text>
          
          <View style={styles.badgesContainer}>
            {/* Role Badge */}
            <View style={[styles.roleBadge, { backgroundColor: roleInfo.color.light }]}>
              <Text style={styles.roleIcon}>{roleInfo.icon}</Text>
              <Text style={[styles.roleLabel, { color: roleInfo.color.main }]}>
                {roleInfo.label}
              </Text>
            </View>
            
            {/* Matricola Badge */}
            {user.role === 'STUDENT' && (profile as { matricola?: string })?.matricola && (
              <View style={[styles.matricolaBadge, { backgroundColor: getThemedColor(colors.background.secondary, colorScheme) }]}>
                <Text style={[styles.matricolaText, { color: getThemedColor(colors.text.secondary, colorScheme) }]}>
                  {(profile as { matricola: string }).matricola}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Signed Contract Info */}
      {studentContract?.status === 'SIGNED' && (
        <SignedContractCard contract={studentContract} colorScheme={colorScheme} />
      )}

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        <Pressable
          style={[
            styles.sectionTab,
            activeSection === 'profile' && styles.sectionTabActive,
            { borderColor: activeSection === 'profile' ? colors.primary.main : getThemedColor(colors.border.primary, colorScheme) }
          ]}
          onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
        >
          <Ionicons 
            name="person" 
            size={18} 
            color={activeSection === 'profile' ? colors.primary.main : getThemedColor(colors.text.secondary, colorScheme)} 
          />
          <Text style={[
            styles.sectionTabText,
            { color: activeSection === 'profile' ? colors.primary.main : getThemedColor(colors.text.primary, colorScheme) }
          ]}>
            Profilo
          </Text>
        </Pressable>
        
        <Pressable
          style={[
            styles.sectionTab,
            activeSection === 'settings' && styles.sectionTabActive,
            { borderColor: activeSection === 'settings' ? colors.primary.main : getThemedColor(colors.border.primary, colorScheme) }
          ]}
          onPress={() => setActiveSection(activeSection === 'settings' ? null : 'settings')}
        >
          <Ionicons 
            name="settings" 
            size={18} 
            color={activeSection === 'settings' ? colors.primary.main : getThemedColor(colors.text.secondary, colorScheme)} 
          />
          <Text style={[
            styles.sectionTabText,
            { color: activeSection === 'settings' ? colors.primary.main : getThemedColor(colors.text.primary, colorScheme) }
          ]}>
            Impostazioni
          </Text>
        </Pressable>
      </View>

      {/* PROFILE SECTION */}
      {activeSection === 'profile' && (
        <>
          {/* Account Info Section */}
          <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
              <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Informazioni Account
              </Text>
            </View>
            
            <View style={styles.infoRows}>
              <InfoRow icon="mail" label="Email" value={user.email} colorScheme={colorScheme} />
              <InfoRow icon="person" label="Nome completo" value={user.name || 'Non specificato'} colorScheme={colorScheme} />
              <InfoRow 
                icon="calendar" 
                label="Membro dal" 
                value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('it-IT', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }) : '-'} 
                colorScheme={colorScheme} 
              />
            </View>
          </View>

          {/* Personal Data Section */}
          {profile && (
            <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
                <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                  Dati Personali
                </Text>
              </View>
              
              <View style={styles.infoRows}>
                <InfoRow 
                  icon="call" 
                  label="Telefono" 
                  value={(profile as { phone?: string }).phone || 'Non specificato'} 
                  colorScheme={colorScheme} 
                />
                <InfoRow 
                  icon="card" 
                  label="Codice Fiscale" 
                  value={(profile as { fiscalCode?: string }).fiscalCode || 'Non specificato'} 
                  colorScheme={colorScheme} 
                />
                {(profile as { dateOfBirth?: Date }).dateOfBirth && (
                  <InfoRow 
                    icon="calendar" 
                    label="Data di nascita" 
                    value={new Date((profile as { dateOfBirth: Date }).dateOfBirth).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} 
                    colorScheme={colorScheme} 
                  />
                )}
                {formatAddress(profile as { address?: string; city?: string; province?: string; postalCode?: string }) && (
                  <InfoRow 
                    icon="location" 
                    label="Indirizzo" 
                    value={formatAddress(profile as { address?: string; city?: string; province?: string; postalCode?: string }) || ''} 
                    colorScheme={colorScheme} 
                  />
                )}
              </View>
            </View>
          )}

          {/* Groups Section - Students Only */}
          {user.role === 'STUDENT' && groups.length > 0 && (
            <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
                <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                  I Miei Gruppi
                </Text>
              </View>
              
              <View style={styles.groupsContainer}>
                {groups.filter(g => g.id && g.name).map((group) => (
                  <View 
                    key={group.id}
                    style={[
                      styles.groupBadge,
                      { 
                        backgroundColor: group.color ? `${group.color}20` : getThemedColor(colors.background.secondary, colorScheme),
                        borderColor: group.color || colors.neutral[300],
                      }
                    ]}
                  >
                    <Text style={[styles.groupBadgeText, { color: group.color || getThemedColor(colors.text.primary, colorScheme) }]}>
                      {group.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Parent/Guardian Section - Students Only */}
          {user.role === 'STUDENT' && parentGuardian && (
            <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="heart" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
                <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                  Genitore/Tutore Legale
                </Text>
              </View>
              
              <View style={styles.infoRows}>
                <InfoRow 
                  icon="person" 
                  label="Parentela" 
                  value={relationshipLabels[parentGuardian.relationship || ''] || parentGuardian.relationship || '-'} 
                  colorScheme={colorScheme} 
                />
                <InfoRow 
                  icon="person" 
                  label="Nome completo" 
                  value={`${parentGuardian.firstName} ${parentGuardian.lastName}`} 
                  colorScheme={colorScheme} 
                />
                <InfoRow 
                  icon="card" 
                  label="Codice Fiscale" 
                  value={parentGuardian.fiscalCode || '-'} 
                  colorScheme={colorScheme} 
                />
                <InfoRow 
                  icon="call" 
                  label="Telefono" 
                  value={parentGuardian.phone || '-'} 
                  colorScheme={colorScheme} 
                />
                {parentGuardian.email && (
                  <InfoRow 
                    icon="mail" 
                    label="Email" 
                    value={parentGuardian.email} 
                    colorScheme={colorScheme} 
                  />
                )}
              </View>
            </View>
          )}

          {/* Status Cards */}
          <View style={styles.statusCardsContainer}>
            <StatusCard 
              label="Stato Account" 
              value={user.isActive ? 'Attivo' : 'In attesa'} 
              status={user.isActive ? 'success' : 'warning'} 
              icon={user.isActive ? 'checkmark-circle' : 'time'}
              colorScheme={colorScheme}
            />
            <StatusCard 
              label="Email Verificata" 
              value={user.emailVerified ? 'Sì' : 'No'} 
              status={user.emailVerified ? 'success' : 'warning'} 
              icon={user.emailVerified ? 'checkmark-circle' : 'alert'}
              colorScheme={colorScheme}
            />
            <StatusCard 
              label="Profilo Completo" 
              value={user.profileCompleted ? 'Sì' : 'No'} 
              status={user.profileCompleted ? 'success' : 'warning'} 
              icon={user.profileCompleted ? 'checkmark-circle' : 'alert'}
              colorScheme={colorScheme}
            />
          </View>
        </>
      )}

      {/* SETTINGS SECTION */}
      {activeSection === 'settings' && (
        <>
          {/* Theme Settings */}
          <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
              <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Aspetto
              </Text>
            </View>
            
            <Text style={[styles.settingLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
              Tema
            </Text>
            <View style={styles.themeOptions}>
              <ThemeOption 
                label="Chiaro" 
                icon="sunny" 
                selected={themePreference === 'light'} 
                onSelect={() => handleThemeChange('light')}
                colorScheme={colorScheme}
              />
              <ThemeOption 
                label="Scuro" 
                icon="moon" 
                selected={themePreference === 'dark'} 
                onSelect={() => handleThemeChange('dark')}
                colorScheme={colorScheme}
              />
              <ThemeOption 
                label="Sistema" 
                icon="phone-portrait" 
                selected={themePreference === 'system'} 
                onSelect={() => handleThemeChange('system')}
                colorScheme={colorScheme}
              />
            </View>
          </View>

          {/* Notification Settings */}
          <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
              <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Notifiche
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Pressable
                style={[styles.quickActionButton, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}
                onPress={() => disableAllEmailsMutation.mutate()}
                disabled={disableAllEmailsMutation.isPending}
              >
                {disableAllEmailsMutation.isPending ? (
                  <Spinner size="small" />
                ) : (
                  <Ionicons name="mail-outline" size={16} color={getThemedColor(colors.text.secondary, colorScheme)} />
                )}
                <Text style={[styles.quickActionText, { color: getThemedColor(colors.text.secondary, colorScheme) }]}>
                  Disabilita email
                </Text>
              </Pressable>
              
              <Pressable
                style={[styles.quickActionButton, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}
                onPress={() => resetPrefsMutation.mutate()}
                disabled={resetPrefsMutation.isPending}
              >
                {resetPrefsMutation.isPending ? (
                  <Spinner size="small" />
                ) : (
                  <Ionicons name="refresh" size={16} color={getThemedColor(colors.text.secondary, colorScheme)} />
                )}
                <Text style={[styles.quickActionText, { color: getThemedColor(colors.text.secondary, colorScheme) }]}>
                  Ripristina
                </Text>
              </Pressable>
            </View>

            {/* Notification Sounds Toggle */}
            <View style={[styles.settingRow, { borderBottomColor: getThemedColor(colors.border.primary, colorScheme) }]}>
              <View style={styles.settingRowLeft}>
                <Ionicons name="volume-high" size={20} color={getThemedColor(colors.text.secondary, colorScheme)} />
                <View style={styles.settingRowText}>
                  <Text style={[styles.settingRowLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                    Suoni notifiche
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.neutral[500] }]}>
                    Riproduci suoni per le notifiche
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSounds}
                onValueChange={handleSoundsChange}
                trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                thumbColor={notificationSounds ? colors.primary.main : colors.neutral[100]}
              />
            </View>

            {/* Notification Categories */}
            {prefsLoading ? (
              <View style={styles.loadingContainer}>
                <Spinner size="large" />
              </View>
            ) : (
              <View style={styles.notificationCategories}>
                <Text style={[styles.settingLabel, { color: getThemedColor(colors.text.primary, colorScheme), marginBottom: 8 }]}>
                  Categorie di notifica
                </Text>
                {Object.entries(NOTIFICATION_CATEGORIES).map(([key, category]) => (
                  <NotificationCategoryRow
                    key={key}
                    icon={category.icon}
                    label={category.label}
                    types={category.types}
                    getPref={getPref}
                    onToggle={handleNotificationToggle}
                    isUpdating={updatePrefMutation.isPending}
                    colorScheme={colorScheme}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Privacy & Security */}
          <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
              <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Privacy e Sicurezza
              </Text>
            </View>

            <Pressable
              style={[styles.settingRow, { borderBottomColor: getThemedColor(colors.border.primary, colorScheme) }]}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons name="lock-closed" size={20} color={getThemedColor(colors.text.secondary, colorScheme)} />
                <View style={styles.settingRowText}>
                  <Text style={[styles.settingRowLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                    Cambia password
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.neutral[500] }]}>
                    Aggiorna la password del tuo account
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
            </Pressable>

            <Pressable
              style={[styles.settingRow, { borderBottomWidth: 0 }]}
              onPress={() => Alert.alert('Prossimamente', 'Questa funzionalità sarà disponibile a breve.')}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons name="finger-print" size={20} color={getThemedColor(colors.text.secondary, colorScheme)} />
                <View style={styles.settingRowText}>
                  <Text style={[styles.settingRowLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                    Autenticazione biometrica
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.neutral[500] }]}>
                    Usa Face ID o Touch ID
                  </Text>
                </View>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Presto</Text>
              </View>
            </Pressable>
          </View>

          {/* Language Settings */}
          <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="globe" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
              <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Lingua e Regione
              </Text>
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingRowLeft}>
                <Text style={styles.flagEmoji}>🇮🇹</Text>
                <View style={styles.settingRowText}>
                  <Text style={[styles.settingRowLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                    Italiano
                  </Text>
                  <Text style={[styles.settingRowDesc, { color: colors.neutral[500] }]}>
                    Lingua dell&apos;applicazione
                  </Text>
                </View>
              </View>
              <Ionicons name="checkmark" size={20} color={colors.primary.main} />
            </View>
          </View>
        </>
      )}

      {/* Logout Button - Always visible */}
      <Pressable
        style={[styles.logoutButton, { borderColor: colors.status.error.main }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.status.error.main} />
        <Text style={[styles.logoutButtonText, { color: colors.status.error.main }]}>
          Esci
        </Text>
      </Pressable>

      <View style={styles.bottomSpacer} />

      {/* Password Change Modal */}
      <PasswordChangeModal 
        visible={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)}
        colorScheme={colorScheme}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== HELPER COMPONENTS ====================

function ThemeOption({ 
  label, 
  icon, 
  selected, 
  onSelect,
  colorScheme
}: Readonly<{ 
  label: string; 
  icon: keyof typeof Ionicons.glyphMap; 
  selected: boolean; 
  onSelect: () => void;
  colorScheme: 'light' | 'dark';
}>) {
  return (
    <Pressable
      style={[
        styles.themeOption,
        selected && styles.themeOptionSelected,
        { 
          borderColor: selected ? colors.primary.main : getThemedColor(colors.border.primary, colorScheme),
          backgroundColor: selected ? `${colors.primary.main}10` : 'transparent',
        }
      ]}
      onPress={onSelect}
    >
      <Ionicons 
        name={icon} 
        size={24} 
        color={selected ? colors.primary.main : getThemedColor(colors.text.secondary, colorScheme)} 
      />
      <Text style={[
        styles.themeOptionLabel,
        { color: selected ? colors.primary.main : getThemedColor(colors.text.primary, colorScheme) }
      ]}>
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark" size={16} color={colors.primary.main} />
      )}
    </Pressable>
  );
}

function NotificationCategoryRow({
  icon,
  label,
  types,
  getPref,
  onToggle,
  isUpdating,
  colorScheme
}: Readonly<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  types: readonly string[];
  getPref: (type: string) => { notificationType: string; inAppEnabled: boolean; emailEnabled: boolean };
  onToggle: (type: string, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => void;
  isUpdating: boolean;
  colorScheme: 'light' | 'dark';
}>) {
  // Check if all types in this category have the same value
  const allInAppEnabled = types.every(type => getPref(type).inAppEnabled);
  const allEmailEnabled = types.every(type => getPref(type).emailEnabled);

  const handleCategoryToggle = (field: 'inAppEnabled' | 'emailEnabled') => {
    const currentAll = field === 'inAppEnabled' ? allInAppEnabled : allEmailEnabled;
    const newValue = !currentAll;
    types.forEach(type => {
      onToggle(type, field, newValue);
    });
  };

  return (
    <View style={[styles.notificationCategory, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}>
      <View style={styles.notificationCategoryLeft}>
        <Ionicons name={icon} size={18} color={getThemedColor(colors.text.secondary, colorScheme)} />
        <Text style={[styles.notificationCategoryLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
          {label}
        </Text>
      </View>
      <View style={styles.notificationCategoryToggles}>
        <Pressable
          style={[
            styles.toggleBadge,
            { 
              backgroundColor: allInAppEnabled ? colors.status.success.light : getThemedColor(colors.background.secondary, colorScheme),
            }
          ]}
          onPress={() => handleCategoryToggle('inAppEnabled')}
          disabled={isUpdating}
        >
          <Ionicons 
            name="notifications" 
            size={12} 
            color={allInAppEnabled ? colors.status.success.main : colors.neutral[400]} 
          />
        </Pressable>
        <Pressable
          style={[
            styles.toggleBadge,
            { 
              backgroundColor: allEmailEnabled ? colors.status.success.light : getThemedColor(colors.background.secondary, colorScheme),
            }
          ]}
          onPress={() => handleCategoryToggle('emailEnabled')}
          disabled={isUpdating}
        >
          <Ionicons 
            name="mail" 
            size={12} 
            color={allEmailEnabled ? colors.status.success.main : colors.neutral[400]} 
          />
        </Pressable>
      </View>
    </View>
  );
}

function PasswordChangeModal({ 
  visible, 
  onClose,
  colorScheme
}: Readonly<{ 
  visible: boolean; 
  onClose: () => void;
  colorScheme: 'light' | 'dark';
}>) {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Errore', 'Compila tutti i campi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non corrispondono.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Errore', 'La nuova password deve essere di almeno 8 caratteri.');
      return;
    }

    setIsLoading(true);
    try {
      // First reauthenticate with current password
      if (!user?.email) {
        throw new Error('Email utente non disponibile');
      }
      await firebaseAuth.reauthenticate(user.email, currentPassword);
      // Then update password
      await firebaseAuth.updatePassword(newPassword);
      Alert.alert('Successo', 'Password aggiornata con successo.');
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore';
      if (errorMessage.includes('wrong-password') || errorMessage.includes('invalid-credential')) {
        Alert.alert('Errore', 'La password attuale non è corretta.');
      } else if (errorMessage.includes('requires-recent-login')) {
        Alert.alert('Errore', 'Devi effettuare nuovamente il login per cambiare la password.');
      } else {
        Alert.alert('Errore', 'Impossibile aggiornare la password. Riprova più tardi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
              Cambia Password
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={getThemedColor(colors.text.secondary, colorScheme)} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Password attuale
              </Text>
              <View style={[styles.inputWrapper, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}>
                <TextInput
                  style={[styles.input, { color: getThemedColor(colors.text.primary, colorScheme) }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral[400]}
                />
                <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <Ionicons 
                    name={showCurrentPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.neutral[400]} 
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Nuova password
              </Text>
              <View style={[styles.inputWrapper, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}>
                <TextInput
                  style={[styles.input, { color: getThemedColor(colors.text.primary, colorScheme) }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral[400]}
                />
                <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons 
                    name={showNewPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.neutral[400]} 
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Conferma nuova password
              </Text>
              <View style={[styles.inputWrapper, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}>
                <TextInput
                  style={[styles.input, { color: getThemedColor(colors.text.primary, colorScheme) }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <Pressable 
              style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: getThemedColor(colors.border.primary, colorScheme) }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
                Annulla
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: colors.primary.main }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner size="small" variant="white" />
              ) : (
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  Aggiorna
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContractAlert({ contract, colorScheme }: Readonly<{ contract: any; colorScheme: 'light' | 'dark' }>) {
  if (!contract?.id || !contract?.signToken || !contract?.template) return null;
  
  const daysLeft = contract.expiresAt 
    ? Math.ceil((new Date(contract.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Dynamic colors for dark mode support
  const cardBg = colorScheme === 'dark' 
    ? 'rgba(234, 179, 8, 0.15)' // yellow with low opacity for dark mode
    : colors.status.warning.light;
  const cardBorder = colorScheme === 'dark'
    ? 'rgba(234, 179, 8, 0.4)'
    : colors.status.warning.main;
  const titleColor = colorScheme === 'dark' 
    ? '#FACC15' // yellow-400 for dark mode
    : colors.status.warning.text;
  const descColor = colorScheme === 'dark'
    ? '#FDE047' // yellow-300 for dark mode  
    : colors.status.warning.dark;
  const defaultDaysColor = colorScheme === 'dark' ? colors.neutral[400] : colors.neutral[500];
  const daysColor = daysLeft !== null && daysLeft <= 3 ? colors.status.error.main : defaultDaysColor;

  return (
    <View style={[styles.contractAlert, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.contractAlertContent}>
        <View style={[styles.contractAlertIcon, { backgroundColor: colors.status.warning.main }]}>
          <Ionicons name="document-text" size={24} color="white" />
        </View>
        <View style={styles.contractAlertText}>
          <Text style={[styles.contractAlertTitle, { color: titleColor }]}>
            Contratto da firmare
          </Text>
          <Text style={[styles.contractAlertDesc, { color: descColor }]}>
            Hai un contratto &quot;{contract.template.name}&quot; in attesa di firma.
          </Text>
          {daysLeft !== null && daysLeft > 0 && (
            <Text style={[styles.contractAlertDays, { color: daysColor }]}>
              {daysLeft === 1 ? 'Scade domani' : `Scade tra ${daysLeft} giorni`}
            </Text>
          )}
        </View>
      </View>
      <Pressable 
        style={[styles.contractAlertButton, { backgroundColor: colors.primary.main }]}
        onPress={() => {
          Alert.alert('Contratto', 'Apri la webapp per firmare il contratto.');
        }}
      >
        <Ionicons name="document-text" size={16} color="white" />
        <Text style={styles.contractAlertButtonText}>Firma ora</Text>
      </Pressable>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SignedContractCard({ contract, colorScheme }: Readonly<{ contract: any; colorScheme: 'light' | 'dark' }>) {
  if (!contract?.id || !contract?.template) return null;

  // Dynamic colors for dark mode support
  const cardBg = colorScheme === 'dark' 
    ? 'rgba(34, 197, 94, 0.15)' // green with low opacity for dark mode
    : colors.status.success.light;
  const cardBorder = colorScheme === 'dark'
    ? 'rgba(34, 197, 94, 0.4)'
    : colors.status.success.main;
  const titleColor = colorScheme === 'dark' 
    ? '#4ADE80' // green-400 for dark mode
    : colors.status.success.text;
  const descColor = colorScheme === 'dark'
    ? '#86EFAC' // green-300 for dark mode  
    : colors.status.success.dark;
  const dateColor = colorScheme === 'dark'
    ? colors.neutral[400]
    : colors.neutral[500];

  return (
    <View style={[styles.signedContractCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={[styles.signedContractIcon, { backgroundColor: colors.status.success.main }]}>
        <Ionicons name="checkmark-circle" size={20} color="white" />
      </View>
      <View style={styles.signedContractText}>
        <Text style={[styles.signedContractTitle, { color: titleColor }]}>
          Contratto Attivo
        </Text>
        <Text style={[styles.signedContractDesc, { color: descColor }]}>
          {contract.template.name}
          {contract.template.duration && ` - ${contract.template.duration}`}
        </Text>
        {contract.signedAt && (
          <Text style={[styles.signedContractDate, { color: dateColor }]}>
            Firmato il {new Date(contract.signedAt).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        )}
      </View>
    </View>
  );
}

function InfoRow({ 
  icon, 
  label, 
  value, 
  colorScheme 
}: Readonly<{ 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  value: string;
  colorScheme: 'light' | 'dark';
}>) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.neutral[500]} style={styles.infoRowIcon} />
      <View style={styles.infoRowContent}>
        <Text style={[styles.infoRowLabel, { color: colors.neutral[500] }]}>{label}</Text>
        <Text style={[styles.infoRowValue, { color: getThemedColor(colors.text.primary, colorScheme) }]}>{value}</Text>
      </View>
    </View>
  );
}

function StatusCard({ 
  label, 
  value, 
  status,
  icon,
  colorScheme
}: Readonly<{ 
  label: string; 
  value: string; 
  status: 'success' | 'warning' | 'error';
  icon: keyof typeof Ionicons.glyphMap;
  colorScheme: 'light' | 'dark';
}>) {
  const statusColors = {
    success: colors.status.success,
    warning: colors.status.warning,
    error: colors.status.error,
  };
  
  return (
    <View style={[styles.statusCard, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
      <Ionicons name={icon} size={20} color={statusColors[status].text} />
      <View style={styles.statusCardContent}>
        <Text style={[styles.statusCardLabel, { color: colors.neutral[500] }]}>{label}</Text>
        <Text style={[styles.statusCardValue, { color: statusColors[status].text }]}>{value}</Text>
      </View>
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Header Card
  headerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientBanner: {
    height: 100,
  },
  profileInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: -50,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleIcon: {
    fontSize: 14,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  matricolaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matricolaText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '500',
  },

  // Section Tabs
  sectionTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  sectionTabActive: {
    borderWidth: 2,
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Contract Alert
  contractAlert: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  contractAlertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contractAlertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractAlertText: {
    flex: 1,
  },
  contractAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  contractAlertDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  contractAlertDays: {
    fontSize: 13,
    marginTop: 4,
  },
  contractAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  contractAlertButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // Signed Contract Card
  signedContractCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  signedContractIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signedContractText: {
    flex: 1,
  },
  signedContractTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  signedContractDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  signedContractDate: {
    fontSize: 12,
    marginTop: 4,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRows: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoRowIcon: {
    marginTop: 2,
  },
  infoRowContent: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 13,
  },
  infoRowValue: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },

  // Groups
  groupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  groupBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Status Cards
  statusCardsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  statusCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusCardContent: {
    flex: 1,
  },
  statusCardLabel: {
    fontSize: 10,
  },
  statusCardValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Settings styles
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  themeOptionSelected: {
    borderWidth: 2,
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingRowText: {
    flex: 1,
  },
  settingRowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  notificationCategories: {
    marginTop: 8,
  },
  notificationCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  notificationCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationCategoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  notificationCategoryToggles: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonBadge: {
    backgroundColor: colors.status.info.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.status.info.main,
  },
  flagEmoji: {
    fontSize: 20,
  },

  // Logout Button
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 100,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {},
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
