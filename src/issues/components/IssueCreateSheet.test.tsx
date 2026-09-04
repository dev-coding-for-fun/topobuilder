import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/BottomSheet', () => ({
  BottomSheet: ({
    children,
    testID,
    visible,
  }: {
    children: React.ReactNode;
    testID?: string;
    visible: boolean;
  }) => (visible ? <>{children}</> : null),
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
import type { IssueRouteOption } from '@/storage/repos/tabvarIssuesRepo';

import { IssueCreateSheet } from './IssueCreateSheet';

const routes: IssueRouteOption[] = [
  {
    cragId: 7,
    cragName: 'Sunny Crag',
    gradeYds: '5.11a',
    id: 456,
    name: 'Solar Flare',
    sectorName: 'Main Wall',
  },
  {
    cragId: 7,
    cragName: 'Sunny Crag',
    gradeYds: '5.10c',
    id: 457,
    name: 'Moon Beam',
    sectorName: 'Main Wall',
  },
  {
    cragId: 8,
    cragName: 'North Face',
    gradeYds: '5.9',
    id: 458,
    name: 'Cold Front',
    sectorName: 'Upper Wall',
  },
];

describe('IssueCreateSheet route picker', () => {
  it('browses from crag to sector to route', () => {
    render(
      <IssueCreateSheet
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        routes={routes}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    expect(screen.getByText('Choose a crag')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:route-picker:route:456')).toBeNull();

    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:crag:7'));
    expect(screen.getByText('Choose a sector')).toBeTruthy();

    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:sector:7:Main Wall'));
    expect(screen.getByTestId('issues:create-sheet:route-picker:route:456')).toBeTruthy();
  });

  it('keeps search results hidden until a debounced query is entered', async () => {
    render(
      <IssueCreateSheet
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        routes={routes}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:mode:search'));
    expect(screen.getByText('Start typing to search routes.')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:route-picker:route:456')).toBeNull();

    fireEvent.changeText(
      screen.getByTestId('issues:create-sheet:route-picker:search'),
      'solar',
    );
    expect(screen.queryByTestId('issues:create-sheet:route-picker:route:456')).toBeNull();

    await waitFor(() =>
      expect(screen.getByTestId('issues:create-sheet:route-picker:route:456')).toBeTruthy(),
    );
  });

  it('starts at the sector and scopes route search when a crag is provided', async () => {
    render(
      <IssueCreateSheet
        cragId={7}
        cragName="Sunny Crag"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        routes={routes}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    expect(screen.getByText('Choose a sector')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:route-picker:crag:7')).toBeNull();

    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:mode:search'));
    expect(screen.getByText('Searching within Sunny Crag')).toBeTruthy();
    fireEvent.changeText(
      screen.getByTestId('issues:create-sheet:route-picker:search'),
      'solar',
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues:create-sheet:route-picker:route:456')).toBeTruthy();
      expect(screen.queryByTestId('issues:create-sheet:route-picker:route:458')).toBeNull();
    });
  });
});

const pickerAsset = {
  fileName: 'new.jpg',
  fileSize: 2048,
  height: 800,
  mimeType: 'image/jpeg',
  uri: 'file:///new.jpg',
  width: 600,
};

describe('IssueCreateSheet attachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (canCaptureIssuePhotoWithCamera as jest.Mock).mockReturnValue(true);
    (pickIssuePhotoFromLibrary as jest.Mock).mockResolvedValue(undefined);
    (takeIssuePhotoWithCamera as jest.Mock).mockResolvedValue(undefined);
  });

  it('shows the split camera and gallery add tile', () => {
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={jest.fn()} routes={routes} visible />,
    );

    expect(screen.getByTestId('issues:create-sheet:add-attachment')).toBeTruthy();
    expect(screen.getByTestId('issues:create-sheet:add-attachment:camera')).toBeTruthy();
    expect(screen.getByTestId('issues:create-sheet:add-attachment:gallery')).toBeTruthy();
  });

  it('hides the camera half on web so gallery fills the add tile', () => {
    (canCaptureIssuePhotoWithCamera as jest.Mock).mockReturnValue(false);
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={jest.fn()} routes={routes} visible />,
    );

    expect(screen.queryByTestId('issues:create-sheet:add-attachment:camera')).toBeNull();
    expect(screen.getByTestId('issues:create-sheet:add-attachment:gallery')).toBeTruthy();
  });

  it('stages a gallery photo and submits it with the new issue', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    (pickIssuePhotoFromLibrary as jest.Mock).mockResolvedValue(pickerAsset);
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={onConfirm} routes={routes} visible />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:crag:7'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:sector:7:Main Wall'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:route:456'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:type'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:type:Bolts'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:add-attachment:gallery'));

    await waitFor(() => expect(screen.getByTestId('issues:create-sheet:attachment:0')).toBeTruthy());
    expect(screen.getByTestId('issues:create-sheet:attachment:0:image').props.source).toEqual([
      { uri: 'file:///new.jpg' },
    ]);

    fireEvent.press(screen.getByTestId('issues:create-sheet:submit'));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        boltsAffected: '',
        description: '',
        flaggedMessage: undefined,
        issueType: 'Bolts',
        photos: [
          {
            fileSize: 2048,
            filename: 'new.jpg',
            mimeType: 'image/jpeg',
            uri: 'file:///new.jpg',
          },
        ],
        routeId: 456,
        subIssueType: undefined,
      }),
    );
  });

  it('hides add-attachment control once 5 photos are attached and restores it when one is removed', async () => {
    let callCount = 0;
    (pickIssuePhotoFromLibrary as jest.Mock).mockImplementation(async () => {
      callCount += 1;
      return {
        fileName: `photo-${callCount}.jpg`,
        fileSize: 2048,
        height: 800,
        mimeType: 'image/jpeg',
        uri: `file:///photo-${callCount}.jpg`,
      };
    });

    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={jest.fn()} routes={routes} visible />,
    );

    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId('issues:create-sheet:add-attachment')).toBeTruthy();
      fireEvent.press(screen.getByTestId('issues:create-sheet:add-attachment:gallery'));
      await waitFor(() =>
        expect(screen.getByTestId(`issues:create-sheet:attachment:${i}`)).toBeTruthy(),
      );
    }

    expect(screen.queryByTestId('issues:create-sheet:add-attachment')).toBeNull();

    fireEvent.press(screen.getByTestId('issues:create-sheet:attachment:4:remove'));

    await waitFor(() =>
      expect(screen.getByTestId('issues:create-sheet:add-attachment')).toBeTruthy(),
    );
  });
});

