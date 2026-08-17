import { nowIso } from '@/domain/ids';
import {
  pushTabvarIssue,
  uploadTabvarIssueAttachments,
} from '@/integrations/tabvar/issues';
import type { TabvarIssue } from '@/integrations/tabvar/types';
import { localIssueKey, parseIssueKey } from '@/issues/keys';
import type { TopoDatabase } from '@/storage/database';
import {
  addIssueSyncLog,
  deletePendingIssueCreate,
  deletePendingIssueEdit,
  deleteUploadedPendingAttachment,
  listPendingAttachments,
  listPendingCreates,
  listPendingEdits,
  markPendingAttachmentUploaded,
  updatePendingIssueEditBase,
  type IssueSyncLogStatus,
  type PendingIssueAttachment,
} from '@/storage/repos/issueOutboxRepo';
import {
  applyTabvarIssue,
  getIssueDetail,
  insertIssueAttachments,
} from '@/storage/repos/tabvarIssuesRepo';

export type IssueOutboxTrigger = 'interactive' | 'manual' | 'initial' | 'reconnect' | 'background';

export type IssueOutboxFlushResult = {
  status: IssueSyncLogStatus;
  summary: string;
  details: unknown[];
};

export async function flushIssueOutbox(
  db: TopoDatabase,
  accessToken: string,
  triggerKind: IssueOutboxTrigger,
): Promise<IssueOutboxFlushResult> {
  const startedAt = nowIso();
  const details: unknown[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const pending of await listPendingCreates(db)) {
    try {
      const created = await pushTabvarIssue(accessToken, {
        externalId: pending.externalId,
        fields: {
          boltsAffected: pending.boltsAffected ?? null,
          description: pending.description ?? null,
          flaggedMessage: pending.flaggedMessage ?? null,
          isFlagged: pending.isFlagged,
          issueType: pending.issueType,
          routeId: pending.routeId,
          status: pending.status,
          subIssueType: pending.subIssueType ?? null,
        },
        op: 'create',
      });
      await applyTabvarIssue(db, created);
      await uploadPendingAttachments(db, accessToken, pending.externalId, created.id);
      await deletePendingIssueCreate(db, pending.externalId);
      successCount += 1;
      details.push({ externalId: pending.externalId, issueId: created.id, op: 'create', status: 'ok' });
    } catch (error) {
      errorCount += 1;
      details.push({
        error: errorMessage(error),
        externalId: pending.externalId,
        op: 'create',
        status: 'error',
      });
    }
  }

  for (const edit of await listPendingEdits(db)) {
    try {
      let baseUpdatedAt = edit.baseUpdatedAt;
      const baseIssue = await getIssueDetail(db, edit.issueId);
      const updated = await pushTabvarIssue(accessToken, {
        baseUpdatedAt,
        fields: {
          boltsAffected: edit.boltsAffected ?? null,
          description: edit.description ?? null,
          flaggedMessage: edit.flaggedMessage ?? null,
          isFlagged: edit.isFlagged,
          issueType: edit.issueType,
          subIssueType: edit.subIssueType ?? null,
        },
        issueId: edit.issueId,
        op: 'update',
      });
      await applyPushedIssue(db, updated);
      baseUpdatedAt = updated.updatedAt;
      await updatePendingIssueEditBase(db, edit.issueId, baseUpdatedAt);

      if (baseIssue && edit.status !== baseIssue.status) {
        const statusUpdated = await pushTabvarIssue(accessToken, {
          baseUpdatedAt,
          fields: { status: edit.status },
          issueId: edit.issueId,
          op: 'status',
        });
        await applyPushedIssue(db, statusUpdated);
      }

      await deletePendingIssueEdit(db, edit.issueId);
      successCount += 1;
      details.push({ issueId: edit.issueId, op: 'edit', status: 'ok' });
    } catch (error) {
      errorCount += 1;
      details.push({ error: errorMessage(error), issueId: edit.issueId, op: 'edit', status: 'error' });
    }
  }

  const serverAttachments = (await listPendingAttachments(db)).filter((attachment) => {
    return !attachment.uploaded && attachment.issueKey.startsWith('server:');
  });
  const attachmentsByIssue = groupServerAttachments(serverAttachments);
  for (const [issueId, attachments] of attachmentsByIssue) {
    try {
      await uploadPendingAttachmentBatch(db, accessToken, issueId, attachments);
      successCount += 1;
      details.push({ attachmentCount: attachments.length, issueId, op: 'attachments', status: 'ok' });
    } catch (error) {
      errorCount += 1;
      details.push({
        attachmentCount: attachments.length,
        error: errorMessage(error),
        issueId,
        op: 'attachments',
        status: 'error',
      });
    }
  }

  const status: IssueSyncLogStatus = errorCount === 0 ? 'ok' : successCount === 0 ? 'error' : 'partial';
  const summary = `Uploaded ${successCount} issue change${successCount === 1 ? '' : 's'}${
    errorCount > 0 ? `; ${errorCount} failed` : ''
  }.`;
  await addIssueSyncLog(db, {
    details,
    finishedAt: nowIso(),
    startedAt,
    status,
    summary,
    triggerKind,
  });

  return { details, status, summary };
}

async function uploadPendingAttachments(
  db: TopoDatabase,
  accessToken: string,
  externalId: string,
  serverIssueId: number,
) {
  const attachments = (await listPendingAttachments(db, localIssueKey(externalId))).filter(
    (attachment) => !attachment.uploaded,
  );
  await uploadPendingAttachmentBatch(db, accessToken, serverIssueId, attachments);
}

async function uploadPendingAttachmentBatch(
  db: TopoDatabase,
  accessToken: string,
  issueId: number,
  attachments: PendingIssueAttachment[],
) {
  for (let offset = 0; offset < attachments.length; offset += 3) {
    const batch = attachments.slice(offset, offset + 3);
    const uploaded = await uploadTabvarIssueAttachments(
      accessToken,
      issueId,
      batch.map((attachment) => ({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        uri: attachment.localUri,
      })),
    );
    for (const attachment of batch) {
      await markPendingAttachmentUploaded(db, attachment.id);
    }
    await insertIssueAttachments(db, issueId, uploaded.attachments);
    for (const attachment of batch) {
      await deleteUploadedPendingAttachment(db, attachment.id);
    }
  }
}

function groupServerAttachments(attachments: PendingIssueAttachment[]) {
  const groups = new Map<number, PendingIssueAttachment[]>();
  for (const attachment of attachments) {
    const parsed = parseIssueKey(attachment.issueKey);
    if (parsed.kind !== 'server') continue;
    const issueId = parsed.issueId;
    const group = groups.get(issueId) ?? [];
    group.push(attachment);
    groups.set(issueId, group);
  }
  return groups;
}

async function applyPushedIssue(db: TopoDatabase, issue: TabvarIssue) {
  await applyTabvarIssue(db, issue);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
