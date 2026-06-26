import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { IssueCragCard } from '@/issues/components/IssueCragCard';
import { useIssueStore } from '@/state/IssueStore';
import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

export default function IssuesCragListScreen() {
  const { cragSummaries, isConnected, isReady, isSyncing, refresh, storageError, syncError } =
    useIssueStore();

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="issues:crags:screen">
      <Stack.Screen
        options={{
          title: 'Issues',
          headerRight: () => (
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              testID="issues:settings-button"
            >
              <Ionicons color="#111827" name="settings-outline" size={22} />
            </Pressable>
          ),
        }}
      />

      {storageError ? <Text style={styles.error}>{storageError}</Text> : null}
      {syncError ? <Text style={styles.error}>{syncError}</Text> : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={isConnected ? cragSummaries : []}
        keyExtractor={(item) => String(item.cragId)}
        ListEmptyComponent={
          !isReady ? (
            <Empty body="Preparing local issue storage…" />
          ) : !isConnected ? (
            <Empty
              body="Use the settings gear to connect a TABVAR account, then synced issue crags will appear here."
              testID="issues:not-connected"
              title="Connect TABVAR to view route issues"
            />
          ) : isSyncing ? (
            <Empty body="Pulling TABVAR crags, routes, and issues…" testID="issues:syncing" title="Syncing issues" />
          ) : (
            <Empty body="Pull down to check TABVAR again." testID="issues:empty" title="No route issues" />
          )
        }
        refreshControl={
          <RefreshControl
            enabled={isConnected && !isSyncing}
            onRefresh={() => {
              if (!isSyncing) void refresh();
            }}
            refreshing={isSyncing}
          />
        }
        renderItem={({ item }) => (
          <IssueCragCard
            onOpen={() => router.push(`/issues/crags/${item.cragId}`)}
            summary={item}
          />
        )}
      />
    </Screen>
  );
}

function Empty({ body, testID, title }: { body: string; testID?: string; title?: string }) {
  return (
    <View style={styles.empty} testID={testID}>
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    textAlign: 'center',
    ...interStyle('800'),
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    paddingHorizontal: 18,
    paddingTop: 8,
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
    paddingTop: 12,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
});
