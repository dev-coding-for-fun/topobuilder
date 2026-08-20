import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { issueColors } from '@/issues/colors';
import { IssueAttachmentViewer } from '@/issues/components/IssueAttachmentViewer';
import { IssueCreateSheet } from '@/issues/components/IssueCreateSheet';
import { IssueDetailSheet } from '@/issues/components/IssueDetailSheet';
import { IssueEmptyState } from '@/issues/components/IssueEmptyState';
import { IssueErrorBanner } from '@/issues/components/IssueErrorBanner';
import { IssueRow } from '@/issues/components/IssueRow';
import type { IssuePhotoUpload } from '@/issues/attachments';
import type { CreateIssueInput } from '@/issues/create';
import type { IssueEdits } from '@/issues/save';
import { getIssueResolutionAction } from '@/issues/statusWorkflow';
import { useIssueStore } from '@/state/IssueStore';
import type {
  IssueAttachment,
  IssueDetail,
  IssueListItem,
  IssueRouteOption,
} from '@/storage/repos/tabvarIssuesRepo';
import { FloatingActionButton } from '@/ui/FloatingActionButton';
import { Screen } from '@/ui/Screen';

export default function CragIssuesScreen() {
  const { cragId } = useLocalSearchParams<{ cragId: string }>();
  const {
    addIssueAttachment,
    createIssue,
    isConnected,
    isReady,
    isSyncing,
    loadIssueDetail,
    loadIssueRoutes,
    loadIssuesForCrag,
    refresh,
    removePendingAttachment,
    saveIssue,
  } = useIssueStore();
  const numericCragId = Number(cragId);
  const issueCragId = Number.isFinite(numericCragId) ? numericCragId : undefined;
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail>();
  const [selectedAttachment, setSelectedAttachment] = useState<IssueAttachment>();
  const [resolvingId, setResolvingId] = useState<number | string>();
  const [actionError, setActionError] = useState<string>();
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [routes, setRoutes] = useState<IssueRouteOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string>();
  const [cragName, setCragName] = useState<string>();

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

  async function handleResolveIssue(issue: IssueListItem) {
    const nextStatus = getIssueResolutionAction(issue.status).nextStatus;
    setActionError(undefined);
    setResolvingId(issue.id);
    try {
      const result = await saveIssue(issue, {
        description: issue.description ?? '',
        flaggedMessage: issue.flaggedMessage ?? '',
        status: nextStatus,
      });
      if (result.conflict) {
        setActionError('This issue was updated elsewhere. The latest version is now shown.');
      }
      applyIssueInPlace(issue.id, result.issue);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update issue status.');
    } finally {
      setResolvingId(undefined);
    }
  }

  async function handleSaveIssue(issue: IssueDetail, edits: IssueEdits) {
    const result = await saveIssue(issue, edits);
    applyIssueInPlace(issue.id, result.issue);
    if (!result.issue) {
      setSelectedIssue(undefined);
    } else {
      setSelectedIssue(result.issue);
    }
    return result;
  }

  async function handleAddAttachment(issue: IssueDetail, photo: IssuePhotoUpload) {
    const updated = await addIssueAttachment(issue.id, photo);
    applyIssueInPlace(issue.id, updated);
    setSelectedIssue(updated);
    return updated;
  }

  async function handleOpenCreateIssue() {
    setShowCreateIssue(true);
    setRoutes([]);
    setRoutesLoading(true);
    setRoutesError(undefined);
    setCragName(undefined);
    try {
      const loadedRoutes = await loadIssueRoutes();
      setCragName(loadedRoutes.find((route) => route.cragId === issueCragId)?.cragName);
      setRoutes(loadedRoutes.filter((route) => route.cragId === issueCragId));
    } catch (error) {
      setRoutesError(error instanceof Error ? error.message : 'Could not load routes.');
    } finally {
      setRoutesLoading(false);
    }
  }

  async function handleCreateIssue(input: CreateIssueInput) {
    await createIssue(input);
    setShowCreateIssue(false);
    await reload();
  }

  function applyIssueInPlace(issueId: number | string, updated?: IssueDetail) {
    setIssues((current) => {
      if (!updated) {
        return current.filter((item) => item.id !== issueId);
      }
      return current.map((item) => (item.id === updated.id ? mergeListItem(item, updated) : item));
    });
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="issues:crag:screen">
      <Stack.Screen options={{ title: 'Crag Issues' }} />

      <IssueErrorBanner message={actionError} testID="issues:crag:action-error" />

      <FlatList
        contentContainerStyle={styles.listContent}
        data={issues}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !isReady ? (
            <IssueEmptyState body="Preparing local issue storage…" loading />
          ) : isSyncing ? (
            <IssueEmptyState
              body="Refreshing TABVAR issue data…"
              loading
              testID="issues:crag:syncing"
              title="Syncing issues"
            />
          ) : (
            <IssueEmptyState
              body="Pull down to check TABVAR again."
              icon="checkmark-circle-outline"
              testID="issues:crag:empty"
              title="No issues for this crag"
            />
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
            resolving={resolvingId === item.id}
            onOpen={() => {
              void handleOpenIssue(item);
            }}
            onResolve={() => {
              void handleResolveIssue(item);
            }}
          />
        )}
      />

      <FloatingActionButton
        disabled={!isReady || !isConnected || isSyncing || issueCragId === undefined}
        label="New issue"
        onPress={() => {
          void handleOpenCreateIssue();
        }}
        testID="issues:crag:new-issue-fab"
      />

      <IssueCreateSheet
        cragId={issueCragId}
        cragName={cragName}
        onCancel={() => setShowCreateIssue(false)}
        onConfirm={handleCreateIssue}
        routes={routes}
        routesError={routesError}
        routesLoading={routesLoading}
        visible={showCreateIssue}
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

function mergeListItem(current: IssueListItem, updated: IssueDetail): IssueListItem {
  return {
    ...current,
    attachmentCount: updated.attachmentCount,
    boltsAffected: updated.boltsAffected,
    description: updated.description,
    flaggedMessage: updated.flaggedMessage,
    isFlagged: updated.isFlagged,
    issueType: updated.issueType,
    status: updated.status,
    subIssueType: updated.subIssueType,
    updatedAt: updated.updatedAt,
  };
}

const styles = StyleSheet.create({
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
