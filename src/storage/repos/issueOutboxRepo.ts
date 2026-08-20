import { createId, nowIso } from '@/domain/ids';
import type { IssuePhotoUpload } from '@/issues/attachments';
import { localIssueKey, parseIssueKey, serverIssueKey, type IssueKey } from '@/issues/keys';
import { deleteIssuePhoto, persistIssuePhoto } from '@/issues/photoStorage';

import type { TopoDatabase } from '../database';
import {
  getIssueDetail,
  listIssuesForCrag,
  type IssueDetail,
  type IssueListItem,
} from './tabvarIssuesRepo';

export type PendingIssueFields = {
  routeId: number;
  cragId: number;
  issueType: string;
  subIssueType?: string | null;
  status: string;
  description?: string | null;
  boltsAffected?: string | null;
  isFlagged: boolean;
  flaggedMessage?: string | null;
};

export type PendingIssueCreate = PendingIssueFields & {
  externalId: string;
  createdAt: string;
  updatedAt: string;
};

export type PendingIssueEdit = PendingIssueFields & {
  issueId: number;
  baseUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PendingIssueAttachment = {
  id: string;
  issueKey: IssueKey;
  localUri: string;
  filename: string;
  mimeType: IssuePhotoUpload['mimeType'];
  fileSize?: number;
  uploaded: boolean;
  createdAt: string;
};

export type IssueSyncLogStatus = 'ok' | 'partial' | 'error';

export type IssueSyncLogEntry = {
  id: string;
  triggerKind: string;
  startedAt: string;
  finishedAt: string;
  status: IssueSyncLogStatus;
  summary: string;
  details: unknown[];
};

export type UnsyncedIssueListItem = IssueListItem & {
  issueKey: IssueKey;
  cragName: string;
};

type PendingIssueRow = {
  external_id: string;
  route_id: number;
  crag_id: number;
  issue_type: string;
  sub_issue_type: string | null;
  status: string;
  description: string | null;
  bolts_affected: string | null;
  is_flagged: number;
  flagged_message: string | null;
  created_at: string;
  updated_at: string;
  route_name: string | null;
  crag_name: string | null;
  sector_name: string | null;
  grade_yds: string | null;
  attachment_count: number;
};

type PendingEditRow = {
  issue_id: number;
  route_id: number;
  crag_id: number;
  issue_type: string;
  sub_issue_type: string | null;
  status: string;
  description: string | null;
  bolts_affected: string | null;
  is_flagged: number;
  flagged_message: string | null;
  base_updated_at: string;
  created_at: string;
  updated_at: string;
};

type PendingAttachmentRow = {
  id: string;
  issue_key: IssueKey;
  local_uri: string;
  filename: string;
  mime_type: IssuePhotoUpload['mimeType'];
  file_size: number | null;
  uploaded: number;
  created_at: string;
};

type CragNameRow = {
  name: string | null;
};

type IssueSyncLogRow = {
  id: string;
  trigger_kind: string;
  started_at: string;
  finished_at: string;
  status: string;
  summary: string;
  details_json: string;
};

export async function queuePendingIssueCreate(
  db: TopoDatabase,
  fields: PendingIssueFields,
  photos: IssuePhotoUpload[],
): Promise<IssueDetail> {
  const externalId = createId('issue');
  const createdAt = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO pending_issues (
        external_id, route_id, crag_id, issue_type, sub_issue_type, status,
        description, bolts_affected, is_flagged, flagged_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      externalId,
      fields.routeId,
      fields.cragId,
      fields.issueType,
      fields.subIssueType ?? null,
      fields.status,
      fields.description ?? null,
      fields.boltsAffected ?? null,
      fields.isFlagged ? 1 : 0,
      fields.flaggedMessage ?? null,
      createdAt,
      createdAt,
    );
  });

  for (const photo of photos) {
    await queuePendingAttachment(db, localIssueKey(externalId), photo);
  }

  const detail = await getPendingIssueDetail(db, localIssueKey(externalId));
  if (!detail) throw new Error('Could not load the queued issue.');
  return detail;
}

