/**
 * Leonardo School Mobile - App Header Component
 * 
 * Header personalizzato con hamburger menu, titolo e icone azioni.
 * Simile all'AppHeader della webapp.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../ui/Text';
import { CountBadge } from '../ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { trpc } from '../../lib/trpc';

interface AppHeaderProps {
  title: string;
  onMenuPress: () => void;
  showBackButton?: boolean;
  rightActions?: React.ReactNode;
}

export function AppHeader({ title, onMenuPress, showBackButton = false, rightActions }: AppHeaderProps) {
  const themedColors = useThemedColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Fetch unread messages count
  const { data: unreadMessagesData } = trpc.messages.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
  });
  const unreadMessagesCount = unreadMessagesData?.unreadCount || 0;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themedColors.card,
          borderBottomColor: themedColors.border,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left side - Menu/Back button */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: themedColors.backgroundSecondary }]}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={22} color={themedColors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: themedColors.backgroundSecondary }]}
              onPress={onMenuPress}
            >
              <Ionicons name="menu" size={22} color={themedColors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Title */}
        <View style={styles.centerSection}>
          <Text variant="h4" style={{ color: themedColors.text }} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right side - Actions */}
        <View style={styles.rightSection}>
          {rightActions || (
            <>
              {/* Messages Icon */}
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: themedColors.backgroundSecondary }]}
                onPress={() => router.push('/(tabs)/messaggi' as never)}
              >
                <View style={styles.iconWithBadge}>
                  <Ionicons name="chatbubbles-outline" size={20} color={themedColors.text} />
                  {unreadMessagesCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <CountBadge count={unreadMessagesCount} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithBadge: {
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -8,
  },
});

export default AppHeader;
