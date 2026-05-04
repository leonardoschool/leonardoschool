/**
 * Leonardo School Mobile - Materiali Screen
 * 
 * Materiale didattico con struttura gerarchica: Categorie → Subject → Topic → Materials
 * Allineato 100% con webapp StudentMaterialsContent.tsx
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text, Caption } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { useThemedColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../lib/theme/colors';
import { DrawerMenu, AppHeader } from '../../components/navigation';
import { trpc } from '../../lib/trpc';
import { spacing, layout } from '../../lib/theme/spacing';

interface Category {
  id: string;
  name: string;
}

interface MaterialData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  createdAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
  topic: {
    id: string;
    name: string;
  } | null;
  subject: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface HierarchyNode {
  subject: {
    id: string;
    name: string;
    color: string | null;
  };
  topics: {
    topic: {
      id: string;
      name: string;
    };
    materials: MaterialData[];
  }[];
  directMaterials: MaterialData[];
}

export default function MaterialiScreen() {
  const themedColors = useThemedColors();
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per expand/collapse
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Query per categorie e materiali
  const { data: categories, isLoading: loadingCategories } = trpc.materials.getCategories.useQuery();
  const { 
    data: materials, 
    isLoading: loadingMaterials,
    refetch,
    isRefetching,
  } = trpc.materials.getMyMaterials.useQuery(
    selectedCategoryId ? { categoryId: selectedCategoryId } : undefined,
    { enabled: !!user }
  );

  // Costruisci gerarchia dai materiali
  const hierarchy = useMemo<HierarchyNode[]>(() => {
    if (!materials) return [];

    const subjectMap = new Map<string, HierarchyNode>();

    (materials as MaterialData[]).forEach((material) => {
      const mat = material;
      
      const subjectId = mat.subject?.id || 'other';
      const subjectName = mat.subject?.name || 'Altro';
      const subjectColor = mat.subject?.color || null;

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: { id: subjectId, name: subjectName, color: subjectColor },
          topics: [],
          directMaterials: [],
        });
      }
      
      const subjectNode = subjectMap.get(subjectId)!;

      if (!mat.topic) {
        subjectNode.directMaterials.push(mat);
        return;
      }

      const topicId = mat.topic.id;
      let topicNode = subjectNode.topics.find((t) => t.topic.id === topicId);
      if (!topicNode) {
        topicNode = {
          topic: { id: mat.topic.id, name: mat.topic.name },
          materials: [],
        };
        subjectNode.topics.push(topicNode);
      }

      topicNode.materials.push(mat);
    });

    return Array.from(subjectMap.values());
  }, [materials]);

  // Filtra gerarchia
  const filteredHierarchy = useMemo<HierarchyNode[]>(() => {
    if (!searchQuery) return hierarchy;

    const searchLower = searchQuery.toLowerCase();

    return hierarchy
      .map((subjectNode) => ({
        ...subjectNode,
        directMaterials: subjectNode.directMaterials.filter((m) =>
          m.title.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
        ),
        topics: subjectNode.topics
          .map((topicNode) => ({
            ...topicNode,
            materials: topicNode.materials.filter((m) =>
              m.title.toLowerCase().includes(searchLower) ||
              m.description?.toLowerCase().includes(searchLower)
            ),
          }))
          .filter((topicNode) => topicNode.materials.length > 0),
      }))
      .filter((subNode) => subNode.topics.length > 0 || subNode.directMaterials.length > 0);
  }, [hierarchy, searchQuery]);

  // Toggle functions
  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helpers
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleOpenMaterial = async (material: MaterialData) => {
    const url = material.fileUrl || material.externalUrl;
    if (url) {
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error('Error opening material:', error);
      }
    }
  };

  // Render material item
  const renderMaterial = (material: MaterialData, indent: number = 0) => {
    const subjectColor = material.subject?.color || colors.primary.main;
    
    return (
      <TouchableOpacity
        key={material.id}
        activeOpacity={0.7}
        onPress={() => handleOpenMaterial(material)}
        style={[styles.materialItem, { marginLeft: indent * 16 }]}
      >
        <View style={[styles.materialIcon, { backgroundColor: `${subjectColor}15` }]}>
          <Ionicons name={getMaterialIcon(material.type)} size={18} color={subjectColor} />
        </View>
        <View style={styles.materialContent}>
          <Text variant="body" style={{ fontWeight: '500' }}>{material.title}</Text>
          {material.description && (
            <Caption style={{ marginTop: 2 }} numberOfLines={2}>{material.description}</Caption>
          )}
          {material.fileName && (
            <View style={styles.materialMeta}>
              <Caption>{material.fileName}</Caption>
              {material.fileSize && (
                <Caption> • {formatFileSize(material.fileSize)}</Caption>
              )}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={themedColors.textMuted} />
      </TouchableOpacity>
    );
  };

  // Render topic
  const renderTopic = (topicNode: HierarchyNode['topics'][0], subjectId: string) => {
    const id = `${subjectId}-${topicNode.topic.id}`;
    const isExpanded = expandedTopics.has(id);
    const totalMaterials = topicNode.materials.length;

    return (
      <View key={id} style={{ marginBottom: spacing[2] }}>
        <TouchableOpacity
          style={[styles.topicHeader, { backgroundColor: themedColors.card }]}
          onPress={() => toggleTopic(id)}
        >
          <Ionicons
            name={isExpanded ? 'folder-open' : 'folder'}
            size={20}
            color={colors.status.info.main}
          />
          <Text variant="body" style={{ flex: 1, marginLeft: spacing[2], fontWeight: '600' }}>
            {topicNode.topic.name}
          </Text>
          <Caption>{totalMaterials}</Caption>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={themedColors.textMuted}
            style={{ marginLeft: spacing[2] }}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View>
            {topicNode.materials.map((m) => renderMaterial(m, 1))}
          </View>
        )}
      </View>
    );
  };

  // Render subject
  const renderSubject = (subjectNode: HierarchyNode) => {
    const isExpanded = expandedSubjects.has(subjectNode.subject.id);
    const subjectColor = subjectNode.subject.color || colors.primary.main;
    const totalMaterials = subjectNode.directMaterials.length +
      subjectNode.topics.reduce((sum, topic) => sum + topic.materials.length, 0);

    return (
      <Card key={subjectNode.subject.id} variant="outlined" style={styles.subjectCard}>
        <TouchableOpacity
          style={styles.subjectHeader}
          onPress={() => toggleSubject(subjectNode.subject.id)}
        >
          <View style={[styles.subjectIcon, { backgroundColor: `${subjectColor}20` }]}>
            <Ionicons name="book" size={20} color={subjectColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '700', color: subjectColor }}>
              {subjectNode.subject.name}
            </Text>
            <Caption>{totalMaterials} materiali</Caption>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={themedColors.textMuted}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={{ marginTop: spacing[3] }}>
            {subjectNode.directMaterials.map((m) => renderMaterial(m))}
            {subjectNode.topics.map((t) => renderTopic(t, subjectNode.subject.id))}
          </View>
        )}
      </Card>
    );
  };

  const isLoading = loadingCategories || loadingMaterials;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]} edges={[]}>
      <AppHeader title="Materiale Didattico" onMenuPress={() => setDrawerVisible(true)} />

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
      </View>

      {/* Categories Filter */}
      {categories && categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategoryId && { backgroundColor: colors.primary.main },
                selectedCategoryId && { backgroundColor: themedColors.backgroundSecondary },
              ]}
              onPress={() => setSelectedCategoryId(null)}
            >
              <Ionicons 
                name="apps" 
                size={14} 
                color={!selectedCategoryId ? '#FFFFFF' : themedColors.text} 
              />
              <Text variant="caption" style={{ color: !selectedCategoryId ? '#FFFFFF' : themedColors.text, marginLeft: 4 }}>
                Tutte
              </Text>
            </TouchableOpacity>
            {(categories as Category[]).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategoryId === cat.id && { backgroundColor: colors.primary.main },
                  selectedCategoryId !== cat.id && { backgroundColor: themedColors.backgroundSecondary },
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <Ionicons 
                  name="folder" 
                  size={14} 
                  color={selectedCategoryId === cat.id ? '#FFFFFF' : themedColors.text} 
                />
                <Text 
                  variant="caption" 
                  style={{ 
                    color: selectedCategoryId === cat.id ? '#FFFFFF' : themedColors.text,
                    marginLeft: 4 
                  }}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Caption style={{ marginTop: spacing[3] }}>Caricamento materiali...</Caption>
          </View>
        ) : filteredHierarchy.length === 0 ? (
          <Card variant="outlined" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="folder-open-outline" size={48} color={themedColors.textMuted} />
              <Text variant="body" style={{ marginTop: 16, textAlign: 'center', fontWeight: '600' }}>
                Nessun materiale disponibile
              </Text>
              <Caption style={{ marginTop: 8, textAlign: 'center' }}>
                {searchQuery ? 'Prova a modificare la ricerca' : 'I materiali appariranno qui quando saranno caricati'}
              </Caption>
            </View>
          </Card>
        ) : (
          filteredHierarchy.map((subjectNode) => renderSubject(subjectNode))
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  categoriesContainer: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoriesScroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: layout.borderRadius.full,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  emptyCard: {
    marginTop: spacing[5],
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[5],
  },
  subjectCard: {
    marginBottom: spacing[3],
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: layout.borderRadius.lg,
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2.5],
    gap: spacing[2],
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing[1],
  },
  materialIcon: {
    width: 36,
    height: 36,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialContent: {
    flex: 1,
  },
  materialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
});
