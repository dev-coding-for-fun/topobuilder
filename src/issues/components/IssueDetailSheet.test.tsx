import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/BottomSheet', () => ({
  BottomSheet: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
}));
jest.mock('@/camera/photoCapture', () => ({
  canCaptureIssuePhotoWithCamera: jest.fn(() => true),
  pickIssuePhotoFromLibrary: jest.fn(),
  takeIssuePhotoWithCamera: jest.fn(),
}));

import {
  canCaptureIssuePhotoWithCamera,
  pickIssuePhotoFromLibrary,
  takeIssuePhotoWithCamera,
} from '@/camera/photoCapture';
import type { IssueDetail } from '@/storage/repos/tabvarIssuesRepo';

import { IssueDetailSheet } from './IssueDetailSheet';

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

const pickerAsset = {
  fileName: 'new.jpg',
  fileSize: 2048,
  height: 800,
  mimeType: 'image/jpeg',
  uri: 'file:///new.jpg',
  width: 600,
};

function renderSheet(
  overrides: Partial<ComponentProps<typeof IssueDetailSheet>> = {},
) {
  return render(
    <IssueDetailSheet
      issue={issue}
      onAddAttachment={jest.fn().mockResolvedValue(issue)}
      onClose={jest.fn()}
      onOpenAttachment={jest.fn()}
      onSave={jest.fn().mockResolvedValue({})}
      {...overrides}
    />,
  );
}

describe('IssueDetailSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (canCaptureIssuePhotoWithCamera as jest.Mock).mockReturnValue(true);
    (pickIssuePhotoFromLibrary as jest.Mock).mockResolvedValue(undefined);
    (takeIssuePhotoWithCamera as jest.Mock).mockResolvedValue(undefined);
  });

  it('opens as an edit form without status controls', () => {
    renderSheet();

    expect(screen.getByTestId('issues:detail:description').props.value).toBe('Spinner on bolt 2');
    expect(screen.getByTestId('issues:detail:flagged').props.value).toBe('Needs review');
    expect(screen.getByTestId('issues:detail:attachment:11')).toBeTruthy();
    expect(screen.getByTestId('issues:detail:attachment:11:image').props.source).toEqual([
      { uri: 'https://example.test/photo.jpg' },
    ]);
    expect(screen.getByTestId('issues:detail:add-attachment')).toBeTruthy();
    expect(screen.getByTestId('issues:detail:add-attachment:camera')).toBeTruthy();
    expect(screen.getByTestId('issues:detail:add-attachment:gallery')).toBeTruthy();
    expect(screen.queryByText('photo.jpg')).toBeNull();
    expect(screen.queryByText('image/jpeg')).toBeNull();
    expect(screen.queryByTestId('issues:detail:resolve')).toBeNull();
    expect(screen.queryByTestId('issues:detail:status')).toBeNull();
    expect(screen.queryByText('Mark resolved')).toBeNull();
  });

  it('saves description changes and closes', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue({});
    renderSheet({ onClose, onSave });

    fireEvent.changeText(screen.getByTestId('issues:detail:description'), 'Updated spinner');
    fireEvent.press(screen.getByTestId('issues:detail:save'));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(issue, {
        boltsAffected: '2',
        description: 'Updated spinner',
        flaggedMessage: 'Needs review',
        issueType: 'Bolts',
        status: 'Reported',
        subIssueType: 'Rusted',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without saving when cancelled', () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue({});
    renderSheet({ onClose, onSave });

    fireEvent.changeText(screen.getByTestId('issues:detail:description'), 'Scratch this');
    fireEvent.press(screen.getByTestId('issues:detail:cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('opens a tiled attachment without showing filename or type', () => {
    const onOpenAttachment = jest.fn();
    renderSheet({ onOpenAttachment });

    fireEvent.press(screen.getByTestId('issues:detail:attachment:11'));

    expect(onOpenAttachment).toHaveBeenCalledWith(issue.attachments[0]);
  });

  it('uploads a gallery photo from the add tile', async () => {
    const onAddAttachment = jest.fn().mockResolvedValue(issue);
    (pickIssuePhotoFromLibrary as jest.Mock).mockResolvedValue(pickerAsset);
    renderSheet({ onAddAttachment });

    fireEvent.press(screen.getByTestId('issues:detail:add-attachment:gallery'));

    await waitFor(() =>
      expect(onAddAttachment).toHaveBeenCalledWith(issue, {
        fileSize: 2048,
        filename: 'new.jpg',
        mimeType: 'image/jpeg',
        uri: 'file:///new.jpg',
      }),
    );
    expect(takeIssuePhotoWithCamera).not.toHaveBeenCalled();
  });

  it('uploads a camera photo from the add tile', async () => {
    const onAddAttachment = jest.fn().mockResolvedValue(issue);
    (takeIssuePhotoWithCamera as jest.Mock).mockResolvedValue(pickerAsset);
    renderSheet({ onAddAttachment });

    fireEvent.press(screen.getByTestId('issues:detail:add-attachment:camera'));

    await waitFor(() =>
      expect(onAddAttachment).toHaveBeenCalledWith(issue, {
        fileSize: 2048,
        filename: 'new.jpg',
        mimeType: 'image/jpeg',
        uri: 'file:///new.jpg',
      }),
    );
    expect(pickIssuePhotoFromLibrary).not.toHaveBeenCalled();
  });

  it('hides the camera half on web so gallery fills the add tile', () => {
    (canCaptureIssuePhotoWithCamera as jest.Mock).mockReturnValue(false);
    renderSheet();

    expect(screen.queryByTestId('issues:detail:add-attachment:camera')).toBeNull();
    expect(screen.getByTestId('issues:detail:add-attachment:gallery')).toBeTruthy();
  });
});
