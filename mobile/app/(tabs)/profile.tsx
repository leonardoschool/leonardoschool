/**
 * Leonardo School Mobile - Profile Screen
 * 
 * Profilo utente e impostazioni account.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useThemedColors, useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { showConfirmAlert } from '../../lib/errorHandler';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightElement,
  destructive = false,
}: MenuItemProps) {
  const themedColors = useThemedColors();

  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: themedColors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconContainer,
          {
            backgroundColor: destructive
              ? colors.status.error.light
              : themedColors.backgroundSecondary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? colors.status.error.main : colors.primary.main}
        />
      </View>
      <View style={styles.menuContent}>
        <Text
          variant="body"
          style={{ color: destructive ? colors.status.error.main : themedColors.text }}
        >
          {title}
        </Text>
        {subtitle && <Caption>{subtitle}</Caption>}
      </View>
      {rightElement}
      {showArrow && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={themedColors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const themedColors = useThemedColors();
  const { themePreference, setThemePreference } = useTheme();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    showConfirmAlert(
      'Esci',
      'Sei sicuro di voler uscire dal tuo account?',
      async () => {
        await logout();
        router.replace('/(auth)/login');
      }
    );
  };

  const handleThemeToggle = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(themePreference);
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemePreference(themes[nextIndex]);
  };

  const getThemeLabel = () => {
    switch (themePreference) {
      case 'light': return 'Chiaro';
      case 'dark': return 'Scuro';
      default: return 'Sistema';
    }
  };

  // Mock user for demo
  const displayUser = user || {
    name: 'Mario Rossi',
    email: 'mario.rossi@email.com',
    role: 'STUDENT',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary.main }]}>
            <Text variant="h2" style={styles.avatarText}>
              {displayUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text variant="h4">{displayUser.name}</Text>
          <Caption>{displayUser.email}</Caption>
          <Badge variant="primary" size="sm">
            Studente
          </Badge>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Account</Heading3>
          <Card variant="outlined" padding="none">
            <MenuItem
              icon="person-outline"
              title="Modifica Profilo"
              subtitle="Dati personali e preferenze"
              onPress={() => {}}
            />
            <MenuItem
              icon="lock-closed-outline"
              title="Sicurezza"
              subtitle="Password e autenticazione"
              onPress={() => {}}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifiche"
              subtitle="Gestisci le tue notifiche"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Preferenze</Heading3>
          <Card variant="outlined" padding="none">
            <MenuItem
              icon="moon-outline"
              title="Tema"
              onPress={handleThemeToggle}
              showArrow={false}
              rightElement={
                <Badge variant="default" size="sm">{getThemeLabel()}</Badge>
              }
            />
            <MenuItem
              icon="language-outline"
              title="Lingua"
              onPress={() => {}}
              showArrow={false}
              rightElement={
                <Badge variant="default" size="sm">Italiano</Badge>
              }
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Heading3 style={styles.sectionTitle}>Supporto</Heading3>
          <Card variant="outlined" padding="none">
            <MenuItem
              icon="help-circle-outline"
              title="Centro Assistenza"
              onPress={() => {}}
            />
            <MenuItem
              icon="chatbubble-outline"
              title="Contattaci"
              onPress={() => {}}
            />
            <MenuItem
              icon="document-text-outline"
              title="Termini e Condizioni"
              onPress={() => {}}
            />
            <MenuItem
              icon="shield-outline"
              title="Privacy Policy"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Card variant="outlined" padding="none">
            <MenuItem
              icon="log-out-outline"
              title="Esci"
              onPress={handleLogout}
              showArrow={false}
              destructive
            />
          </Card>
        </View>

        {/* App version */}
        <View style={styles.versionContainer}>
          <Caption>Leonardo School v1.0.0</Caption>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  avatarText: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuContent: {
    flex: 1,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
});
