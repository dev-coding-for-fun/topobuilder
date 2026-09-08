import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Topo } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';

import { TopoInfoSheet } from './TopoInfoSheet';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const mockTopo: Topo = {
  id: 'topo-1',
  sectorId: 'sector-1',
  name: 'Main Wall',
  description: 'Approach from the south path.',
  photoUri: 'file:///photo.jpg',
  photoWidth: 1000,
  photoHeight: 800,
  tabvarDirty: false,
  sortOrder: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('TopoInfoSheet', () => {
  const mockLoadTopoInfo = jest.fn();
  const mockRenameTopo = jest.fn();
  const mockUpdateTopoDescription = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnAfterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadTopoInfo.mockResolvedValue({
      topo: mockTopo,
      routes: [],
    });
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      loadTopoInfo: mockLoadTopoInfo,
      renameTopo: mockRenameTopo,
      updateTopoDescription: mockUpdateTopoDescription,
    });
  });

  it('renders topo name and description when topoId is provided', async () => {
    render(
      <TopoInfoSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        topoId="topo-1"
      />,
    );

    await waitFor(() => {
      expect(mockLoadTopoInfo).toHaveBeenCalledWith('topo-1');
      expect(screen.getByTestId('topo-info:sheet')).toBeTruthy();
      expect(screen.getByDisplayValue('Main Wall')).toBeTruthy();
      expect(screen.getByDisplayValue('Approach from the south path.')).toBeTruthy();
    });
  });

  it('commits name changes on blur', async () => {
    render(
      <TopoInfoSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        topoId="topo-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Main Wall')).toBeTruthy();
    });

    const nameInput = screen.getByTestId('topo-info:name');
    fireEvent.changeText(nameInput, 'Upper Wall');
    fireEvent(nameInput, 'blur');

    await waitFor(() => {
      expect(mockRenameTopo).toHaveBeenCalledWith('topo-1', 'Upper Wall');
      expect(mockOnAfterChange).toHaveBeenCalled();
    });
  });

  it('commits description changes on blur', async () => {
    render(
      <TopoInfoSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        topoId="topo-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Approach from the south path.')).toBeTruthy();
    });

    const descInput = screen.getByTestId('topo-info:description');
    fireEvent.changeText(descInput, 'Updated approach.');
    fireEvent(descInput, 'blur');

    await waitFor(() => {
      expect(mockUpdateTopoDescription).toHaveBeenCalledWith('topo-1', 'Updated approach.');
      expect(mockOnAfterChange).toHaveBeenCalled();
    });
  });

  it('commits pending changes and closes on close request', async () => {
    render(
      <TopoInfoSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        topoId="topo-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Main Wall')).toBeTruthy();
    });

    const descInput = screen.getByTestId('topo-info:description');
    fireEvent.changeText(descInput, 'Closing note');

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.press(closeBtn);

    await waitFor(() => {
      expect(mockUpdateTopoDescription).toHaveBeenCalledWith('topo-1', 'Closing note');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('does not render content when topoId is undefined', () => {
    render(
      <TopoInfoSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        topoId={undefined}
      />,
    );

    expect(screen.queryByTestId('topo-info:name')).toBeNull();
  });
});