export async function queuePendingIssueEdit(
  db: TopoDatabase,
  issue: IssueListItem,
  fields: PendingIssueFields,
  baseUpdatedAt: string,
): Promise<IssueDetail> {
  if (issue.localExternalId) {
    await updatePendingIssue(db, issue.localExternalId, fields);
    const detail = await getPendingIssueDetail(db, localIssueKey(issue.localExternalId));
    if (!detail) throw new Error('Could not load the queued issue.');
    return detail;
  }

  const issueId = issue.serverId ?? Number(issue.id);
  const now = nowIso();
  const existing = await db.getFirstAsync<PendingEditRow>(
    'SELECT * FROM pending_issue_edits WHERE issue_id = ?',
    issueId,
  );
  await db.runAsync(
    `INSERT INTO pending_issue_edits (
      issue_id, route_id, crag_id, issue_type, sub_issue_type, status,
      description, bolts_affected, is_flagged, flagged_message, base_updated_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(issue_id) DO UPDATE SET
      issue_type = excluded.issue_type,
      sub_issue_type = excluded.sub_issue_type,
      status = excluded.status,
      description = excluded.description,
      bolts_affected = excluded.bolts_affected,
      is_flagged = excluded.is_flagged,
      flagged_message = excluded.flagged_message,
      updated_at = excluded.updated_at`,
    issueId,
    fields.routeId,
    fields.cragId,
    fields.issueType,
    fields.subIssueType ?? null,
    fields.status,
    fields.description ?? null,
    fields.boltsAffected ?? null,
    fields.isFlagged ? 1 : 0,
    fields.flaggedMessage ?? null,
    existing?.base_updated_at ?? baseUpdatedAt,
    existing?.created_at ?? now,
    now,
  );

  const detail = await getIssueDetailWithPending(db, serverIssueKey(issueId));
  if (!detail) throw new Error('Could not load the queued issue edit.');
  return detail;
}

