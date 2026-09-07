import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import { IssueRow } from './IssueRow';
import type { IssueListItem } from '@/storage/repos/tabvarIssuesRepo';

const issue: IssueListItem = {
  attachmentCount: 2,
  boltsAffected: '2',
  cragId: 7,
  description: 'A long issue description that should be constrained by numberOfLines.',
  gradeYds: '5.11a',
  id: 123,
  isFlagged: false,
  issueType: 'Bolts',
  reportedBy: 'Jane Doe',
  routeId: 456,
  routeName: 'Solar Flare',
  sectorName: 'Main Wall',
  status: 'Reported',
  subIssueType: 'Rusted',
  updatedAt: '2026-06-09 10:00:00',
};

describe('IssueRow', () => {
  it('renders issue metadata with truncated text and attachment count', () => {
    render(<IssueRow issue={issue} onOpen={jest.fn()} onResolve={jest.fn()} />);

    expect(screen.getByText('Solar Flare')).toBeTruthy();
    expect(screen.getByText('Main Wall · 5.11a')).toBeTruthy();
    expect(screen.getByText('Bolts · Rusted · bolts 2')).toBeTruthy();
    expect(screen.getByTestId('issues:issue-row:123:attachments')).toBeTruthy();
    expect(screen.getByText('Mark resolved')).toBeTruthy();
    expect(screen.getByText(/Updated /)).toBeTruthy();
  });

  it('does not display details of who submitted the issue', () => {
    render(<IssueRow issue={issue} onOpen={jest.fn()} onResolve={jest.fn()} />);

    expect(screen.queryByText(/Jane Doe/)).toBeNull();
    expect(screen.queryByText(/Reported by/)).toBeNull();
  });

  it('resolves from the status control without opening the edit sheet', () => {
    const onOpen = jest.fn();
    const onResolve = jest.fn();
    render(<IssueRow issue={issue} onOpen={onOpen} onResolve={onResolve} />);

    fireEvent.press(screen.getByTestId('issues:issue-row:123:status'));

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens the edit sheet from the issue content', () => {
    const onOpen = jest.fn();
    render(<IssueRow issue={issue} onOpen={onOpen} onResolve={jest.fn()} />);

    fireEvent.press(screen.getByTestId('issues:issue-row:123:open'));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a reopen action for completed issues', () => {
    render(
      <IssueRow
        issue={{ ...issue, status: 'Completed' }}
        onOpen={jest.fn()}
        onResolve={jest.fn()}
      />,
    );

    expect(screen.getByText('Reopen')).toBeTruthy();
  });
});
