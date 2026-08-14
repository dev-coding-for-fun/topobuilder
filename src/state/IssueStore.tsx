import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadTabvarSession, subscribeTabvarSession } from '@/integrations/tabvar/sessionStore';
import { createIssue as createIssueMutation, type CreateIssueInput } from '@/issues/create';
import { saveIssueEdits, type IssueEdits, type SaveIssueResult } from '@/issues/save';
import { isIssueSyncInFlight, syncTabvarIssues } from '@/issues/sync';
import { getDatabase, runMigrations, type TopoDatabase } from '@/storage/database';
import {
  getCurrentSyncJob,
  getIssueDetail,
  getSyncError,
  listIssueCragSummaries,
  listIssueRoutes,
  listIssuesForCrag,
  type IssueCragSummary,
  type IssueDetail,
  type IssueListItem,
  type IssueRouteOption,
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
  loadIssueRoutes: () => Promise<IssueRouteOption[]>;
  loadIssueDetail: (issueId: number) => Promise<IssueDetail | undefined>;
  createIssue: (input: CreateIssueInput) => Promise<IssueDetail>;
  saveIssue: (issue: IssueListItem, edits: IssueEdits) => Promise<SaveIssueResult>;
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

  useEffect(() => {
    if (!db) return undefined;
    let cancelled = false;

    async function handleSessionChanged(dbRef: TopoDatabase) {
      await reload(dbRef);
      if (cancelled) return;
      const session = await loadTabvarSession();
      if (cancelled || !session) return;
      setSyncing(true);
      try {
        await syncTabvarIssues('initial');
      } catch {
        // Sync persists the error; reload below exposes it.
      } finally {
        if (!cancelled) {
          await reload(dbRef);
        }
      }
    }

    const unsubscribe = subscribeTabvarSession(() => {
      void handleSessionChanged(db);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, reload]);

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

  const loadIssueRoutes = useCallback(async () => listIssueRoutes(requireDb()), [db]);

  const loadIssueDetail = useCallback(
    async (issueId: number) => getIssueDetail(requireDb(), issueId),
    [db],
  );

  const createIssue = useCallback(
    async (input: CreateIssueInput) => {
      const dbRef = requireDb();
      const session = await loadTabvarSession();
      if (!session) {
        throw new Error('Connect TABVAR before creating route issues.');
      }
      const issue = await createIssueMutation(dbRef, input, session.accessToken);
      await reload(dbRef);
      return issue;
    },
    [db, reload],
  );

  const saveIssue = useCallback(
    async (issue: IssueListItem, edits: IssueEdits) => {
      const dbRef = requireDb();
      const session = await loadTabvarSession();
      if (!session) {
        throw new Error('Connect TABVAR before editing route issues.');
      }
      const result = await saveIssueEdits(dbRef, issue, edits, session.accessToken);
      await reload(dbRef);
      return result;
    },
    [db, reload],
  );

  const value = useMemo<IssueStoreValue>(
    () => ({
      cragSummaries,
      createIssue,
      isConnected,
      isReady: Boolean(db),
      isSyncing: syncing,
      loadIssueRoutes,
      loadIssueDetail,
      loadIssuesForCrag,
      refresh,
      saveIssue,
      storageError,
      syncError,
      syncJob,
    }),
    [
      cragSummaries,
      createIssue,
      db,
      isConnected,
      loadIssueRoutes,
      loadIssueDetail,
      loadIssuesForCrag,
      refresh,
      saveIssue,
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