export async function queuePendingAttachment(
  db: TopoDatabase,
  issueKey: IssueKey,
  photo: IssuePhotoUpload,
): Promise<PendingIssueAttachment> {
  const persisted = await persistIssuePhoto(photo);
  const id = createId('issue_attachment');
  const createdAt = nowIso();
  await db.runAsync(
    `INSERT INTO pending_issue_attachments (
      id, issue_key, local_uri, filename, mime_type, file_size, uploaded, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    id,
    issueKey,
    persisted.uri,
    persisted.filename,
    persisted.mimeType,
    persisted.fileSize ?? null,
    createdAt,
  );
  return {
    id,
    issueKey,
    localUri: persisted.uri,
    filename: persisted.filename,
    mimeType: persisted.mimeType,
    fileSize: persisted.fileSize,
    uploaded: false,
    createdAt,
  };
}

export async function deletePendingAttachment(db: TopoDatabase, attachmentId: string): Promise<void> {
  const row = await db.getFirstAsync<PendingAttachmentRow>(
    'SELECT * FROM pending_issue_attachments WHERE id = ? AND uploaded = 0',
    attachmentId,
  );
  if (!row) return;
  await db.runAsync('DELETE FROM pending_issue_attachments WHERE id = ?', attachmentId);
  await deleteIssuePhoto(row.local_uri);
}

export async function listIssuesForCragWithPending(
  db: TopoDatabase,
  cragId: number,
): Promise<IssueListItem[]> {
  const [base, edits, creates] = await Promise.all([
    listIssuesForCrag(db, cragId),
    listPendingEdits(db),
    listPendingIssueRows(db, cragId),
  ]);
  const editMap = new Map(edits.map((edit) => [edit.issueId, edit]));
  const overlaid = await Promise.all(
    base.map(async (issue) => applyPendingEdit(db, issue, editMap.get(issue.serverId ?? Number(issue.id)))),
  );
  const pendingCreates = creates.map(mapPendingIssueRow);
  return [...pendingCreates, ...overlaid].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getIssueDetailWithPending(
  db: TopoDatabase,
  issueIdOrKey: number | string,
): Promise<IssueDetail | undefined> {
  const key =
    typeof issueIdOrKey === 'number'
      ? serverIssueKey(issueIdOrKey)
      : issueIdOrKey.startsWith('server:') || issueIdOrKey.startsWith('local:')
        ? (issueIdOrKey as IssueKey)
        : serverIssueKey(Number(issueIdOrKey));

  const parsed = parseIssueKey(key);
  if (parsed.kind === 'local') {
    return getPendingIssueDetail(db, key);
  }

  const detail = await getIssueDetail(db, parsed.issueId);
  if (!detail) return undefined;
  const edit = await getPendingEdit(db, parsed.issueId);
  const overlaid = await applyPendingEdit(db, detail, edit);
  return {
    ...overlaid,
    attachments: [
      ...detail.attachments,
      ...(await listPendingAttachmentsForIssue(db, key)).map((attachment) => ({
        id: attachment.id,
        issueId: detail.id,
        localUri: attachment.localUri,
        mimeType: attachment.mimeType,
        name: attachment.filename,
        pendingSync: true,
        url: attachment.localUri,
      })),
    ],
  };
}

export async function listUnsyncedIssues(db: TopoDatabase): Promise<UnsyncedIssueListItem[]> {
  const creates = (await listPendingIssueRows(db)).map((row) => ({
    ...mapPendingIssueRow(row),
    cragName: row.crag_name ?? `Crag #${row.crag_id}`,
  }));

  const editRows = await listPendingEdits(db);
  const attachmentRows = await listPendingAttachments(db);
  const serverIssueIds = new Set<number>();
  for (const edit of editRows) serverIssueIds.add(edit.issueId);
  for (const attachment of attachmentRows) {
    const parsed = parseIssueKey(attachment.issueKey);
    if (parsed.kind === 'server') serverIssueIds.add(parsed.issueId);
  }

  const serverIssues: UnsyncedIssueListItem[] = [];
  for (const issueId of serverIssueIds) {
    const detail = await getIssueDetailWithPending(db, serverIssueKey(issueId));
    if (detail) {
      serverIssues.push({
        ...detail,
        cragName: await cragNameForIssue(db, detail.cragId),
        issueKey: detail.issueKey ?? serverIssueKey(issueId),
      });
    }
  }

  return [...creates, ...serverIssues].sort(
    (a, b) => a.cragName.localeCompare(b.cragName) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getPendingIssueCount(db: TopoDatabase): Promise<number> {
  return (await listUnsyncedIssueKeys(db)).size;
}

async function listUnsyncedIssueKeys(db: TopoDatabase): Promise<Set<string>> {
  const keys = new Set<string>();

  const creates = await db.getAllAsync<{ external_id: string }>('SELECT external_id FROM pending_issues');
  for (const row of creates) keys.add(localIssueKey(row.external_id));

  const edits = await db.getAllAsync<{ issue_id: number }>('SELECT issue_id FROM pending_issue_edits');
  for (const row of edits) keys.add(serverIssueKey(row.issue_id));

  const attachments = await db.getAllAsync<{ issue_key: string }>(
    'SELECT DISTINCT issue_key FROM pending_issue_attachments WHERE uploaded = 0',
  );
  for (const row of attachments) {
    if (row.issue_key) keys.add(row.issue_key);
  }

  return keys;
}

export async function listPendingCreates(db: TopoDatabase): Promise<PendingIssueCreate[]> {
  return (await listPendingIssueRows(db)).map((row) => ({
    boltsAffected: row.bolts_affected ?? undefined,
    cragId: row.crag_id,
    createdAt: row.created_at,
    description: row.description ?? undefined,
    externalId: row.external_id,
    flaggedMessage: row.flagged_message ?? undefined,
    isFlagged: row.is_flagged !== 0,
    issueType: row.issue_type,
    routeId: row.route_id,
    status: row.status,
    subIssueType: row.sub_issue_type ?? undefined,
    updatedAt: row.updated_at,
  }));
}

export async function listPendingEdits(db: TopoDatabase): Promise<PendingIssueEdit[]> {
  const rows = await db.getAllAsync<PendingEditRow>('SELECT * FROM pending_issue_edits ORDER BY updated_at ASC');
  return rows.map(mapPendingEditRow);
}

export async function listPendingAttachments(
  db: TopoDatabase,
  issueKey?: IssueKey,
): Promise<PendingIssueAttachment[]> {
  const rows = issueKey
    ? await db.getAllAsync<PendingAttachmentRow>(
        'SELECT * FROM pending_issue_attachments WHERE issue_key = ? ORDER BY created_at ASC',
        issueKey,
      )
    : await db.getAllAsync<PendingAttachmentRow>(
        'SELECT * FROM pending_issue_attachments ORDER BY created_at ASC',
      );
  return rows.map(mapPendingAttachmentRow);
}

export async function markPendingAttachmentUploaded(db: TopoDatabase, attachmentId: string): Promise<void> {
  await db.runAsync('UPDATE pending_issue_attachments SET uploaded = 1 WHERE id = ?', attachmentId);
}

export async function deletePendingIssueCreate(db: TopoDatabase, externalId: string): Promise<void> {
  const attachments = await listPendingAttachments(db, localIssueKey(externalId));
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pending_issue_attachments WHERE issue_key = ?', localIssueKey(externalId));
    await db.runAsync('DELETE FROM pending_issues WHERE external_id = ?', externalId);
  });
  await Promise.all(attachments.map((attachment) => deleteIssuePhoto(attachment.localUri)));
}

export async function deletePendingIssueEdit(db: TopoDatabase, issueId: number): Promise<void> {
  await db.runAsync('DELETE FROM pending_issue_edits WHERE issue_id = ?', issueId);
}

