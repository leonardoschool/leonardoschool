/**
 * Leonardo School Mobile - Profile Screen
 * 
 * Profilo utente allineato alla webapp.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, getThemedColor } from '@/lib/theme/colors';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/stores/authStore';
import { PageLoader } from '@/components/ui/Loader';

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

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { user, logout } = useAuthStore();

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

  const [refreshing, setRefreshing] = useState(false);

  const isLoading = studentLoading || contractLoading || parentLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStudentProfile(),
      refetchContract(),
      refetchGroups(),
      refetchParent(),
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
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  const profile = user.role === 'STUDENT' ? studentProfile : null;
  const roleInfo = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.STUDENT;
  const groups = (groupsData as { id?: string; name?: string; color?: string | null }[] | undefined) || [];

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
    <ScrollView
      style={[styles.container, { backgroundColor: getThemedColor(colors.background.primary, colorScheme) }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Pending Contract Alert */}
      {studentContract && studentContract.status === 'PENDING' && (
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
      {studentContract && studentContract.status === 'SIGNED' && (
        <SignedContractCard contract={studentContract} colorScheme={colorScheme} />
      )}

      {/* Account Info Section */}
      <View style={[styles.section, { backgroundColor: getThemedColor(colors.background.card, colorScheme) }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={20} color={getThemedColor(colors.text.primary, colorScheme)} />
          <Text style={[styles.sectionTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
            Informazioni Account
          </Text>
        </View>
        
        <View style={styles.infoRows}>
          <InfoRow 
            icon="mail" 
            label="Email" 
            value={user.email} 
            colorScheme={colorScheme} 
          />
          <InfoRow 
            icon="person" 
            label="Nome completo" 
            value={user.name || 'Non specificato'} 
            colorScheme={colorScheme} 
          />
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

      {/* Logout Button */}
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
    </ScrollView>
  );
}

// ==================== HELPER COMPONENTS ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContractAlert({ contract, colorScheme }: { contract: any; colorScheme: 'light' | 'dark' }) {
  if (!contract?.id || !contract?.signToken || !contract?.template) return null;
  
  const daysLeft = contract.expiresAt 
    ? Math.ceil((new Date(contract.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <View style={[styles.contractAlert, { backgroundColor: colors.status.warning.light, borderColor: colors.status.warning.main }]}>
      <View style={styles.contractAlertContent}>
        <View style={[styles.contractAlertIcon, { backgroundColor: colors.status.warning.main }]}>
          <Ionicons name="document-text" size={24} color="white" />
        </View>
        <View style={styles.contractAlertText}>
          <Text style={[styles.contractAlertTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
            Contratto da firmare
          </Text>
          <Text style={[styles.contractAlertDesc, { color: getThemedColor(colors.text.secondary, colorScheme) }]}>
            Hai un contratto &quot;{contract.template.name}&quot; in attesa di firma.
          </Text>
          {daysLeft !== null && daysLeft > 0 && (
            <Text style={[styles.contractAlertDays, { color: daysLeft <= 3 ? colors.status.error.main : colors.neutral[500] }]}>
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
function SignedContractCard({ contract, colorScheme }: { contract: any; colorScheme: 'light' | 'dark' }) {
  if (!contract?.id || !contract?.template) return null;

  return (
    <View style={[styles.signedContractCard, { backgroundColor: colors.status.success.light, borderColor: colors.status.success.main }]}>
      <View style={[styles.signedContractIcon, { backgroundColor: colors.status.success.main }]}>
        <Ionicons name="checkmark-circle" size={20} color="white" />
      </View>
      <View style={styles.signedContractText}>
        <Text style={[styles.signedContractTitle, { color: getThemedColor(colors.text.primary, colorScheme) }]}>
          Contratto Attivo
        </Text>
        <Text style={[styles.signedContractDesc, { color: getThemedColor(colors.text.secondary, colorScheme) }]}>
          {contract.template.name}
          {contract.template.duration && ` - ${contract.template.duration}`}
        </Text>
        {contract.signedAt && (
          <Text style={[styles.signedContractDate, { color: colors.neutral[500] }]}>
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
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  value: string;
  colorScheme: 'light' | 'dark';
}) {
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
}: { 
  label: string; 
  value: string; 
  status: 'success' | 'warning' | 'error';
  icon: keyof typeof Ionicons.glyphMap;
  colorScheme: 'light' | 'dark';
}) {
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
  container: {
    flex: 1,
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
    backgroundColor: colors.primary.light,
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
});
