import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';

import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { dismissIssueUploadNotification, showIssueUploadNotification } from '@/issues/notifications';
import { syncTabvarIssues } from '@/issues/sync';
import { getDatabase, runMigrations } from '@/storage/database';
import { getPendingIssueCount } from '@/storage/repos';

import type { IssueOutboxTrigger } from './outbox';

const BACKGROUND_TASK_NAME = 'topobuilder-issue-outbox-sync';
let triggersRegistered = false;
let lastReconnectSyncAt = 0;

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      await runQueuedIssueSync('background');
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.warn('[issues] background issue sync failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export function registerIssueSyncRuntime(): () => void {
  if (triggersRegistered) return () => undefined;
  triggersRegistered = true;

  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
    if (!online) return;
    const now = Date.now();
    if (now - lastReconnectSyncAt < 5000) return;
    lastReconnectSyncAt = now;
    void runQueuedIssueSync('reconnect');
  });

  const appStateSubscription = AppState.addEventListener('change', (nextState) => {
    // `inactive` fires for permission dialogs and system pickers. Syncing then
    // races expo-image-picker's ActivityResultLauncher on Android.
    if (nextState === 'background') {
      void registerBackgroundTask();
      void runQueuedIssueSync('background');
    }
  });

  const backgroundTaskTimer = setTimeout(() => {
    void registerBackgroundTask();
  }, 0);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('online', handleWebOnline);
    document.addEventListener('visibilitychange', handleWebVisibility);
  }

  return () => {
    triggersRegistered = false;
    clearTimeout(backgroundTaskTimer);
    unsubscribeNetInfo();
    appStateSubscription.remove();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.removeEventListener('online', handleWebOnline);
      document.removeEventListener('visibilitychange', handleWebVisibility);
    }
  };
}

export async function runQueuedIssueSync(trigger: IssueOutboxTrigger): Promise<void> {
  const session = await loadTabvarSession();
  if (!session) return;
  const db = await getDatabase();
  await runMigrations(db);
  const pendingCount = await getPendingIssueCount(db);
  if (pendingCount === 0) return;

  const notificationId =
    trigger === 'interactive' ? undefined : await showIssueUploadNotification(pendingCount);
  try {
    await syncTabvarIssues('manual', trigger);
  } finally {
    await dismissIssueUploadNotification(notificationId);
  }
}

async function registerBackgroundTask() {
  if (Platform.OS === 'web') return;
  const status = await BackgroundTask.getStatusAsync().catch(() => undefined);
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME).catch(() => false);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, { minimumInterval: 15 }).catch(
      (error) => {
        console.warn('[issues] could not register background issue sync', error);
      },
    );
  }
}

function handleWebOnline() {
  void runQueuedIssueSync('reconnect');
}

function handleWebVisibility() {
  if (document.visibilityState === 'hidden') {
    void runQueuedIssueSync('background');
  }
}
