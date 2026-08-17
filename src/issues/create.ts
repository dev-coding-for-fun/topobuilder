import type { IssuePhotoUpload } from '@/issues/attachments';
import { flushIssueOutbox } from '@/issues/outbox';
import {
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

  const detail = await queuePendingIssueCreate(
    db,
    {
      boltsAffected: input.boltsAffected?.trim() || undefined,
      cragId: route.cragId,
      description: input.description?.trim() || undefined,
      flaggedMessage: undefined,
      isFlagged: false,
      issueType: input.issueType,
      routeId: input.routeId,
      status: 'In Moderation',
      subIssueType: input.subIssueType?.trim() || undefined,
    },
    input.photos ?? [],
  );

  await flushIssueOutbox(db, accessToken, 'interactive').catch((error) => {
    console.warn('[issues] interactive create flush failed', error);
  });
  return detail;
}
