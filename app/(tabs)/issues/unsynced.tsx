import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text } from 'react-native';

import type { IssuePhotoUpload } from '@/issues/attachments';
import { issueColors } from '@/issues/colors';
import { IssueAttachmentViewer } from '@/issues/components/IssueAttachmentViewer';
import { IssueDetailSheet } from '@/issues/components/IssueDetailSheet';
import { IssueEmptyState } from '@/issues/components/IssueEmptyState';
import { IssueErrorBanner } from '@/issues/components/IssueErrorBanner';
import { IssueRow } from '@/issues/components/IssueRow';
import type { IssueEdits } from '@/issues/save';
import { getIssueResolutionAction } from '@/issues/statusWorkflow';
import { useIssueStore } from '@/state/IssueStore';
import type {
  IssueAttachment,
  IssueDetail,
  UnsyncedIssueListItem,
} from '@/storage/repos';
import { Screen } from '@/ui/Screen';

type UnsyncedSection = {
  title: string;
  data: UnsyncedIssueListItem[];
};

export default function UnsyncedIssuesScreen() {
  const {
    addIssueAttachment,
    isReady,
    isSyncing,
    loadIssueDetail,
    loadUnsyncedIssues,
    refresh,
    removePendingAttachment,
    saveIssue,
    syncError,
  } = useIssueStore();
  const [sections, setSections] = useState<UnsyncedSection[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail>();
  const [selectedAttachment, setSelectedAttachment] = useState<IssueAttachment>();
  const [actionError, setActionError] = useState<string>();
  const [resolvingId, setResolvingId] = useState<number | string>();

  const reload = useCallback(async () => {
    if (!isReady) return;
    setSections(groupByCrag(await loadUnsyncedIssues()));
  }, [isReady, loadUnsyncedIssues]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    if (isSyncing) {
      router.replace('/issues');
    }
  }, [isSyncing]);

  async function handleRefresh() {
    if (isSyncing) return;
    await refresh();
    await reload();
  }

  async function handleOpenIssue(issue: UnsyncedIssueListItem) {
    setSelectedIssue(await loadIssueDetail(issue.issueKey));
  }

  async function handleResolveIssue(issue: UnsyncedIssueListItem) {
    const nextStatus = getIssueResolutionAction(issue.status).nextStatus;
    setActionError(undefined);
    setResolvingId(issue.id);
    try {
      const result = await saveIssue(issue, {
        boltsAffected: issue.boltsAffected,
        description: issue.description ?? '',
        flaggedMessage: issue.flaggedMessage ?? '',
        issueType: issue.issueType,
        status: nextStatus,
        subIssueType: issue.subIssueType,
      });
      if (result.issue) {
        await reload();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update issue status.');
    } finally {
      setResolvingId(undefined);
    }
  }

  async function handleSaveIssue(issue: IssueDetail, edits: IssueEdits) {
    const result = await saveIssue(issue, edits);
    if (result.issue) {
      setSelectedIssue(result.issue);
    }
    await reload();
    return result;
  }

  async function handleAddAttachment(issue: IssueDetail, photo: IssuePhotoUpload) {
    const updated = await addIssueAttachment(issue.id, photo);
    setSelectedIssue(updated);
    await reload();
    return updated;
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="issues:unsynced:screen">
      <Stack.Screen options={{ title: 'Unsynced Issues' }} />
      <IssueErrorBanner message={syncError} />
      <IssueErrorBanner message={actionError} testID="issues:unsynced:action-error" />

      <SectionList
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.issueKey}
        ListEmptyComponent={
          <IssueEmptyState
            body="New and edited issues will appear here until TABVAR confirms the upload."
            icon="checkmark-circle-outline"
            testID="issues:unsynced:empty"
            title="No unsynced issues"
          />
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
            resolving={resolvingId === item.id}
            onOpen={() => {
              void handleOpenIssue(item);
            }}
            onResolve={() => {
              void handleResolveIssue(item);
            }}
          />
        )}
        renderSectionHeader={({ section }) => <Text style={styles.heading}>{section.title}</Text>}
        sections={sections}
      />

      <IssueDetailSheet
        issue={selectedIssue}
        onAddAttachment={handleAddAttachment}
        onClose={() => setSelectedIssue(undefined)}
        onOpenAttachment={setSelectedAttachment}
        onRemovePendingAttachment={async (attachmentId) => {
          await removePendingAttachment(attachmentId);
          if (selectedIssue) {
            setSelectedIssue(await loadIssueDetail(selectedIssue.id));
          }
          await reload();
        }}
        onSave={handleSaveIssue}
      />
      <IssueAttachmentViewer
        attachment={selectedAttachment}
        onClose={() => setSelectedAttachment(undefined)}
      />
    </Screen>
  );
}

function groupByCrag(issues: UnsyncedIssueListItem[]): UnsyncedSection[] {
  const groups = new Map<string, UnsyncedIssueListItem[]>();
  for (const issue of issues) {
    const group = groups.get(issue.cragName) ?? [];
    group.push(issue);
    groups.set(issue.cragName, group);
  }
  return [...groups.entries()].map(([title, data]) => ({ title, data }));
}

const styles = StyleSheet.create({
  heading: {
    backgroundColor: issueColors.screen,
    color: issueColors.body,
    fontSize: 13,
    fontWeight: '700',
    paddingBottom: 4,
    paddingTop: 12,
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
});
