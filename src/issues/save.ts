import { flushIssueOutbox } from '@/issues/outbox';
import {
  getIssueDetailWithPending,
  queuePendingIssueEdit,
  type IssueDetail,
  type IssueListItem,
} from '@/storage/repos';
import type { TopoDatabase } from '@/storage/database';

import { isAllowedIssueStatusTransition } from './statusWorkflow';

export type IssueEdits = {
  status: string;
  issueType?: string;
  subIssueType?: string;
  description: string;
  boltsAffected?: string;
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
  const statusChanged = edits.status !== issue.status;
  const issueType = edits.issueType ?? issue.issueType;
  const subIssueType = edits.subIssueType?.trim() || undefined;
  const boltsAffected = edits.boltsAffected?.trim() || undefined;

  if (statusChanged && !isAllowedIssueStatusTransition(issue.status, edits.status)) {
    throw new Error(`Cannot change status from ${issue.status} to ${edits.status}.`);
  }

  const queued = await queuePendingIssueEdit(
    db,
    issue,
    {
      boltsAffected,
      cragId: issue.cragId,
      description: description || undefined,
      flaggedMessage: flaggedMessage || undefined,
      isFlagged: Boolean(flaggedMessage),
      issueType,
      routeId: issue.routeId,
      status: edits.status,
      subIssueType,
    },
    issue.updatedAt,
  );

  await flushIssueOutbox(db, accessToken, 'interactive').catch((error) => {
    console.warn('[issues] interactive edit flush failed', error);
  });

  return { issue: (await getIssueDetailWithPending(db, queued.issueKey ?? queued.id)) ?? queued };
}
