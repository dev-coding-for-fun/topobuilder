import { render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/BottomSheet', () => ({
  BottomSheet: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
}));

import { IssueDetailSheet } from './IssueDetailSheet';

describe('IssueDetailSheet', () => {
  it('renders complete issue details and attachments', () => {
    render(
      <IssueDetailSheet
        issue={{
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
        }}
        onClose={jest.fn()}
        onOpenAttachment={jest.fn()}
      />,
    );

    expect(screen.getByText('Spinner on bolt 2')).toBeTruthy();
    expect(screen.getByText('Needs review')).toBeTruthy();
    expect(screen.getByText('photo.jpg')).toBeTruthy();
    expect(screen.getByTestId('issues:detail:attachment:11')).toBeTruthy();
  });
});
