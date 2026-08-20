export const ISSUE_SYNC_TOAST = "Couldn't sync with TABVAR. You can keep working offline.";

const HUMAN_SYNC_MESSAGES = [/connect tabvar/i];

export function issueSyncToastMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : '';
  if (message && HUMAN_SYNC_MESSAGES.some((pattern) => pattern.test(message))) {
    return message;
  }
  return ISSUE_SYNC_TOAST;
}
