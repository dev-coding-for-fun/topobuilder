import type {
  TabvarCragCatalogItem,
  TabvarIssue,
  TabvarIssueAttachment,
  TabvarRouteCatalogItem,
  TabvarSectorCatalogItem,
} from '@/integrations/tabvar/types';
import { serverIssueKey, type IssueKey } from '@/issues/keys';

import type { TopoDatabase } from '../database';

export type TabvarSyncJobKind = 'initial' | 'manual';

export type TabvarSyncJobState = {
  kind: TabvarSyncJobKind;
  startedAt: string;
  completedAt?: string;
  error?: string;
};

export type IssueCragSummary = {
  cragId: number;
  name: string;
  issueCount: number;
  flaggedCount: number;
  newestUpdatedAt?: string;
  statsActiveIssueCount?: number;
  statsIssueFlagged?: number;
  statsPublicIssueCount?: number;
};

export type IssueListItem = {
  id: number | string;
  issueKey?: IssueKey;
  serverId?: number;
  localExternalId?: string;
  pendingSync?: boolean;
  cragId: number;
  routeId: number;
  routeName: string;
  sectorName?: string;
  gradeYds?: string;
  issueType: string;
  subIssueType?: string;
  status: string;
  description?: string;
  boltsAffected?: string;
  isFlagged: boolean;
  flaggedMessage?: string;
  reportedBy?: string;
  createdAt?: string;
  updatedAt: string;
  attachmentCount: number;
};

export type IssueDetail = IssueListItem & {
  lastStatus?: string;
  reportedByUid?: string;
  lastModified?: string;
  approvedAt?: string;
  archivedAt?: string;
  attachments: IssueAttachment[];
};

export type IssueRouteOption = {
  id: number;
  cragId: number;
  cragName: string;
  name: string;
  sectorName?: string;
  gradeYds?: string;
  boltCount?: number;
  pitchCount?: number;
};

export type IssueAttachment = {
  id: number | string;
  issueId: number | string;
  url: string;
  name: string;
  mimeType: string;
  pendingSync?: boolean;
  localUri?: string;
};

type SyncStateRow = {
  cursor: string | null;
  server_time: string | null;
  last_synced_at: string | null;
  last_error: string | null;
};

type SyncJobRow = {
  job_kind: TabvarSyncJobKind;
  started_at: string;
  completed_at: string | null;
  error: string | null;
};

type IssueCragSummaryRow = {
  crag_id: number;
  name: string;
  issue_count: number;
  flagged_count: number;
  newest_updated_at: string | null;
  stats_active_issue_count: number | null;
  stats_issue_flagged: number | null;
  stats_public_issue_count: number | null;
};

type IssueListRow = {
  id: number;
  crag_id: number;
  route_id: number;
  route_name: string | null;
  sector_name: string | null;
  grade_yds: string | null;
  issue_type: string;
  sub_issue_type: string | null;
  status: string;
  description: string | null;
  bolts_affected: string | null;
  is_flagged: number;
  flagged_message: string | null;
  reported_by: string | null;
  created_at: string | null;
  updated_at: string;
  attachment_count: number;
};

type IssueRouteRow = {
  id: number;
  crag_id: number;
  crag_name: string;
  name: string;
  sector_name: string | null;
  grade_yds: string | null;
  bolt_count: number | null;
  pitch_count: number | null;
};

type IssueDetailRow = IssueListRow & {
  last_status: string | null;
  reported_by_uid: string | null;
  last_modified: string | null;
  approved_at: string | null;
  archived_at: string | null;
};

type AttachmentRow = {
  id: number;
  issue_id: number;
  url: string;
  name: string;
  mime_type: string;
};

type RouteCragRow = {
  crag_id: number | null;
};

export type TabvarSyncResource = 'crags' | 'sectors' | 'routes' | 'issues';

const ISSUE_SYNC_RESOURCE: TabvarSyncResource = 'issues';
const CURRENT_JOB_ID = 'current';