describe('IssueCreateSheet type pickers', () => {
  it('keeps affected and issue-type options in dropdowns instead of showing pills', () => {
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={jest.fn()} routes={routes} visible />,
    );

    expect(screen.queryByTestId('issues:create-sheet:type:Bolts')).toBeNull();
    expect(screen.queryByTestId('issues:create-sheet:subtype')).toBeNull();
    expect(screen.getByText('Choose what is affected first.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('issues:create-sheet:type'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:type:Bolts'));

    expect(screen.getByTestId('issues:create-sheet:subtype')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:subtype:Rusted')).toBeNull();

    fireEvent.press(screen.getByTestId('issues:create-sheet:subtype'));
    expect(screen.getByTestId('issues:create-sheet:subtype:Rusted')).toBeTruthy();
    fireEvent.press(screen.getByTestId('issues:create-sheet:subtype:Rusted'));
    expect(screen.queryByTestId('issues:create-sheet:subtype:Rusted')).toBeNull();
  });
});

function fillRequiredCreateFields() {
  fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
  fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:crag:7'));
  fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:sector:7:Main Wall'));
  fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:route:456'));
  fireEvent.press(screen.getByTestId('issues:create-sheet:type'));
  fireEvent.press(screen.getByTestId('issues:create-sheet:type:Bolts'));
}

describe('IssueCreateSheet flag field', () => {
  it('hides the flag message until the issue is flagged', () => {
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={jest.fn()} routes={routes} visible />,
    );

    expect(screen.getByTestId('issues:create-sheet:flag').props.value).toBe(false);
    expect(screen.queryByTestId('issues:create-sheet:flagged')).toBeNull();
  });

  it('does not submit a flag without a message', () => {
    const onConfirm = jest.fn();
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={onConfirm} routes={routes} visible />,
    );

    fillRequiredCreateFields();
    fireEvent(screen.getByTestId('issues:create-sheet:flag'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('issues:create-sheet:submit'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('A message is required.')).toBeTruthy();
  });

  it('submits a flag with its required message', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <IssueCreateSheet onCancel={jest.fn()} onConfirm={onConfirm} routes={routes} visible />,
    );

    fillRequiredCreateFields();
    fireEvent(screen.getByTestId('issues:create-sheet:flag'), 'valueChange', true);
    fireEvent.changeText(
      screen.getByTestId('issues:create-sheet:flagged'),
      'Loose flake overhead',
    );
    fireEvent.press(screen.getByTestId('issues:create-sheet:submit'));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          flaggedMessage: 'Loose flake overhead',
          routeId: 456,
        }),
      ),
    );
  });
});
