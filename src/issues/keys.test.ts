import { localIssueKey, parseIssueKey, serverIssueKey } from './keys';

describe('parseIssueKey', () => {
  it('parses server and local keys', () => {
    expect(parseIssueKey(serverIssueKey(123))).toEqual({ issueId: 123, kind: 'server' });
    expect(parseIssueKey(localIssueKey('issue-1'))).toEqual({ externalId: 'issue-1', kind: 'local' });
  });

  it('rejects malformed keys', () => {
    expect(parseIssueKey('server:abc')).toBeUndefined();
    expect(parseIssueKey('server:')).toBeUndefined();
    expect(parseIssueKey('server:12.5')).toBeUndefined();
    expect(parseIssueKey('local:')).toBeUndefined();
    expect(parseIssueKey('issue-1')).toBeUndefined();
    expect(parseIssueKey('foo')).toBeUndefined();
  });
});