export async function clearTabvarIssueSyncData(db: TopoDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM tabvar_issue_attachments');
    await db.runAsync('DELETE FROM tabvar_issues');
    await db.runAsync('DELETE FROM tabvar_routes');
    await db.runAsync('DELETE FROM tabvar_sectors');
    await db.runAsync('DELETE FROM tabvar_crags');
    await db.runAsync('DELETE FROM tabvar_sync_state');
    await db.runAsync('DELETE FROM tabvar_sync_jobs');
  });
}

export async function upsertTabvarCrags(
  db: TopoDatabase,
  crags: TabvarCragCatalogItem[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const crag of crags) {
      await db.runAsync(
        `INSERT INTO tabvar_crags (
          id, name, slug, latitude, longitude, notes,
          stats_active_issue_count, stats_issue_flagged, stats_public_issue_count,
          created_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          notes = excluded.notes,
          stats_active_issue_count = excluded.stats_active_issue_count,
          stats_issue_flagged = excluded.stats_issue_flagged,
          stats_public_issue_count = excluded.stats_public_issue_count,
          created_at = excluded.created_at,
          raw_json = excluded.raw_json`,
        crag.id,
        crag.name,
        crag.slug ?? null,
        crag.latitude ?? null,
        crag.longitude ?? null,
        crag.notes ?? null,
        crag.statsActiveIssueCount ?? null,
        crag.statsIssueFlagged ?? null,
        crag.statsPublicIssueCount ?? null,
        crag.createdAt ?? null,
        JSON.stringify(crag),
      );
    }
  });
}

export async function upsertTabvarSectors(
  db: TopoDatabase,
  sectors: TabvarSectorCatalogItem[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const sector of sectors) {
      await db.runAsync(
        `INSERT INTO tabvar_sectors (
          id, crag_id, name, latitude, longitude, notes, sort_order, created_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          crag_id = excluded.crag_id,
          name = excluded.name,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          notes = excluded.notes,
          sort_order = excluded.sort_order,
          created_at = excluded.created_at,
          raw_json = excluded.raw_json`,
        sector.id,
        sector.cragId,
        sector.name,
        sector.latitude ?? null,
        sector.longitude ?? null,
        sector.notes ?? null,
        sector.sortOrder ?? null,
        sector.createdAt ?? null,
        JSON.stringify(sector),
      );
    }
  });
}

export async function upsertTabvarRoutes(
  db: TopoDatabase,
  routes: TabvarRouteCatalogItem[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const route of routes) {
      await db.runAsync(
        `INSERT INTO tabvar_routes (
          id, crag_id, sector_id, name, alt_names, grade_yds, status,
          latitude, longitude, notes, sort_order, bolt_count, pitch_count,
          route_length, climb_style, year, route_built_date, first_ascent_by,
          first_ascent_date, crag_name, sector_name, created_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          crag_id = excluded.crag_id,
          sector_id = excluded.sector_id,
          name = excluded.name,
          alt_names = excluded.alt_names,
          grade_yds = excluded.grade_yds,
          status = excluded.status,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          notes = excluded.notes,
          sort_order = excluded.sort_order,
          bolt_count = excluded.bolt_count,
          pitch_count = excluded.pitch_count,
          route_length = excluded.route_length,
          climb_style = excluded.climb_style,
          year = excluded.year,
          route_built_date = excluded.route_built_date,
          first_ascent_by = excluded.first_ascent_by,
          first_ascent_date = excluded.first_ascent_date,
          crag_name = excluded.crag_name,
          sector_name = excluded.sector_name,
          created_at = excluded.created_at,
          raw_json = excluded.raw_json`,
        route.id,
        route.cragId,
        route.sectorId,
        route.name,
        route.altNames ?? null,
        route.gradeYds ?? null,
        route.status ?? null,
        route.latitude ?? null,
        route.longitude ?? null,
        route.notes ?? null,
        route.sortOrder ?? null,
        route.boltCount ?? null,
        route.pitchCount ?? null,
        route.routeLength ?? null,
        route.climbStyle ?? null,
        route.year ?? null,
        route.routeBuiltDate ?? null,
        route.firstAscentBy ?? null,
        route.firstAscentDate ?? null,
        route.cragName ?? null,
        route.sectorName ?? null,
        route.createdAt ?? null,
        JSON.stringify(route),
      );
    }
  });
}

