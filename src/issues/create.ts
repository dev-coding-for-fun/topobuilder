import { createId } from '@/domain/ids';
import { pushTabvarIssue } from '@/integrations/tabvar/issues';
import {
  applyTabvarIssue,
  getIssueDetail,
  type IssueDetail,
} from '@/storage/repos/tabvarIssuesRepo';
import type { TopoDatabase } from '@/storage/database';

export type CreateIssueInput = {
  routeId: number;
  issueType: string;
  subIssueType?: string;
  description?: string;
  boltsAffected?: string;
};

export async function createIssue(
  db: TopoDatabase,
  input: CreateIssueInput,
  accessToken: string,
): Promise<IssueDetail> {
  const issue = await pushTabvarIssue(accessToken, {
    externalId: createId('issue'),
    fields: {
      boltsAffected: input.boltsAffected?.trim() || null,
      description: input.description?.trim() || null,
      issueType: input.issueType,
      routeId: input.routeId,
      status: 'In Moderation',
      subIssueType: input.subIssueType?.trim() || null,
    },
    op: 'create',
  });

  await applyTabvarIssue(db, issue);
  const detail = await getIssueDetail(db, issue.id);
  if (!detail) {
    throw new Error('TABVAR created the issue, but it could not be loaded locally.');
  }
  return detail;
}
