/**
 * Leonardo School Mobile - Materiali Screen
 * 
 * Materiale didattico: PDF, video, risorse per materia.
 * Parità con webapp StudentMaterialsContent.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Heading3, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors, generateSubjectStyles } from '../../lib/theme/colors';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';

interface Subject {
  id: string;
  name: string;
  color: string | null;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  subjectId: string;
  subject?: Subject;
  createdAt: Date | string;
}

export default function MaterialiScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch materials - usa getMyMaterials come la webapp
  const {
    data: materialsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.materials.getMyMaterials.useQuery(undefined, { 
    enabled: !!user 
  });

  // Fetch subjects - usa materials.getSubjects come la webapp
  const { data: subjectsData } = trpc.materials.getSubjects.useQuery(undefined, {
    enabled: !!user,
  });

  // getMyMaterials restituisce direttamente l'array di materiali
  const allMaterials: Material[] = useMemo(() => {
    return (materialsData || []) as Material[];
  }, [materialsData]);
  const subjects: Subject[] = (subjectsData || []) as Subject[];

  // Filter materials by search query and selected subject
  const materials = useMemo(() => {
    let filtered = allMaterials;
    
    // Filter by selected subject
    if (selectedSubject) {
      filtered = filtered.filter(m => m.subjectId === selectedSubject);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query) ||
          m.subject?.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [allMaterials, searchQuery, selectedSubject]);

  // Total count for header
  const totalMaterials = allMaterials.length;

  const getMaterialIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      PDF: 'document-text',
      VIDEO: 'videocam',
      LINK: 'link',
      IMAGE: 'image',
      AUDIO: 'musical-notes',
      OTHER: 'folder',
    };
    return iconMap[type] || 'document';
  };

  const getMaterialTypeLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      PDF: 'PDF',
      VIDEO: 'Video',
      LINK: 'Link',
      IMAGE: 'Immagine',
      AUDIO: 'Audio',
      OTHER: 'Altro',
    };
    return labelMap[type] || type;
  };

  const handleOpenMaterial = async (material: Material) => {
    if (material.fileUrl) {
      try {
        await Linking.openURL(material.fileUrl);
      } catch {
        // Handle error silently
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader 
        title="Materiale Didattico" 
        onMenuPress={() => setDrawerVisible(true)} 
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themedColors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: themedColors.card, borderColor: themedColors.border }]}>
          <Ionicons name="search" size={18} color={themedColors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: themedColors.text }]}
            placeholder="Cerca materiali..."
            placeholderTextColor={themedColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={themedColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <Caption style={{ marginTop: 8 }}>
          {totalMaterials} materiali disponibili
        </Caption>
      </View>
      
      {/* Subject Filter */}
      <View style={[styles.filterContainer, { borderBottomColor: themedColors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedSubject && { backgroundColor: colors.primary.main },
              selectedSubject && { backgroundColor: themedColors.backgroundSecondary },
            ]}
            onPress={() => setSelectedSubject(null)}
          >
            <Text
              variant="caption"
              style={{ color: !selectedSubject ? '#FFFFFF' : themedColors.text }}
            >
              Tutte
            </Text>
          </TouchableOpacity>
          {subjects.map((subject) => {
            const isSelected = selectedSubject === subject.id;
            const subjectStyles = generateSubjectStyles(subject.color);
            return (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: subjectStyles.main },
                  !isSelected && { backgroundColor: themedColors.backgroundSecondary },
                ]}
                onPress={() => setSelectedSubject(subject.id)}
              >
                <Text
                  variant="caption"
                  style={{ color: isSelected ? '#FFFFFF' : themedColors.text }}
                >
                  {subject.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary.main}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text>Caricamento materiali...</Text>
          </View>
        ) : materials.length === 0 ? (
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="folder-open-outline" size={48} color={themedColors.textMuted} />
              <Heading3 style={{ marginTop: 16, textAlign: 'center' }}>
                Nessun materiale disponibile
              </Heading3>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                I materiali didattici appariranno qui quando saranno caricati dai docenti.
              </Caption>
            </View>
          </Card>
        ) : (
          materials.map((material) => {
            const subjectStyles = material.subject 
              ? generateSubjectStyles(material.subject.color)
              : generateSubjectStyles(null);
            return (
              <TouchableOpacity
                key={material.id}
                activeOpacity={0.7}
                onPress={() => handleOpenMaterial(material)}
              >
                <Card variant="outlined" style={styles.materialCard}>
                  <View style={styles.materialHeader}>
                    <View
                      style={[
                        styles.materialIconContainer,
                        { backgroundColor: `${subjectStyles.main}20` },
                      ]}
                    >
                      <Ionicons
                        name={getMaterialIcon(material.type)}
                        size={22}
                        color={subjectStyles.main}
                      />
                    </View>
                    <View style={styles.materialInfo}>
                      <Text variant="body" style={{ fontWeight: '600', color: themedColors.text }}>
                        {material.title}
                      </Text>
                      {material.subject && (
                        <Badge variant="subject" subjectColor={material.subject.color}>
                          {material.subject.name}
                        </Badge>
                      )}
                    </View>
                    <View style={styles.materialTypeTag}>
                      <Caption>{getMaterialTypeLabel(material.type)}</Caption>
                    </View>
                  </View>
                  {material.description && (
                    <Caption style={{ marginTop: 8, color: themedColors.textMuted }}>
                      {material.description}
                    </Caption>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        currentRoute="/materiali"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  materialCard: {
    marginBottom: 12,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  materialTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
