/**
 * Leonardo School Mobile - Drawer Menu Component
 * 
 * Menu laterale per navigazione secondaria.
 * Contiene tutte le sezioni studente come nella webapp.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';

import { Text, Caption } from '../ui/Text';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { trpc } from '../../lib/trpc';

type IconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  id: string;
  label: string;
  icon: IconName;
  route: Href;
  badge?: number;
  description: string;
}

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  currentRoute?: string;
}

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85;

export function DrawerMenu({ visible, onClose, currentRoute }: DrawerMenuProps) {
  const themedColors = useThemedColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  // State to control Modal visibility separately from animation
  const [modalVisible, setModalVisible] = React.useState(false);
  
  // Animation values - use useRef for stable references
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show modal first, then animate
      setModalVisible(true);
      // Slide in from left with spring-like easing
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      // Animate out, then hide modal
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide modal after animation completes
        setModalVisible(false);
      });
    }
  }, [visible, modalVisible, slideAnim, backdropAnim]);

  // Fetch unread messages count
  const { data: unreadMessagesData } = trpc.messages.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
  });
  const unreadMessagesCount = unreadMessagesData?.unreadCount || 0;

  // Menu items matching webapp student navigation
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'home',
      route: '/(tabs)' as Href,
      description: 'Panoramica generale',
    },
    {
      id: 'calendario',
      label: 'Calendario',
      icon: 'calendar',
      route: '/(tabs)/calendario' as Href,
      description: 'Lezioni e appuntamenti',
    },
    {
      id: 'simulazioni',
      label: 'Simulazioni',
      icon: 'document-text',
      route: '/(tabs)/simulations' as Href,
      description: 'Test e verifiche',
    },
    {
      id: 'materiali',
      label: 'Materiale Didattico',
      icon: 'folder-open',
      route: '/(tabs)/materiali' as Href,
      description: 'PDF, video e risorse',
    },
    {
      id: 'statistiche',
      label: 'Statistiche',
      icon: 'stats-chart',
      route: '/(tabs)/statistics' as Href,
      description: 'I tuoi progressi',
    },
    {
      id: 'gruppo',
      label: 'Il Mio Gruppo',
      icon: 'people',
      route: '/(tabs)/gruppo' as Href,
      description: 'Compagni di studio',
    },
    {
      id: 'messaggi',
      label: 'Messaggi',
      icon: 'chatbubbles',
      route: '/(tabs)/messaggi' as Href,
      badge: unreadMessagesCount,
      description: 'Chat con i docenti',
    },
    {
      id: 'profilo',
      label: 'Profilo',
      icon: 'person',
      route: '/(tabs)/profile' as Href,
      description: 'Impostazioni account',
    },
  ];

  const handleNavigate = (route: Href) => {
    onClose();
    setTimeout(() => {
      router.push(route);
    }, 100);
  };

  const isActive = (routeStr: Href) => {
    if (!currentRoute) return false;
    const routePath = typeof routeStr === 'string' ? routeStr : '';
    
    // Caso speciale per la dashboard: deve corrispondere esattamente a index
    if (routePath === '/(tabs)') {
      // La dashboard è attiva solo se siamo esattamente sulla route index
      return currentRoute === '/' || currentRoute === '/index' || currentRoute === '(tabs)' || currentRoute === '(tabs)/index';
    }
    
    // Per le altre route, verifica se currentRoute contiene il path
    const cleanPath = routePath.replace('/(tabs)', '').replace('/', '');
    if (!cleanPath) return false;
    return currentRoute.includes(cleanPath);
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: backdropAnim }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Drawer Content */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: themedColors.card,
              paddingTop: insets.top,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themedColors.border }]}>
            <View style={styles.logoContainer}>
              <Text variant="h3" style={{ color: colors.primary.main }}>
                Leonardo School
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: themedColors.backgroundSecondary }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={themedColors.text} />
            </TouchableOpacity>
          </View>

          {/* User Info Card */}
          <View style={styles.userCard}>
            <View style={[styles.userCardGradient, { backgroundColor: colors.primary.main }]}>
              <View style={styles.userAvatar}>
                <Text variant="h3" style={styles.userAvatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text variant="body" style={styles.userName} numberOfLines={1}>
                  {user?.name || 'Studente'}
                </Text>
                <Caption style={styles.userEmail} numberOfLines={1}>
                  {user?.email}
                </Caption>
                <View style={styles.roleBadge}>
                  <Text variant="caption" style={styles.roleText}>
                    📚 Studente
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => {
              const active = isActive(item.route);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    active && { backgroundColor: `${colors.primary.main}15` },
                  ]}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.menuIconContainer,
                      {
                        backgroundColor: active
                          ? `${colors.primary.main}20`
                          : themedColors.backgroundSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={active ? item.icon : (`${item.icon}-outline` as IconName)}
                      size={20}
                      color={active ? colors.primary.main : themedColors.textMuted}
                    />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text
                      variant="body"
                      style={[
                        styles.menuLabel,
                        { color: active ? colors.primary.main : themedColors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Caption style={{ color: themedColors.textMuted }}>
                      {item.description}
                    </Caption>
                  </View>
                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text variant="caption" style={styles.badgeText}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </Text>
                    </View>
                  )}
                  {active && (
                    <View style={[styles.activeIndicator, { backgroundColor: colors.primary.main }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: themedColors.border, paddingBottom: insets.bottom + 16 }]}>
            <Caption style={{ color: themedColors.textMuted, textAlign: 'center' }}>
              Leonardo School Mobile v1.0
            </Caption>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoContainer: {
    height: 40,
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    padding: 16,
  },
  userCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: '#FFFFFF',
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontWeight: '500',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: 3,
    height: 24,
    borderRadius: 2,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
});

export default DrawerMenu;
