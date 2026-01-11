/**
 * Leonardo School Mobile - Tabs Layout
 * 
 * Layout con bottom tabs per la navigazione principale.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, StyleSheet } from 'react-native';

import { useThemedColors } from '../../contexts/ThemeContext';
import { colors } from '../../lib/theme/colors';
import { CountBadge } from '../../components/ui/Badge';
import { useNotificationStore } from '../../stores/notificationStore';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabBarIconProps {
  name: IconName;
  color: string;
  focused: boolean;
  badge?: number;
}

function TabBarIcon({ name, color, focused, badge }: TabBarIconProps) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as IconName)}
        size={24}
        color={color}
      />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badgeContainer}>
          <CountBadge count={badge} />
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const themedColors = useThemedColors();
  const { unreadCount } = useNotificationStore();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: themedColors.textMuted,
        tabBarStyle: {
          backgroundColor: themedColors.card,
          borderTopColor: themedColors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: themedColors.card,
        },
        headerTitleStyle: {
          color: themedColors.text,
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerTintColor: colors.primary.main,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="simulations"
        options={{
          title: 'Simulazioni',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="document-text" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistiche',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="stats-chart" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifiche',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="notifications"
              color={color}
              focused={focused}
              badge={unreadCount}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -12,
  },
});
