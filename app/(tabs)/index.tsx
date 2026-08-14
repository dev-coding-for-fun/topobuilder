import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CragCard } from '@/ui/CragCard';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { NameEntrySheet } from '@/ui/NameEntrySheet';
import { Screen } from '@/ui/Screen';
import { ShareSheet, type ShareScope } from '@/ui/ShareSheet';
import { useTopoStore } from '@/state/TopoStore';
import { interStyle } from '@/ui/fonts';

export default function CragsListScreen() {
  const { cragSummaries, isReady, storageError, createCrag } = useTopoStore();
  const [search, setSearch] = useState('');
  const [showNewCrag, setShowNewCrag] = useState(false);
  const [shareScope, setShareScope] = useState<ShareScope>();

  const hasNoCrags = isReady && cragSummaries.length === 0;
  const isSearching = search.trim().length > 0;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return cragSummaries;
    return cragSummaries.filter((crag) => crag.name.toLowerCase().includes(needle));
  }, [cragSummaries, search]);

  const hasNoSearchResults = isReady && !hasNoCrags && isSearching && filtered.length === 0;

  async function handleCreate(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { crag } = await createCrag(trimmed);
    setShowNewCrag(false);
    router.push(`/crags/${crag.id}`);
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="crags:screen">
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

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.id}
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
        renderItem={({ item }) => (
          <CragCard
            onOpen={() => router.push(`/crags/${item.id}`)}
            onShare={() => setShareScope({ kind: 'crag', cragId: item.id, name: item.name })}
            summary={item}
          />
        )}
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
});
