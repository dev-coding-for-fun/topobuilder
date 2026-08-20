export type IssueKey = `server:${number}` | `local:${string}`;

export function serverIssueKey(issueId: number): IssueKey {
  return `server:${issueId}`;
}

export function localIssueKey(externalId: string): IssueKey {
  return `local:${externalId}`;
}

export function parseIssueKey(
  key: string,
): { kind: 'server'; issueId: number } | { kind: 'local'; externalId: string } | undefined {
  if (key.startsWith('server:')) {
    const issueIdPart = key.slice('server:'.length);
    if (!/^\d+$/.test(issueIdPart)) return undefined;
    const issueId = Number(issueIdPart);
    if (!Number.isSafeInteger(issueId)) return undefined;
    return { kind: 'server', issueId };
  }
  if (key.startsWith('local:')) {
    const externalId = key.slice('local:'.length);
    if (!externalId) return undefined;
    return { kind: 'local', externalId };
  }
  return undefined;
}
