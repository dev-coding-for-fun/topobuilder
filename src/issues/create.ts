import type { IssuePhotoUpload } from '@/issues/attachments';
import { flushIssueOutbox } from '@/issues/outbox';
import {
  getIssueDetailWithPending,
  getIssueRouteOption,
  queuePendingIssueCreate,
  type IssueDetail,
} from '@/storage/repos';
import type { TopoDatabase } from '@/storage/database';

export type CreateIssueInput = {
  routeId: number;
  issueType: string;
  subIssueType?: string;
  description?: string;
  boltsAffected?: string;
  flaggedMessage?: string;
  photos?: IssuePhotoUpload[];
};

export async function createIssue(
  db: TopoDatabase,
  input: CreateIssueInput,
  accessToken: string,
): Promise<IssueDetail> {
  const route = await getIssueRouteOption(db, input.routeId);
  if (!route) {
    throw new Error('Choose a synced route before creating an offline issue.');
  }

  const flaggedMessage = input.flaggedMessage?.trim() || undefined;

  const detail = await queuePendingIssueCreate(
    db,
    {
      boltsAffected: input.boltsAffected?.trim() || undefined,
      cragId: route.cragId,
      description: input.description?.trim() || undefined,
      flaggedMessage,
      isFlagged: Boolean(flaggedMessage),
      issueType: input.issueType,
      routeId: input.routeId,
      status: 'In Moderation',
      subIssueType: input.subIssueType?.trim() || undefined,
    },
    input.photos ?? [],
  );

  const flush = await flushIssueOutbox(db, accessToken, 'interactive').catch((error) => {
    console.warn('[issues] interactive create flush failed', error);
    return undefined;
  });
  const stillQueued = await getIssueDetailWithPending(db, detail.issueKey ?? detail.id);
  if (stillQueued) return stillQueued;

  const externalId = detail.localExternalId ?? (typeof detail.id === 'string' ? detail.id : undefined);
  const serverId = externalId ? flush?.createdIssueIds[externalId] : undefined;
  if (serverId != null) {
    return (await getIssueDetailWithPending(db, serverId)) ?? detail;
  }
  return detail;
}
