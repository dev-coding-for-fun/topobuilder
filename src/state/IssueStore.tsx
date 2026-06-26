import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isIssueSyncInFlight, syncTabvarIssues } from '@/issues/sync';
import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { getDatabase, runMigrations, type TopoDatabase } from '@/storage/database';
import {
  getCurrentSyncJob,
  getIssueDetail,
  getSyncError,
  listIssueCragSummaries,
  listIssuesForCrag,
  type IssueCragSummary,
  type IssueDetail,
  type IssueListItem,
  type TabvarSyncJobState,
} from '@/storage/repos/tabvarIssuesRepo';

type IssueStoreValue = {
  isReady: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  storageError?: string;
  syncError?: string;
  syncJob?: TabvarSyncJobState;
  cragSummaries: IssueCragSummary[];
  refresh: () => Promise<void>;
  loadIssuesForCrag: (cragId: number) => Promise<IssueListItem[]>;
  loadIssueDetail: (issueId: number) => Promise<IssueDetail | undefined>;
};

const IssueStoreContext = createContext<IssueStoreValue | undefined>(undefined);

export function IssueStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<TopoDatabase>();
  const [storageError, setStorageError] = useState<string>();
  const [isConnected, setIsConnected] = useState(false);
  const [cragSummaries, setCragSummaries] = useState<IssueCragSummary[]>([]);
  const [syncJob, setSyncJob] = useState<TabvarSyncJobState>();
  const [syncError, setSyncError] = useState<string>();
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async (dbRef: TopoDatabase) => {
    const [session, summaries, job, error] = await Promise.all([
      loadTabvarSession(),
      listIssueCragSummaries(dbRef),
      getCurrentSyncJob(dbRef),
      getSyncError(dbRef),
    ]);
    setIsConnected(Boolean(session));
    setCragSummaries(summaries);
    setSyncJob(job);
    setSyncError(error);
    setSyncing(isIssueSyncInFlight() || Boolean(job && !job.completedAt));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        const nextDb = await getDatabase();
        await runMigrations(nextDb);
        if (!mounted) return;
        setDb(nextDb);
        setStorageError(undefined);
        await reload(nextDb);
      } catch (error) {
        if (mounted) {
          setStorageError(
            error instanceof Error ? error.message : 'Issue storage could not be initialized.',
          );
        }
      }
    }

    void prepare();
    return () => {
      mounted = false;
    };
  }, [reload]);

  function requireDb(): TopoDatabase {
    if (!db) throw new Error('Issue database is not ready');
    return db;
  }

  const refresh = useCallback(async () => {
    const dbRef = requireDb();
    if (isIssueSyncInFlight()) {
      await reload(dbRef);
      return;
    }

    setSyncing(true);
    try {
      await syncTabvarIssues('manual');
    } finally {
      await reload(dbRef);
    }
  }, [db, reload]);

  const loadIssuesForCrag = useCallback(
    async (cragId: number) => listIssuesForCrag(requireDb(), cragId),
    [db],
  );

  const loadIssueDetail = useCallback(
    async (issueId: number) => getIssueDetail(requireDb(), issueId),
    [db],
  );

  const value = useMemo<IssueStoreValue>(
    () => ({
      cragSummaries,
      isConnected,
      isReady: Boolean(db),
      isSyncing: syncing,
      loadIssueDetail,
      loadIssuesForCrag,
      refresh,
      storageError,
      syncError,
      syncJob,
    }),
    [
      cragSummaries,
      db,
      isConnected,
      loadIssueDetail,
      loadIssuesForCrag,
      refresh,
      storageError,
      syncError,
      syncJob,
      syncing,
    ],
  );

  return <IssueStoreContext.Provider value={value}>{children}</IssueStoreContext.Provider>;
}

export function useIssueStore() {
  const value = useContext(IssueStoreContext);
  if (!value) {
    throw new Error('useIssueStore must be used within IssueStoreProvider');
  }
  return value;
}