export async function upsertTabvarIssues(
  db: TopoDatabase,
  issues: TabvarIssue[],
  serverTime: string,
  syncedAt: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const issue of issues) {
      await writeTabvarIssue(db, issue);
    }

    await saveSyncState(db, ISSUE_SYNC_RESOURCE, {
      cursor: serverTime,
      lastError: undefined,
      lastSyncedAt: syncedAt,
      serverTime,
    });
  });
}

export async function applyTabvarIssue(db: TopoDatabase, issue: TabvarIssue): Promise<void> {
  await db.withTransactionAsync(async () => {
    await writeTabvarIssue(db, issue);
  });
}

export async function insertIssueAttachments(
  db: TopoDatabase,
  issueId: number,
  attachments: TabvarIssueAttachment[],
): Promise<void> {
  if (attachments.length === 0) return;
  await db.withTransactionAsync(async () => {
    for (const attachment of attachments) {
      await upsertIssueAttachment(db, issueId, attachment);
    }
  });
}

async function writeTabvarIssue(db: TopoDatabase, issue: TabvarIssue): Promise<void> {
  if (issue.status === 'Deleted') {
    await db.runAsync('DELETE FROM tabvar_issues WHERE id = ?', issue.id);
    return;
  }

  const cragId = issue.cragId ?? (await resolveCragIdForRoute(db, issue.routeId));
  if (cragId == null) {
    console.warn(
      `[issues] Skipping issue ${issue.id}; TABVAR did not include cragId and route ${issue.routeId} is not in the local catalog.`,
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO tabvar_issues (
      id, route_id, crag_id, issue_type, sub_issue_type, status, last_status,
      description, bolts_affected, is_flagged, flagged_message, reported_by,
      reported_by_uid, created_at, updated_at, last_modified, approved_at,
      archived_at, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      route_id = excluded.route_id,
      crag_id = excluded.crag_id,
      issue_type = excluded.issue_type,
      sub_issue_type = excluded.sub_issue_type,
      status = excluded.status,
      last_status = excluded.last_status,
      description = excluded.description,
      bolts_affected = excluded.bolts_affected,
      is_flagged = excluded.is_flagged,
      flagged_message = excluded.flagged_message,
      reported_by = excluded.reported_by,
      reported_by_uid = excluded.reported_by_uid,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      last_modified = excluded.last_modified,
      approved_at = excluded.approved_at,
      archived_at = excluded.archived_at,
      raw_json = excluded.raw_json`,
    issue.id,
    issue.routeId,
    cragId,
    issue.issueType,
    issue.subIssueType ?? null,
    issue.status,
    issue.lastStatus ?? null,
    issue.description ?? null,
    issue.boltsAffected ?? null,
    issue.isFlagged ? 1 : 0,
    issue.flaggedMessage ?? null,
    issue.reportedBy ?? null,
    issue.reportedByUid ?? null,
    issue.createdAt ?? null,
    issue.updatedAt,
    issue.lastModified ?? null,
    issue.approvedAt ?? null,
    issue.archivedAt ?? null,
    JSON.stringify(issue),
  );

  if (issue.attachments === undefined) return;

  await db.runAsync('DELETE FROM tabvar_issue_attachments WHERE issue_id = ?', issue.id);
  for (const attachment of issue.attachments) {
    await upsertIssueAttachment(db, issue.id, attachment);
  }
}

async function upsertIssueAttachment(
  db: TopoDatabase,
  issueId: number,
  attachment: TabvarIssueAttachment,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO tabvar_issue_attachments (id, issue_id, url, name, mime_type)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       issue_id = excluded.issue_id,
       url = excluded.url,
       name = excluded.name,
       mime_type = excluded.mime_type`,
    attachment.id,
    issueId,
    attachment.url,
    attachment.name,
    attachment.type,
  );
}

async function resolveCragIdForRoute(
  db: TopoDatabase,
  routeId: number,
): Promise<number | undefined> {
  const row = await db.getFirstAsync<RouteCragRow>(
    'SELECT crag_id FROM tabvar_routes WHERE id = ?',
    routeId,
  );
  return row?.crag_id ?? undefined;
}

export async function getIssueSyncCursor(db: TopoDatabase): Promise<string | undefined> {
  return getSyncCursor(db, ISSUE_SYNC_RESOURCE);
}

export async function getSyncCursor(
  db: TopoDatabase,
  resource: TabvarSyncResource,
): Promise<string | undefined> {
  const row = await db.getFirstAsync<SyncStateRow>(
    'SELECT * FROM tabvar_sync_state WHERE resource = ?',
    resource,
  );
  return row?.cursor ?? undefined;
}

export async function saveSyncState(
  db: TopoDatabase,
  resource: TabvarSyncResource,
  input: {
    cursor?: string;
    serverTime?: string;
    lastSyncedAt?: string;
    lastError?: string;
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO tabvar_sync_state (resource, cursor, server_time, last_synced_at, last_error)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(resource) DO UPDATE SET
       cursor = excluded.cursor,
       server_time = excluded.server_time,
       last_synced_at = excluded.last_synced_at,
       last_error = excluded.last_error`,
    resource,
    input.cursor ?? null,
    input.serverTime ?? null,
    input.lastSyncedAt ?? null,
    input.lastError ?? null,
  );
}

export async function saveIssueSyncError(db: TopoDatabase, error: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO tabvar_sync_state (resource, cursor, server_time, last_synced_at, last_error)
     VALUES (?, NULL, NULL, NULL, ?)
     ON CONFLICT(resource) DO UPDATE SET
       last_error = excluded.last_error`,
    ISSUE_SYNC_RESOURCE,
    error,
  );
}

export async function getSyncError(db: TopoDatabase): Promise<string | undefined> {
  const row = await db.getFirstAsync<SyncStateRow>(
    'SELECT * FROM tabvar_sync_state WHERE resource = ?',
    ISSUE_SYNC_RESOURCE,
  );
  return row?.last_error ?? undefined;
}

export async function startSyncJob(
  db: TopoDatabase,
  kind: TabvarSyncJobKind,
  startedAt: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO tabvar_sync_jobs (id, job_kind, started_at, completed_at, error)
     VALUES (?, ?, ?, NULL, NULL)
     ON CONFLICT(id) DO UPDATE SET
       job_kind = excluded.job_kind,
       started_at = excluded.started_at,
       completed_at = NULL,
       error = NULL`,
    CURRENT_JOB_ID,
    kind,
    startedAt,
  );
}

export async function finishSyncJob(
  db: TopoDatabase,
  completedAt: string,
  error?: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE tabvar_sync_jobs SET completed_at = ?, error = ? WHERE id = ?',
    completedAt,
    error ?? null,
    CURRENT_JOB_ID,
  );
}

export async function getCurrentSyncJob(db: TopoDatabase): Promise<TabvarSyncJobState | undefined> {
  const row = await db.getFirstAsync<SyncJobRow>(
    'SELECT * FROM tabvar_sync_jobs WHERE id = ?',
    CURRENT_JOB_ID,
  );
  if (!row) return undefined;
  return {
    completedAt: row.completed_at ?? undefined,
    error: row.error ?? undefined,
    kind: row.job_kind,
    startedAt: row.started_at,
  };
}

export async function listIssueCragSummaries(db: TopoDatabase): Promise<IssueCragSummary[]> {
  const rows = await db.getAllAsync<IssueCragSummaryRow>(`
    SELECT
      issues.crag_id,
      COALESCE(crags.name, routes.crag_name, 'Crag #' || issues.crag_id) AS name,
      COUNT(issues.id) AS issue_count,
      SUM(CASE WHEN issues.is_flagged != 0 THEN 1 ELSE 0 END) AS flagged_count,
      MAX(issues.updated_at) AS newest_updated_at,
      crags.stats_active_issue_count,
      crags.stats_issue_flagged,
      crags.stats_public_issue_count
    FROM tabvar_issues issues
    LEFT JOIN tabvar_crags crags ON crags.id = issues.crag_id
    LEFT JOIN tabvar_routes routes ON routes.id = issues.route_id
    WHERE issues.status != 'Deleted'
    GROUP BY issues.crag_id
    ORDER BY newest_updated_at DESC, name ASC
  `);

  return rows.map((row) => ({
    cragId: row.crag_id,
    flaggedCount: row.flagged_count,
    issueCount: row.issue_count,
    name: row.name,
    newestUpdatedAt: row.newest_updated_at ?? undefined,
    statsActiveIssueCount: row.stats_active_issue_count ?? undefined,
    statsIssueFlagged: row.stats_issue_flagged ?? undefined,
    statsPublicIssueCount: row.stats_public_issue_count ?? undefined,
  }));
}

export async function listIssueRoutes(db: TopoDatabase): Promise<IssueRouteOption[]> {
  const rows = await db.getAllAsync<IssueRouteRow>(`
    SELECT
      routes.id,
      routes.crag_id,
      COALESCE(routes.crag_name, crags.name, 'Crag #' || routes.crag_id) AS crag_name,
      routes.name,
      COALESCE(sectors.name, routes.sector_name) AS sector_name,
      routes.grade_yds,
      routes.bolt_count,
      routes.pitch_count
    FROM tabvar_routes routes
    LEFT JOIN tabvar_crags crags ON crags.id = routes.crag_id
    LEFT JOIN tabvar_sectors sectors ON sectors.id = routes.sector_id
    WHERE routes.status IS NULL OR routes.status != 'Deleted'
    ORDER BY crag_name ASC, sector_name ASC, routes.sort_order ASC, routes.name ASC
  `);

  return rows.map((row) => ({
    boltCount: row.bolt_count ?? undefined,
    cragId: row.crag_id,
    cragName: row.crag_name,
    gradeYds: row.grade_yds ?? undefined,
    id: row.id,
    name: row.name,
    pitchCount: row.pitch_count ?? undefined,
    sectorName: row.sector_name ?? undefined,
  }));
}

export async function getIssueRouteOption(
  db: TopoDatabase,
  routeId: number,
): Promise<IssueRouteOption | undefined> {
  const rows = await db.getAllAsync<IssueRouteRow>(
    `
    SELECT
      id,
      crag_id,
      COALESCE(crag_name, 'Crag #' || crag_id) AS crag_name,
      name,
      sector_name,
      grade_yds,
      bolt_count,
      pitch_count
    FROM tabvar_routes
    WHERE id = ?
  `,
    routeId,
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    boltCount: row.bolt_count ?? undefined,
    cragId: row.crag_id,
    cragName: row.crag_name,
    gradeYds: row.grade_yds ?? undefined,
    id: row.id,
    name: row.name,
    pitchCount: row.pitch_count ?? undefined,
    sectorName: row.sector_name ?? undefined,
  };
}

export async function listIssuesForCrag(
  db: TopoDatabase,
  cragId: number,
): Promise<IssueListItem[]> {
  const rows = await db.getAllAsync<IssueListRow>(
    `
    SELECT
      issues.id,
      issues.crag_id,
      issues.route_id,
      COALESCE(routes.name, 'Route #' || issues.route_id) AS route_name,
      COALESCE(sectors.name, routes.sector_name) AS sector_name,
      routes.grade_yds,
      issues.issue_type,
      issues.sub_issue_type,
      issues.status,
      issues.description,
      issues.bolts_affected,
      issues.is_flagged,
      issues.flagged_message,
      issues.reported_by,
      issues.created_at,
      issues.updated_at,
      COUNT(attachments.id) AS attachment_count
    FROM tabvar_issues issues
    LEFT JOIN tabvar_routes routes ON routes.id = issues.route_id
    LEFT JOIN tabvar_sectors sectors ON sectors.id = routes.sector_id
    LEFT JOIN tabvar_issue_attachments attachments ON attachments.issue_id = issues.id
    WHERE issues.crag_id = ? AND issues.status != 'Deleted'
    GROUP BY issues.id
    ORDER BY issues.updated_at DESC, issues.created_at DESC, issues.id DESC
  `,
    cragId,
  );

  return rows.map(mapIssueListItem);
}

export async function getIssueDetail(
  db: TopoDatabase,
  issueId: number,
): Promise<IssueDetail | undefined> {
  const row = await db.getFirstAsync<IssueDetailRow>(
    `
    SELECT
      issues.id,
      issues.crag_id,
      issues.route_id,
      COALESCE(routes.name, 'Route #' || issues.route_id) AS route_name,
      COALESCE(sectors.name, routes.sector_name) AS sector_name,
      routes.grade_yds,
      issues.issue_type,
      issues.sub_issue_type,
      issues.status,
      issues.last_status,
      issues.description,
      issues.bolts_affected,
      issues.is_flagged,
      issues.flagged_message,
      issues.reported_by,
      issues.reported_by_uid,
      issues.created_at,
      issues.updated_at,
      issues.last_modified,
      issues.approved_at,
      issues.archived_at,
      COUNT(attachments.id) AS attachment_count
    FROM tabvar_issues issues
    LEFT JOIN tabvar_routes routes ON routes.id = issues.route_id
    LEFT JOIN tabvar_sectors sectors ON sectors.id = routes.sector_id
    LEFT JOIN tabvar_issue_attachments attachments ON attachments.issue_id = issues.id
    WHERE issues.id = ? AND issues.status != 'Deleted'
    GROUP BY issues.id
  `,
    issueId,
  );

  if (!row) return undefined;
  const attachments = await listIssueAttachments(db, issueId);
  return {
    ...mapIssueListItem(row),
    approvedAt: row.approved_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    attachments,
    lastModified: row.last_modified ?? undefined,
    lastStatus: row.last_status ?? undefined,
    reportedByUid: row.reported_by_uid ?? undefined,
  };
}

export async function listIssueAttachments(
  db: TopoDatabase,
  issueId: number,
): Promise<IssueAttachment[]> {
  const rows = await db.getAllAsync<AttachmentRow>(
    'SELECT * FROM tabvar_issue_attachments WHERE issue_id = ? ORDER BY id ASC',
    issueId,
  );
  return rows.map((row) => ({
    id: row.id,
    issueId: row.issue_id,
    mimeType: row.mime_type,
    name: row.name,
    url: row.url,
  }));
}

function mapIssueListItem(row: IssueListRow): IssueListItem {
  return {
    attachmentCount: row.attachment_count,
    boltsAffected: row.bolts_affected ?? undefined,
    cragId: row.crag_id,
    createdAt: row.created_at ?? undefined,
    description: row.description ?? undefined,
    flaggedMessage: row.flagged_message ?? undefined,
    gradeYds: row.grade_yds ?? undefined,
    id: row.id,
    issueKey: serverIssueKey(row.id),
    isFlagged: row.is_flagged !== 0,
    serverId: row.id,
    issueType: row.issue_type,
    reportedBy: row.reported_by ?? undefined,
    routeId: row.route_id,
    routeName: row.route_name ?? `Route #${row.route_id}`,
    sectorName: row.sector_name ?? undefined,
    status: row.status,
    subIssueType: row.sub_issue_type ?? undefined,
    updatedAt: row.updated_at,
  };
}
