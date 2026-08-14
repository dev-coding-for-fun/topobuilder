import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/BottomSheet', () => ({
  BottomSheet: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
}));

import { IssueDetailSheet } from './IssueDetailSheet';
import type { IssueDetail } from '@/storage/repos/tabvarIssuesRepo';

const issue: IssueDetail = {
  approvedAt: undefined,
  archivedAt: undefined,
  attachmentCount: 1,
  attachments: [
    {
      id: 11,
      issueId: 123,
      mimeType: 'image/jpeg',
      name: 'photo.jpg',
      url: 'https://example.test/photo.jpg',
    },
  ],
  boltsAffected: '2',
  cragId: 7,
  createdAt: '2026-06-01 00:00:00',
  description: 'Spinner on bolt 2',
  flaggedMessage: 'Needs review',
  gradeYds: '5.11a',
  id: 123,
  isFlagged: true,
  issueType: 'Bolts',
  reportedBy: 'Jane Doe',
  routeId: 456,
  routeName: 'Solar Flare',
  sectorName: 'Main Wall',
  status: 'Reported',
  subIssueType: 'Rusted',
  updatedAt: '2026-06-09 10:00:00',
};

describe('IssueDetailSheet', () => {
  it('opens as an edit form without status controls', () => {
    render(
      <IssueDetailSheet
        issue={issue}
        onClose={jest.fn()}
        onOpenAttachment={jest.fn()}
        onSave={jest.fn().mockResolvedValue({})}
      />,
    );

    expect(screen.getByTestId('issues:detail:description').props.value).toBe('Spinner on bolt 2');
    expect(screen.getByTestId('issues:detail:flagged').props.value).toBe('Needs review');
    expect(screen.getByTestId('issues:detail:attachment:11')).toBeTruthy();
    expect(screen.getByTestId('issues:detail:attachment:11:image').props.source).toEqual({
      uri: 'https://example.test/photo.jpg',
    });
    expect(screen.queryByText('photo.jpg')).toBeNull();
    expect(screen.queryByText('image/jpeg')).toBeNull();
    expect(screen.queryByTestId('issues:detail:resolve')).toBeNull();
    expect(screen.queryByTestId('issues:detail:status')).toBeNull();
    expect(screen.queryByText('Mark resolved')).toBeNull();
  });

  it('saves description changes and closes', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue({});
    render(
      <IssueDetailSheet issue={issue} onClose={onClose} onOpenAttachment={jest.fn()} onSave={onSave} />,
    );

    fireEvent.changeText(screen.getByTestId('issues:detail:description'), 'Updated spinner');
    fireEvent.press(screen.getByTestId('issues:detail:save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(issue, {
        description: 'Updated spinner',
        flaggedMessage: 'Needs review',
        status: 'Reported',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without saving when cancelled', () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue({});
    render(
      <IssueDetailSheet issue={issue} onClose={onClose} onOpenAttachment={jest.fn()} onSave={onSave} />,
    );

    fireEvent.changeText(screen.getByTestId('issues:detail:description'), 'Scratch this');
    fireEvent.press(screen.getByTestId('issues:detail:cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('opens a tiled attachment without showing filename or type', () => {
    const onOpenAttachment = jest.fn();
    render(
      <IssueDetailSheet
        issue={issue}
        onClose={jest.fn()}
        onOpenAttachment={onOpenAttachment}
        onSave={jest.fn().mockResolvedValue({})}
      />,
    );

    fireEvent.press(screen.getByTestId('issues:detail:attachment:11'));

    expect(onOpenAttachment).toHaveBeenCalledWith(issue.attachments[0]);
  });
});
