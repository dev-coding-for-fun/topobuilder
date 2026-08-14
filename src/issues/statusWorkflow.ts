const RESOLVED_STATUS = 'Completed';
const REOPENED_STATUS = 'Reported';

export type IssueResolutionAction = {
  label: string;
  nextStatus: string;
};

/**
 * App-facing status actions: mark resolved (Completed) or reopen (Reported).
 * The server still enforces who may perform these; a 403 is shown as an error.
 */
export function getIssueResolutionAction(status: string): IssueResolutionAction {
  if (status === RESOLVED_STATUS) {
    return { label: 'Reopen', nextStatus: REOPENED_STATUS };
  }
  return { label: 'Mark resolved', nextStatus: RESOLVED_STATUS };
}

export function isAllowedIssueStatusTransition(current: string, next: string): boolean {
  if (next === current) return true;
  return next === getIssueResolutionAction(current).nextStatus;
}
