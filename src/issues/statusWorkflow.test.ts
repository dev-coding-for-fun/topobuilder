import { getIssueResolutionAction, isAllowedIssueStatusTransition } from './statusWorkflow';

describe('issue status workflow', () => {
  it('marks unresolved issues as completed', () => {
    expect(getIssueResolutionAction('Reported')).toEqual({
      label: 'Mark resolved',
      nextStatus: 'Completed',
    });
    expect(getIssueResolutionAction('Viewed')).toEqual({
      label: 'Mark resolved',
      nextStatus: 'Completed',
    });
    expect(getIssueResolutionAction('In Moderation')).toEqual({
      label: 'Mark resolved',
      nextStatus: 'Completed',
    });
  });

  it('reopens completed issues', () => {
    expect(getIssueResolutionAction('Completed')).toEqual({
      label: 'Reopen',
      nextStatus: 'Reported',
    });
  });

  it('allows only resolve and reopen transitions', () => {
    expect(isAllowedIssueStatusTransition('Reported', 'Completed')).toBe(true);
    expect(isAllowedIssueStatusTransition('Completed', 'Reported')).toBe(true);
    expect(isAllowedIssueStatusTransition('Reported', 'Reported')).toBe(true);
    expect(isAllowedIssueStatusTransition('Reported', 'In Moderation')).toBe(false);
    expect(isAllowedIssueStatusTransition('Completed', 'Archived')).toBe(false);
  });
});
