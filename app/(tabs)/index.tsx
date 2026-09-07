import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ConnectedCragSummary, CragSummary } from '@/domain/types';
import { CragCard } from '@/ui/CragCard';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { NameEntrySheet } from '@/ui/NameEntrySheet';
import { Screen } from '@/ui/Screen';
import { ShareSheet, type ShareScope } from '@/ui/ShareSheet';
import { useTopoStore } from '@/state/TopoStore';
import { interStyle } from '@/ui/fonts';

type MyCragItem = {
  type: 'my_crag';
  key: string;
  data: CragSummary;
};

type MyCragsEmptyItem = {
  type: 'my_crags_empty';
  key: 'my_crags_empty';
};

type ConnectedCragItem = {
  type: 'connected_crag';
  key: string;
  data: ConnectedCragSummary;
};

type CragsListItem = MyCragItem | MyCragsEmptyItem | ConnectedCragItem;

type CragsSection = {
  type: 'my_crags' | 'connected_crags';
  title: string;
  subtitle?: string;
  badge?: string;
  count: number;
  data: CragsListItem[];
};

export default function CragsListScreen() {
  const { cragSummaries, connectedCrags, isReady, storageError, createCrag, adoptTabvarCrag } =
    useTopoStore();
  const [search, setSearch] = useState('');
  const [showNewCrag, setShowNewCrag] = useState(false);
  const [shareScope, setShareScope] = useState<ShareScope>();
  const [adoptingId, setAdoptingId] = useState<number>();

  const myCrags = useMemo(
    () => cragSummaries.filter((c) => c.tabvarCragId == null),
    [cragSummaries],
  );

  const connectedCragsWithTopos = useMemo(
    () => connectedCrags.filter((c) => (c.topoCount ?? 0) > 0),
    [connectedCrags],
  );

  const connectedCragsWithoutTopos = useMemo(
    () => connectedCrags.filter((c) => (c.topoCount ?? 0) === 0),
    [connectedCrags],
  );

  const hasNoCrags = isReady && myCrags.length === 0 && connectedCrags.length === 0;
  const isSearching = search.trim().length > 0;
  const needle = search.trim().toLowerCase();

  const filteredMyCrags = useMemo(() => {
    if (!needle) return myCrags;
    return myCrags.filter((crag) => crag.name.toLowerCase().includes(needle));
  }, [myCrags, needle]);

  const filteredConnectedWithTopos = useMemo(() => {
    if (!needle) return connectedCragsWithTopos;
    return connectedCragsWithTopos.filter((crag) => crag.name.toLowerCase().includes(needle));
  }, [connectedCragsWithTopos, needle]);

  const filteredConnectedWithoutTopos = useMemo(() => {
    if (!needle) return connectedCragsWithoutTopos;
    return connectedCragsWithoutTopos.filter((crag) => crag.name.toLowerCase().includes(needle));
  }, [connectedCragsWithoutTopos, needle]);

  const totalMyCragsCount = myCrags.length + connectedCragsWithTopos.length;
  const filteredMyCragsCount = filteredMyCrags.length + filteredConnectedWithTopos.length;
  const filteredConnectedCount = filteredConnectedWithoutTopos.length;

  const hasNoSearchResults =
    isReady && !hasNoCrags && isSearching && filteredMyCragsCount === 0 && filteredConnectedCount === 0;

  const sections = useMemo<CragsSection[]>(() => {
    if (!isReady || hasNoCrags || hasNoSearchResults) return [];

    const result: CragsSection[] = [];

    // My Crags Section
    if (isSearching) {
      if (filteredMyCragsCount > 0) {
        result.push({
          type: 'my_crags',
          title: 'My Crags',
          badge: 'LOCAL',
          subtitle: 'Locally created crags in your workspace',
          count: filteredMyCragsCount,
          data: [
            ...filteredMyCrags.map((crag) => ({
              type: 'my_crag' as const,
              key: `crag-${crag.id}`,
              data: crag,
            })),
            ...filteredConnectedWithTopos.map((item) => ({
              type: 'connected_crag' as const,
              key: `connected-${item.tabvarCragId}`,
              data: item,
            })),
          ],
        });
      }
    } else {
      const data: CragsListItem[] =
        totalMyCragsCount > 0
          ? [
              ...myCrags.map((crag) => ({
                type: 'my_crag' as const,
                key: `crag-${crag.id}`,
                data: crag,
              })),
              ...connectedCragsWithTopos.map((item) => ({
                type: 'connected_crag' as const,
                key: `connected-${item.tabvarCragId}`,
                data: item,
              })),
            ]
          : [{ type: 'my_crags_empty', key: 'my_crags_empty' }];

      result.push({
        type: 'my_crags',
        title: 'My Crags',
        badge: 'LOCAL',
        subtitle: 'Locally created crags in your workspace',
        count: totalMyCragsCount,
        data,
      });
    }

    // Connected Crags Section
    if (isSearching) {
      if (filteredConnectedCount > 0) {
        result.push({
          type: 'connected_crags',
          title: 'Connected Crags',
          badge: 'TABVAR',
          subtitle: 'External catalog crags with official routes and sectors',
          count: filteredConnectedCount,
          data: filteredConnectedWithoutTopos.map((item) => ({
            type: 'connected_crag' as const,
            key: `connected-${item.tabvarCragId}`,
            data: item,
          })),
        });
      }
    } else if (connectedCragsWithoutTopos.length > 0) {
      result.push({
        type: 'connected_crags',
        title: 'Connected Crags',
        badge: 'TABVAR',
        subtitle: 'External catalog crags with official routes and sectors',
        count: connectedCragsWithoutTopos.length,
        data: connectedCragsWithoutTopos.map((item) => ({
          type: 'connected_crag' as const,
          key: `connected-${item.tabvarCragId}`,
          data: item,
        })),
      });
    }

    return result;
  }, [
    isReady,
    hasNoCrags,
    hasNoSearchResults,
    isSearching,
    filteredMyCragsCount,
    filteredConnectedCount,
    totalMyCragsCount,
    myCrags,
    connectedCragsWithTopos,
    connectedCragsWithoutTopos,
    filteredMyCrags,
    filteredConnectedWithTopos,
    filteredConnectedWithoutTopos,
  ]);

  async function handleCreate(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { crag } = await createCrag(trimmed);
    setShowNewCrag(false);
    router.push(`/crags/${crag.id}`);
  }

  async function handleOpenConnectedCrag(item: ConnectedCragSummary) {
    if (item.workspaceCragId) {
      router.push(`/crags/${item.workspaceCragId}`);
      return;
    }
    if (adoptingId) return;
    setAdoptingId(item.tabvarCragId);
    try {
      const crag = await adoptTabvarCrag(item.tabvarCragId);
      router.push(`/crags/${crag.id}`);
    } catch (err) {
      console.error('Failed to adopt connected crag:', err);
    } finally {
      setAdoptingId(undefined);
    }
  }

  return (
    <Screen edges={['left', 'right']} style={styles.screen} testID="crags:screen">
      <Tabs.Screen
        options={{
          title: 'Crags',
          headerRight: () => (
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              testID="crags:settings-button"
            >
              <Ionicons color="#111827" name="settings-outline" size={22} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchWrap, hasNoCrags && styles.searchWrapDisabled]}>
        <Ionicons
          color={hasNoCrags ? '#9CA3AF' : '#6B7280'}
          name="search"
          size={18}
          style={styles.searchIcon}
        />
        <TextInput
          accessibilityLabel="Search crags"
          accessibilityState={{ disabled: hasNoCrags }}
          editable={!hasNoCrags}
          onChangeText={setSearch}
          placeholder="Search crags…"
          placeholderTextColor="#9CA3AF"
          style={[styles.searchInput, hasNoCrags && styles.searchInputDisabled]}
          testID="crags:search-input"
          value={search}
        />
      </View>

      {storageError ? <Text style={styles.error}>{storageError}</Text> : null}

      <SectionList
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          !isReady ? (
            <View style={styles.empty}>
              <Text style={styles.emptyBody}>Preparing local storage…</Text>
            </View>
          ) : hasNoSearchResults ? (
            <View style={styles.empty} testID="crags:search-empty">
              <Text style={styles.emptyTitle}>No matching crags</Text>
              <Text style={styles.emptyBody}>Try a different search term.</Text>
            </View>
          ) : hasNoCrags ? (
            <View style={styles.empty} testID="crags:empty">
              <Text style={styles.emptyTitle}>No crags yet</Text>
              <Text style={styles.emptyBody}>
                Tap “New crag” below to start documenting routes at your local crag.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'my_crag') {
            return (
              <CragCard
                onOpen={() => router.push(`/crags/${item.data.id}`)}
                onShare={() =>
                  setShareScope({ kind: 'crag', cragId: item.data.id, name: item.data.name })
                }
                summary={item.data}
              />
            );
          }
          if (item.type === 'my_crags_empty') {
            return (
              <View style={styles.sectionEmptyCard} testID="crags:my-crags:empty">
                <Ionicons color="#16A34A" name="folder-open-outline" size={24} />
                <View style={styles.sectionEmptyTextWrap}>
                  <Text style={styles.sectionEmptyTitle}>No crags yet</Text>
                  <Text style={styles.sectionEmptyBody}>
                    Tap “New crag” below to create your own, or select a connected crag below.
                  </Text>
                </View>
              </View>
            );
          }
          if (item.type === 'connected_crag') {
            return (
              <CragCard
                onOpen={() => handleOpenConnectedCrag(item.data)}
                summary={item.data}
                variant="connected"
              />
            );
          }
          return null;
        }}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              section.type === 'connected_crags' && styles.sectionHeaderConnected,
            ]}
            testID={`crags:section:${section.type}`}
          >
            <View style={styles.sectionHeaderTitleRow}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.badge ? (
                <View
                  style={[
                    styles.sourceBadge,
                    section.type === 'my_crags' && styles.sourceBadgeLocal,
                  ]}
                >
                  <Text
                    style={[
                      styles.sourceBadgeText,
                      section.type === 'my_crags' && styles.sourceBadgeTextLocal,
                    ]}
                  >
                    {section.badge}
                  </Text>
                </View>
              ) : null}
              <View style={styles.countPill}>
                <Text style={styles.countPillText} testID={`crags:section:${section.type}:count`}>{section.count}</Text>
              </View>
            </View>
            {section.subtitle ? (
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            ) : null}
          </View>
        )}
        sections={sections}
        stickySectionHeadersEnabled={false}
      />

      <FloatingActionButton
        disabled={!isReady}
        label="New crag"
        onPress={() => setShowNewCrag(true)}
        testID="crags:new-crag-fab"
      />

      <NameEntrySheet
        confirmLabel="Create crag"
        defaultValue=""
        onCancel={() => setShowNewCrag(false)}
        onConfirm={handleCreate}
        placeholder="e.g. Barrier Bluffs"
        testID="crags:new-crag-sheet"
        title="New crag"
        visible={showNewCrag}
      />

      <ShareSheet onClose={() => setShareScope(undefined)} scope={shareScope} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  countPill: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countPillText: {
    color: '#475569',
    fontSize: 11,
    ...interStyle('700'),
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyBody: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    ...interStyle('800'),
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    paddingHorizontal: 18,
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  listContent: {
    gap: 10,
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  searchInputDisabled: {
    color: '#9CA3AF',
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchWrapDisabled: {
    opacity: 0.6,
  },
  sectionEmptyBody: {
    color: '#166534',
    fontSize: 12,
    lineHeight: 16,
    ...interStyle('400'),
  },
  sectionEmptyCard: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  sectionEmptyTextWrap: {
    flex: 1,
    gap: 2,
  },
  sectionEmptyTitle: {
    color: '#15803D',
    fontSize: 14,
    ...interStyle('700'),
  },
  sectionHeader: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  sectionHeaderConnected: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 16,
  },
  sectionHeaderTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
    ...interStyle('400'),
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    ...interStyle('800'),
  },
  sourceBadge: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sourceBadgeLocal: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  sourceBadgeText: {
    color: '#0369A1',
    fontSize: 10,
    letterSpacing: 0.3,
    ...interStyle('700'),
  },
  sourceBadgeTextLocal: {
    color: '#15803D',
  },
});

