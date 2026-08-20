import { ISSUE_SYNC_TOAST, issueSyncToastMessage } from './syncToast';

describe('issueSyncToastMessage', () => {
  it('hides technical fetch and catalog errors from ordinary users', () => {
    expect(issueSyncToastMessage(new TypeError('Failed to fetch'))).toBe(ISSUE_SYNC_TOAST);
    expect(issueSyncToastMessage(new Error('fetch failed'))).toBe(ISSUE_SYNC_TOAST);
    expect(issueSyncToastMessage(new Error('Network request failed'))).toBe(ISSUE_SYNC_TOAST);
    expect(issueSyncToastMessage(new Error('Tabvar crag catalog sync failed. (503)'))).toBe(
      ISSUE_SYNC_TOAST,
    );
  });

  it('keeps already-human sync instructions', () => {
    expect(issueSyncToastMessage(new Error('Connect TABVAR before syncing route issues.'))).toBe(
      'Connect TABVAR before syncing route issues.',
    );
  });
});
