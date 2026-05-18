import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { NormalizedPoint, TopoProject } from '@/domain/types';
import { TopoCanvas } from '@/editor/TopoCanvas';
import { useTopoStore } from '@/state/TopoStore';

import EditorScreen from '../../app/projects/[projectId]/editor';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ projectId: 'project-1', photoId: 'photo-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

jest.mock('@/editor/EditorTopBar', () => ({
  EditorTopBar: () => null,
}));

jest.mock('@/editor/ToolPalette', () => ({
  ToolPalette: () => null,
}));

jest.mock('@/editor/TopoCanvas', () => ({
  TopoCanvas: jest.fn(() => null),
}));

jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const project: TopoProject = {
  id: 'project-1',
  name: 'Test Project',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [
    {
      id: 'photo-1',
      topoId: 'project-1',
      uri: 'file://photo.jpg',
      width: 1000,
      height: 800,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  routes: [],
  annotations: [],
};

function latestCanvasProps() {
  const calls = (TopoCanvas as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as React.ComponentProps<typeof TopoCanvas>;
}

describe('EditorScreen label editing', () => {
  const addAnnotation = jest.fn();
  const addPathAnnotation = jest.fn();
  const loadProject = jest.fn();
  const removeAnnotation = jest.fn();
  const updateAnnotation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    loadProject.mockResolvedValue(project);
    addAnnotation.mockImplementation(
      async (input: { color?: string; labelFontSize?: number; point?: NormalizedPoint }) => ({
        id: 'label-1',
        topoId: 'project-1',
        photoId: 'photo-1',
        kind: 'label',
        color: input.color ?? '#111827',
        label: '',
        labelFontSize: input.labelFontSize,
        point: input.point,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    updateAnnotation.mockImplementation(async (annotation) => annotation);
    removeAnnotation.mockResolvedValue(undefined);
    (useTopoStore as jest.Mock).mockReturnValue({
      addAnnotation,
      addPathAnnotation,
      loadProject,
      removeAnnotation,
      updateAnnotation,
    });
  });

  it('saves a non-empty label when tapping away', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.2, y: 0.3 }, { labelFontSize: 24 });
    });

    act(() => {
      latestCanvasProps().onChangeSelectedLabelText('Pitch 1');
    });
    act(() => {
      latestCanvasProps().onSelectPath(undefined);
    });

    await waitFor(() =>
      expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'label-1', label: 'Pitch 1' })),
    );
    expect(removeAnnotation).not.toHaveBeenCalled();
  });

  it('saves latest label text when typing and tapping away in the same turn', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.2, y: 0.3 }, { labelFontSize: 24 });
    });

    act(() => {
      latestCanvasProps().onChangeSelectedLabelText('Pitch 1');
      latestCanvasProps().onSelectPath(undefined);
    });

    await waitFor(() =>
      expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'label-1', label: 'Pitch 1' })),
    );
    expect(removeAnnotation).not.toHaveBeenCalled();
  });

  it('discards an empty label when tapping away', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.2, y: 0.3 }, { labelFontSize: 24 });
    });
    act(() => {
      latestCanvasProps().onSelectPath(undefined);
    });

    await waitFor(() => expect(removeAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'label-1' })));
    expect(updateAnnotation).not.toHaveBeenCalled();
  });

  it('uses selected swatch colour for new labels and persists selected-label colour immediately', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.2, y: 0.3 }, { labelFontSize: 24 });
    });

    fireEvent.press(screen.getByLabelText('Annotation colour: Ink'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Red annotation colour'));
    });

    await waitFor(() =>
      expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'label-1', color: '#DC2626' })),
    );

    await act(async () => {
      latestCanvasProps().onSelectLabel(undefined);
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.4, y: 0.5 }, { labelFontSize: 24 });
    });

    expect(addAnnotation).toHaveBeenLastCalledWith(expect.objectContaining({ color: '#DC2626' }));
  });
});
