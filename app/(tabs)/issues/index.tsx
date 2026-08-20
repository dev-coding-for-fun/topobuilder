import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';

import { issueColors } from '@/issues/colors';
import type { CreateIssueInput } from '@/issues/create';
import { IssueCreateSheet } from '@/issues/components/IssueCreateSheet';
import { IssueCragCard } from '@/issues/components/IssueCragCard';
import { IssueEmptyState } from '@/issues/components/IssueEmptyState';
import { IssueErrorBanner } from '@/issues/components/IssueErrorBanner';
import { useIssueStore } from '@/state/IssueStore';
import type { IssueRouteOption } from '@/storage/repos/tabvarIssuesRepo';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { Screen } from '@/ui/Screen';

export default function IssuesCragListScreen() {
  const {
    cragSummaries,
    createIssue,
    isConnected,
    isReady,
    isSyncing,
    loadIssueRoutes,
    pendingIssueCount,
    refresh,
    reloadLocal,
    storageError,
  } = useIssueStore();
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [routes, setRoutes] = useState<IssueRouteOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return;
      void reloadLocal();
    }, [isReady, reloadLocal]),
  );

  async function handleOpenCreateIssue() {
    setShowCreateIssue(true);
    setRoutes([]);
    setRoutesLoading(true);
    setRoutesError(undefined);
    try {
      setRoutes(await loadIssueRoutes());
    } catch (error) {
      setRoutesError(error instanceof Error ? error.message : 'Could not load routes.');
    } finally {
      setRoutesLoading(false);
    }
  }

  async function handleCreateIssue(input: CreateIssueInput) {
    const issue = await createIssue(input);
    setShowCreateIssue(false);
    router.push(`/issues/crags/${issue.cragId}`);
  }

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
              <Ionicons color={issueColors.ink} name="settings-outline" size={22} />
            </Pressable>
          ),
        }}
      />

      <IssueErrorBanner message={storageError} />

      {pendingIssueCount > 0 ? (
        <Pressable
          accessibilityLabel="Open unsynced issues"
          accessibilityRole="button"
          disabled={isSyncing}
          onPress={() => router.push('/issues/unsynced')}
          style={({ pressed }) => [
            styles.unsyncedButton,
            isSyncing && styles.unsyncedButtonDisabled,
            pressed && styles.iconButtonPressed,
          ]}
          testID="issues:unsynced-button"
        >
          <Text style={styles.unsyncedButtonText}>
            {isSyncing
              ? 'sync in progress'
              : `${pendingIssueCount} unsynced issue${pendingIssueCount === 1 ? '' : 's'}`}
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={isConnected ? cragSummaries : []}
        keyExtractor={(item) => String(item.cragId)}
        ListEmptyComponent={
          !isReady ? (
            <IssueEmptyState body="Preparing local issue storage…" loading />
          ) : !isConnected ? (
            <IssueEmptyState
              body="Use the settings gear to connect a TABVAR account, then synced issue crags will appear here."
              icon="link-outline"
              testID="issues:not-connected"
              title="Connect TABVAR to view route issues"
            />
          ) : isSyncing ? (
            <IssueEmptyState
              body="Pulling TABVAR crags, routes, and issues…"
              loading
              testID="issues:syncing"
              title="Syncing issues"
            />
          ) : (
            <IssueEmptyState
              body="Pull down to check TABVAR again."
              icon="checkmark-circle-outline"
              testID="issues:empty"
              title="No route issues"
            />
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
          <IssueCragCard onOpen={() => router.push(`/issues/crags/${item.cragId}`)} summary={item} />
        )}
      />

      <FloatingActionButton
        disabled={!isReady || !isConnected || isSyncing}
        label="New issue"
        onPress={() => {
          void handleOpenCreateIssue();
        }}
        testID="issues:new-issue-fab"
      />

      <IssueCreateSheet
        onCancel={() => setShowCreateIssue(false)}
        onConfirm={handleCreateIssue}
        routes={routes}
        routesError={routesError}
        routesLoading={routesLoading}
        visible={showCreateIssue}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    flexGrow: 1,
    gap: 10,
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  screen: {
    backgroundColor: issueColors.screen,
    flex: 1,
  },
  unsyncedButton: {
    alignItems: 'center',
    backgroundColor: issueColors.ink,
    borderRadius: 12,
    justifyContent: 'center',
    marginHorizontal: 18,
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  unsyncedButtonDisabled: {
    opacity: 0.55,
  },
  unsyncedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
