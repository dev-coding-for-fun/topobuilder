import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { ConnectedCragSummary, Crag, CragSummary, Sector } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';

import CragsListScreen from './index';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/ShareSheet', () => ({
  ShareSheet: () => null,
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  Tabs: {
    Screen: () => null,
  },
}));

jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const mockCustomCrag: CragSummary = {
  id: 'custom-crag-1',
  name: 'Cougar Canyon',
  sectorCount: 2,
  topoCount: 4,
  sortOrder: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const mockUnadoptedConnectedCrag: ConnectedCragSummary = {
  tabvarCragId: 101,
  name: 'Heart Creek',
  notes: 'Popular sport climbing area',
  sectorCount: 6,
  routeCount: 75,
  topoCount: 0,
};

const mockAdoptedConnectedCrag: ConnectedCragSummary = {
  tabvarCragId: 102,
  name: 'Wasootch Slabs',
  notes: 'Slab climbing',
  sectorCount: 4,
  routeCount: 30,
  workspaceCragId: 'workspace-wasootch',
  topoCount: 2,
};

const defaultStoreMock = {
  cragSummaries: [],
  connectedCrags: [],
  isReady: true,
  storageError: undefined,
  createCrag: jest.fn(),
  adoptTabvarCrag: jest.fn(),
};

describe('CragsListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTopoStore as unknown as jest.Mock).mockReturnValue(defaultStoreMock);
  });

  it('renders preparing message when store is not ready', () => {
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      isReady: false,
    });

    render(<CragsListScreen />);
    expect(screen.getByText('Preparing local storage…')).toBeTruthy();
  });

  it('renders empty state when there are no custom or connected crags', () => {
    render(<CragsListScreen />);
    expect(screen.getByTestId('crags:empty')).toBeTruthy();
    expect(screen.getByText('No crags yet')).toBeTruthy();
    expect(screen.getByText(/Tap “New crag” below to start documenting/)).toBeTruthy();
  });

  it('renders both My Crags and Connected Crags sections when both exist', () => {
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      cragSummaries: [mockCustomCrag],
      connectedCrags: [mockUnadoptedConnectedCrag, mockAdoptedConnectedCrag],
    });

    render(<CragsListScreen />);

    // Check section headers
    expect(screen.getByTestId('crags:section:my_crags')).toBeTruthy();
    expect(screen.getByText('My Crags')).toBeTruthy();
    expect(screen.getByTestId('crags:section:connected_crags')).toBeTruthy();
    expect(screen.getByText('Connected Crags')).toBeTruthy();

    // Custom crag card rendered
    expect(screen.getByTestId('crags:card:custom-crag-1')).toBeTruthy();
    expect(screen.getByText('Cougar Canyon')).toBeTruthy();

    // Connected crag cards rendered
    expect(screen.getByTestId('crags:connected-card:101')).toBeTruthy();
    expect(screen.getByText('Heart Creek')).toBeTruthy();
    expect(screen.getByText('Tap to add to workspace')).toBeTruthy();

    expect(screen.getByTestId('crags:connected-card:102')).toBeTruthy();
    expect(screen.getByText('Wasootch Slabs')).toBeTruthy();
    expect(screen.getByText('2 topos in workspace')).toBeTruthy();
  });

  it('renders empty workspace prompt under My Crags when only connected crags exist', () => {
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      cragSummaries: [],
      connectedCrags: [mockUnadoptedConnectedCrag],
    });

    render(<CragsListScreen />);

    expect(screen.getByTestId('crags:section:my_crags')).toBeTruthy();
    expect(screen.getByTestId('crags:my-crags:empty')).toBeTruthy();
    expect(
      screen.getByText(/Tap “New crag” below to create your own, or select a connected crag below/),
    ).toBeTruthy();

    expect(screen.getByTestId('crags:section:connected_crags')).toBeTruthy();
    expect(screen.getByText('Heart Creek')).toBeTruthy();
  });

  it('filters both custom and connected crags with search term', () => {
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      cragSummaries: [mockCustomCrag],
      connectedCrags: [mockUnadoptedConnectedCrag, mockAdoptedConnectedCrag],
    });

    render(<CragsListScreen />);

    // Filter to Heart
    fireEvent.changeText(screen.getByTestId('crags:search-input'), 'Heart');

    // Only Heart Creek in connected crags matches
    expect(screen.queryByTestId('crags:section:my_crags')).toBeNull();
    expect(screen.getByTestId('crags:section:connected_crags')).toBeTruthy();
    expect(screen.getByText('Heart Creek')).toBeTruthy();
    expect(screen.queryByText('Wasootch Slabs')).toBeNull();
    expect(screen.queryByText('Cougar Canyon')).toBeNull();

    // Search for nonexistent term
    fireEvent.changeText(screen.getByTestId('crags:search-input'), 'Nonexistent');
    expect(screen.getByTestId('crags:search-empty')).toBeTruthy();
    expect(screen.getByText('No matching crags')).toBeTruthy();
  });

  it('navigates to custom crag on press', () => {
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      cragSummaries: [mockCustomCrag],
    });

    render(<CragsListScreen />);
    fireEvent.press(screen.getByTestId('crags:card:custom-crag-1:open'));
    expect(router.push).toHaveBeenCalledWith('/crags/custom-crag-1');
  });

  it('navigates to adopted crag directly on press', () => {
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      connectedCrags: [mockAdoptedConnectedCrag],
    });

    render(<CragsListScreen />);
    fireEvent.press(screen.getByTestId('crags:connected-card:102:open'));
    expect(router.push).toHaveBeenCalledWith('/crags/workspace-wasootch');
  });

  it('adopts un-adopted connected crag and navigates on press', async () => {
    const mockCreatedCrag: Crag = {
      id: 'new-adopted-crag',
      name: 'Heart Creek',
      sortOrder: 1,
      tabvarCragId: 101,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    const adoptTabvarCrag = jest.fn().mockResolvedValue(mockCreatedCrag);

    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      connectedCrags: [mockUnadoptedConnectedCrag],
      adoptTabvarCrag,
    });

    render(<CragsListScreen />);
    fireEvent.press(screen.getByTestId('crags:connected-card:101:open'));

    await waitFor(() => {
      expect(adoptTabvarCrag).toHaveBeenCalledWith(101);
      expect(router.push).toHaveBeenCalledWith('/crags/new-adopted-crag');
    });
  });

  it('creates new custom crag via FAB and navigates', async () => {
    const mockCreatedCrag: Crag = {
      id: 'brand-new-crag',
      name: 'Barrier Bluffs',
      sortOrder: 0,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    const mockSector: Sector = {
      id: 'sec-1',
      cragId: 'brand-new-crag',
      name: 'Barrier Bluffs',
      sortOrder: 0,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    const createCrag = jest.fn().mockResolvedValue({ crag: mockCreatedCrag, defaultSector: mockSector });

    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      ...defaultStoreMock,
      createCrag,
    });

    render(<CragsListScreen />);
    fireEvent.press(screen.getByTestId('crags:new-crag-fab'));

    expect(screen.getByTestId('crags:new-crag-sheet')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('crags:new-crag-sheet:input'), 'Barrier Bluffs');
    fireEvent.press(screen.getByTestId('crags:new-crag-sheet:confirm'));

    await waitFor(() => {
      expect(createCrag).toHaveBeenCalledWith('Barrier Bluffs');
      expect(router.push).toHaveBeenCalledWith('/crags/brand-new-crag');
    });
  });
});
