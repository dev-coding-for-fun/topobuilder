export type IssueKey = `server:${number}` | `local:${string}`;

export function serverIssueKey(issueId: number): IssueKey {
  return `server:${issueId}`;
}

export function localIssueKey(externalId: string): IssueKey {
  return `local:${externalId}`;
}

export function parseIssueKey(key: string): { kind: 'server'; issueId: number } | { kind: 'local'; externalId: string } {
  if (key.startsWith('server:')) {
    return { kind: 'server', issueId: Number(key.slice('server:'.length)) };
  }
  return { kind: 'local', externalId: key.slice('local:'.length) };
}
