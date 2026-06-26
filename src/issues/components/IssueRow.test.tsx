import { render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

import { IssueRow } from './IssueRow';

describe('IssueRow', () => {
  it('renders issue metadata with truncated text and attachment count', () => {
    render(
      <IssueRow
        issue={{
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
        }}
        onOpen={jest.fn()}
      />,
    );

    expect(screen.getByText('Solar Flare')).toBeTruthy();
    expect(screen.getByText('Main Wall · 5.11a')).toBeTruthy();
    expect(screen.getByText('Bolts · Rusted · Reported · bolts 2')).toBeTruthy();
    expect(screen.getByTestId('issues:issue-row:123:attachments')).toBeTruthy();
  });
});
