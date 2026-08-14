import { pushTabvarIssue, TabvarIssueConflictError } from '@/integrations/tabvar/issues';
import type { TabvarIssue } from '@/integrations/tabvar/types';
import {
  applyTabvarIssue,
  getIssueDetail,
  type IssueDetail,
  type IssueListItem,
} from '@/storage/repos/tabvarIssuesRepo';
import type { TopoDatabase } from '@/storage/database';

import { isAllowedIssueStatusTransition } from './statusWorkflow';

export type IssueEdits = {
  status: string;
  description: string;
  flaggedMessage: string;
};

export type SaveIssueResult = {
  issue?: IssueDetail;
  conflict?: boolean;
};

export async function saveIssueEdits(
  db: TopoDatabase,
  issue: IssueListItem,
  edits: IssueEdits,
  accessToken: string,
): Promise<SaveIssueResult> {
  const description = edits.description.trim();
  const flaggedMessage = edits.flaggedMessage.trim();
  const descriptionChanged = description !== (issue.description ?? '').trim();
  const flaggedChanged = flaggedMessage !== (issue.flaggedMessage ?? '').trim();
  const statusChanged = edits.status !== issue.status;

  if (statusChanged && !isAllowedIssueStatusTransition(issue.status, edits.status)) {
    throw new Error(`Cannot change status from ${issue.status} to ${edits.status}.`);
  }

  let baseUpdatedAt = issue.updatedAt;
  try {
    if (descriptionChanged || flaggedChanged) {
      const updated = await pushTabvarIssue(accessToken, {
        baseUpdatedAt,
        fields: {
          description: description || null,
          flaggedMessage: flaggedMessage || null,
          isFlagged: Boolean(flaggedMessage),
        },
        issueId: issue.id,
        op: 'update',
      });
      await applyPushedIssue(db, updated);
      baseUpdatedAt = updated.updatedAt;
    }

    if (statusChanged) {
      const updated = await pushTabvarIssue(accessToken, {
        baseUpdatedAt,
        fields: { status: edits.status },
        issueId: issue.id,
        op: 'status',
      });
      await applyPushedIssue(db, updated);
    }
  } catch (error) {
    if (error instanceof TabvarIssueConflictError) {
      await applyPushedIssue(db, error.issue);
      return {
        conflict: true,
        issue: await getIssueDetail(db, issue.id),
      };
    }
    throw error;
  }

  return { issue: await getIssueDetail(db, issue.id) };
}

async function applyPushedIssue(db: TopoDatabase, issue: TabvarIssue) {
  await applyTabvarIssue(db, issue);
}
