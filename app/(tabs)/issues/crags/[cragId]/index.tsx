import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { IssueAttachmentViewer } from '@/issues/components/IssueAttachmentViewer';
import { IssueDetailSheet } from '@/issues/components/IssueDetailSheet';
import { IssueRow } from '@/issues/components/IssueRow';
import { useIssueStore } from '@/state/IssueStore';
import type { IssueAttachment, IssueDetail, IssueListItem } from '@/storage/repos/tabvarIssuesRepo';
import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

export default function CragIssuesScreen() {
  const { cragId } = useLocalSearchParams<{ cragId: string }>();
  const { isReady, isSyncing, loadIssueDetail, loadIssuesForCrag, refresh, syncError } = useIssueStore();
  const numericCragId = Number(cragId);
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail>();
  const [selectedAttachment, setSelectedAttachment] = useState<IssueAttachment>();

  const reload = useCallback(async () => {
    if (!isReady || !Number.isFinite(numericCragId)) return;
    setIssues(await loadIssuesForCrag(numericCragId));
  }, [isReady, loadIssuesForCrag, numericCragId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function handleRefresh() {
    if (isSyncing) return;
    await refresh();
    await reload();
  }

  async function handleOpenIssue(issue: IssueListItem) {
    setSelectedIssue(await loadIssueDetail(issue.id));
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="issues:crag:screen">
      <Stack.Screen options={{ title: 'Crag Issues' }} />

      {syncError ? <Text style={styles.error}>{syncError}</Text> : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={issues}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !isReady ? (
            <Empty body="Preparing local issue storage…" />
          ) : isSyncing ? (
            <Empty body="Refreshing TABVAR issue data…" testID="issues:crag:syncing" title="Syncing issues" />
          ) : (
            <Empty body="Pull down to check TABVAR again." testID="issues:crag:empty" title="No issues for this crag" />
          )
        }
        refreshControl={
          <RefreshControl
            enabled={!isSyncing}
            onRefresh={() => {
              void handleRefresh();
            }}
            refreshing={isSyncing}
          />
        }
        renderItem={({ item }) => (
          <IssueRow
            issue={item}
            onOpen={() => {
              void handleOpenIssue(item);
            }}
          />
        )}
      />

      <IssueDetailSheet
        issue={selectedIssue}
        onClose={() => setSelectedIssue(undefined)}
        onOpenAttachment={setSelectedAttachment}
      />
      <IssueAttachmentViewer
        attachment={selectedAttachment}
        onClose={() => setSelectedAttachment(undefined)}
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