export async function updatePendingIssueEditBase(
  db: TopoDatabase,
  issueId: number,
  baseUpdatedAt: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE pending_issue_edits SET base_updated_at = ? WHERE issue_id = ?',
    baseUpdatedAt,
    issueId,
  );
}

export async function deleteUploadedPendingAttachment(db: TopoDatabase, attachmentId: string): Promise<void> {
  const row = await db.getFirstAsync<PendingAttachmentRow>(
    'SELECT * FROM pending_issue_attachments WHERE id = ?',
    attachmentId,
  );
  await db.runAsync('DELETE FROM pending_issue_attachments WHERE id = ?', attachmentId);
  if (row) await deleteIssuePhoto(row.local_uri);
}

export async function addIssueSyncLog(
  db: TopoDatabase,
  input: {
    triggerKind: string;
    startedAt: string;
    finishedAt: string;
    status: IssueSyncLogStatus;
    summary: string;
    details: unknown[];
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO issue_sync_log (
      id, trigger_kind, started_at, finished_at, status, summary, details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    createId('issue_sync_log'),
    input.triggerKind,
    input.startedAt,
    input.finishedAt,
    input.status,
    input.summary,
    JSON.stringify(input.details),
  );
}

const DEFAULT_SYNC_LOG_LIMIT = 50;

export async function listIssueSyncLogs(
  db: TopoDatabase,
  limit = DEFAULT_SYNC_LOG_LIMIT,
): Promise<IssueSyncLogEntry[]> {
  const rows = await db.getAllAsync<IssueSyncLogRow>(
    `SELECT id, trigger_kind, started_at, finished_at, status, summary, details_json
     FROM issue_sync_log
     ORDER BY started_at DESC
     LIMIT ?`,
    limit,
  );
  return rows.map(mapIssueSyncLogRow);
}

async function updatePendingIssue(
  db: TopoDatabase,
  externalId: string,
  fields: PendingIssueFields,
): Promise<void> {
  await db.runAsync(
    `UPDATE pending_issues SET
      issue_type = ?,
      sub_issue_type = ?,
      status = ?,
      description = ?,
      bolts_affected = ?,
      is_flagged = ?,
      flagged_message = ?,
      updated_at = ?
     WHERE external_id = ?`,
    fields.issueType,
    fields.subIssueType ?? null,
    fields.status,
    fields.description ?? null,
    fields.boltsAffected ?? null,
    fields.isFlagged ? 1 : 0,
    fields.flaggedMessage ?? null,
    nowIso(),
    externalId,
  );
}

async function getPendingIssueDetail(db: TopoDatabase, key: IssueKey): Promise<IssueDetail | undefined> {
  const parsed = parseIssueKey(key);
  if (parsed.kind !== 'local') return undefined;
  const rows = await listPendingIssueRows(db);
  const row = rows.find((candidate) => candidate.external_id === parsed.externalId);
  if (!row) return undefined;
  return {
    ...mapPendingIssueRow(row),
    attachments: (await listPendingAttachmentsForIssue(db, key)).map((attachment) => ({
      id: attachment.id,
      issueId: row.external_id,
      localUri: attachment.localUri,
      mimeType: attachment.mimeType,
      name: attachment.filename,
      pendingSync: true,
      url: attachment.localUri,
    })),
  };
}

async function listPendingIssueRows(db: TopoDatabase, cragId?: number): Promise<PendingIssueRow[]> {
  const sql = `
    SELECT
      pending.*,
      COALESCE(routes.name, 'Route #' || pending.route_id) AS route_name,
      COALESCE(crags.name, routes.crag_name, 'Crag #' || pending.crag_id) AS crag_name,
      COALESCE(sectors.name, routes.sector_name) AS sector_name,
      routes.grade_yds,
      (
        SELECT COUNT(*)
        FROM pending_issue_attachments attachments
        WHERE attachments.issue_key = 'local:' || pending.external_id
          AND attachments.uploaded = 0
      ) AS attachment_count
    FROM pending_issues pending
    LEFT JOIN tabvar_routes routes ON routes.id = pending.route_id
    LEFT JOIN tabvar_crags crags ON crags.id = pending.crag_id
    LEFT JOIN tabvar_sectors sectors ON sectors.id = routes.sector_id
    ${cragId === undefined ? '' : 'WHERE pending.crag_id = ?'}
    ORDER BY pending.updated_at DESC
  `;
  return cragId === undefined
    ? db.getAllAsync<PendingIssueRow>(sql)
    : db.getAllAsync<PendingIssueRow>(sql, cragId);
}

async function applyPendingEdit(
  db: TopoDatabase,
  issue: IssueListItem,
  edit?: PendingIssueEdit,
): Promise<IssueListItem> {
  const issueKey = issue.serverId ? serverIssueKey(issue.serverId) : issue.issueKey ?? serverIssueKey(Number(issue.id));
  const pendingAttachments = await listPendingAttachmentsForIssue(db, issueKey);
  if (!edit) {
    return {
      ...issue,
      attachmentCount: issue.attachmentCount + pendingAttachments.length,
      pendingSync: issue.pendingSync || pendingAttachments.length > 0,
    };
  }
  return {
    ...issue,
    attachmentCount: issue.attachmentCount + pendingAttachments.length,
    boltsAffected: edit.boltsAffected ?? undefined,
    description: edit.description ?? undefined,
    flaggedMessage: edit.flaggedMessage ?? undefined,
    isFlagged: edit.isFlagged,
    issueType: edit.issueType,
    pendingSync: true,
    status: edit.status,
    subIssueType: edit.subIssueType ?? undefined,
    updatedAt: edit.updatedAt,
  };
}

async function listPendingAttachmentsForIssue(
  db: TopoDatabase,
  issueKey: IssueKey,
): Promise<PendingIssueAttachment[]> {
  return (await listPendingAttachments(db, issueKey)).filter((attachment) => !attachment.uploaded);
}

async function getPendingEdit(db: TopoDatabase, issueId: number): Promise<PendingIssueEdit | undefined> {
  const row = await db.getFirstAsync<PendingEditRow>('SELECT * FROM pending_issue_edits WHERE issue_id = ?', issueId);
  return row ? mapPendingEditRow(row) : undefined;
}

async function cragNameForIssue(db: TopoDatabase, cragId: number): Promise<string> {
  const row = await db.getFirstAsync<CragNameRow>('SELECT name FROM tabvar_crags WHERE id = ?', cragId);
  return row?.name ?? `Crag #${cragId}`;
}

function mapPendingIssueRow(row: PendingIssueRow): UnsyncedIssueListItem {
  return {
    attachmentCount: row.attachment_count,
    boltsAffected: row.bolts_affected ?? undefined,
    cragId: row.crag_id,
    cragName: row.crag_name ?? `Crag #${row.crag_id}`,
    createdAt: row.created_at,
    description: row.description ?? undefined,
    flaggedMessage: row.flagged_message ?? undefined,
    gradeYds: row.grade_yds ?? undefined,
    id: row.external_id,
    issueKey: localIssueKey(row.external_id),
    isFlagged: row.is_flagged !== 0,
    issueType: row.issue_type,
    localExternalId: row.external_id,
    pendingSync: true,
    routeId: row.route_id,
    routeName: row.route_name ?? `Route #${row.route_id}`,
    sectorName: row.sector_name ?? undefined,
    status: row.status,
    subIssueType: row.sub_issue_type ?? undefined,
    updatedAt: row.updated_at,
  };
}

function mapPendingEditRow(row: PendingEditRow): PendingIssueEdit {
  return {
    baseUpdatedAt: row.base_updated_at,
    boltsAffected: row.bolts_affected ?? undefined,
    cragId: row.crag_id,
    createdAt: row.created_at,
    description: row.description ?? undefined,
    flaggedMessage: row.flagged_message ?? undefined,
    isFlagged: row.is_flagged !== 0,
    issueId: row.issue_id,
    issueType: row.issue_type,
    routeId: row.route_id,
    status: row.status,
    subIssueType: row.sub_issue_type ?? undefined,
    updatedAt: row.updated_at,
  };
}

function mapPendingAttachmentRow(row: PendingAttachmentRow): PendingIssueAttachment {
  return {
    createdAt: row.created_at,
    fileSize: row.file_size ?? undefined,
    filename: row.filename,
    id: row.id,
    issueKey: row.issue_key,
    localUri: row.local_uri,
    mimeType: row.mime_type,
    uploaded: row.uploaded !== 0,
  };
}

function mapIssueSyncLogRow(row: IssueSyncLogRow): IssueSyncLogEntry {
  return {
    details: parseSyncLogDetails(row.details_json),
    finishedAt: row.finished_at,
    id: row.id,
    startedAt: row.started_at,
    status: parseSyncLogStatus(row.status),
    summary: row.summary,
    triggerKind: row.trigger_kind,
  };
}

function parseSyncLogStatus(value: string): IssueSyncLogStatus {
  if (value === 'ok' || value === 'partial' || value === 'error') return value;
  return 'error';
}

function parseSyncLogDetails(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
