import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Keyboard, StyleSheet } from 'react-native';

import type { Annotation, NormalizedPoint, TopoEditorBundle, TopoProject } from '@/domain/types';
import { EditorTopBar } from '@/editor/EditorTopBar';
import { TopoCanvas } from '@/editor/TopoCanvas';
import { useTopoStore } from '@/state/TopoStore';

import EditorScreen from '../../app/crags/[cragId]/topos/[topoId]/editor';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(effect, [effect]);
  },
  useLocalSearchParams: () => ({ cragId: 'crag-1', topoId: 'project-1' }),
  usePathname: () => '/crags/crag-1/topos/project-1/editor',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

jest.mock('@/editor/EditorTopBar', () => ({
  EditorTopBar: jest.fn(({ canDelete, onDelete, canUndo, onUndo, canRedo, onRedo }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    return React.createElement(
      View,
      null,
      canUndo
        ? React.createElement(
            Pressable,
            { accessibilityLabel: 'Undo', onPress: onUndo },
            React.createElement(Text, null, 'Undo'),
          )
        : null,
      canRedo
        ? React.createElement(
            Pressable,
            { accessibilityLabel: 'Redo', onPress: onRedo },
            React.createElement(Text, null, 'Redo'),
          )
        : null,
      canDelete
        ? React.createElement(
            Pressable,
            { accessibilityLabel: 'Delete selected annotation', onPress: onDelete },
            React.createElement(Text, null, 'Delete'),
          )
        : null,
    );
  }),
}));

jest.mock('@/editor/ToolPalette', () => ({
  ToolPalette: ({ onSelectTool }: { onSelectTool: (tool: string) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Line tool', onPress: () => onSelectTool('climbLine') },
        React.createElement(Text, null, 'Line'),
      ),
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Bolt', onPress: () => onSelectTool('bolt') },
        React.createElement(Text, null, 'Bolt'),
      ),
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Route marker', onPress: () => onSelectTool('start') },
        React.createElement(Text, null, 'Route marker'),
      ),
    );
  },
}));

jest.mock('@/editor/StampSizeControl', () => ({
  StampSizeControl: ({ onSelectSize }: { onSelectSize: (size: string) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Large stamp size', onPress: () => onSelectSize('large') },
        React.createElement(Text, null, 'Large'),
      ),
    );
  },
}));

jest.mock('@/editor/LineWeightControl', () => ({
  LineWeightControl: ({ onSelectWeight }: { onSelectWeight: (weight: string) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Large line weight', onPress: () => onSelectWeight('large') },
        React.createElement(Text, null, 'Large'),
      ),
    );
  },
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

type KeyboardListener = (event: { endCoordinates: { height: number; screenY: number } }) => void;

const keyboardListeners = new Map<string, KeyboardListener[]>();

function latestCanvasProps() {
  const calls = (TopoCanvas as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as React.ComponentProps<typeof TopoCanvas>;
}

function latestTopBarProps() {
  const calls = (EditorTopBar as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as React.ComponentProps<typeof EditorTopBar>;
}

function emitKeyboardEvent(eventName: string, height: number, screenY: number) {
  act(() => {
    keyboardListeners.get(eventName)?.forEach((listener) => {
      listener({ endCoordinates: { height, screenY } });
    });
  });
}

/**
 * The editor's data layer was reshaped: it now consumes a `TopoEditorBundle`
 * (`{ topo, routes, annotations }`) rather than a `TopoProject`. These tests
 * predate that change and still construct `TopoProject` fixtures, so we
 * convert at the mock boundary instead of rewriting every fixture.
 */
function bundleFromProject(p: TopoProject): TopoEditorBundle {
  const photo = p.photos[0];
  return {
    topo: {
      id: p.id,
      sectorId: 'sector-1',
      name: p.name,
      description: p.description,
      photoUri: photo?.uri,
      photoWidth: photo?.width,
      photoHeight: photo?.height,
      tabvarDirty: true,
      sortOrder: 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    },
    routes: p.routes,
    annotations: p.annotations,
  };
}

function projectWithAnnotations(): TopoProject {
  return {
    ...project,
    annotations: [
      {
        id: 'label-1',
        topoId: 'project-1',
        kind: 'label',
        color: '#111827',
        label: 'Pitch 1',
        labelFontSize: 24,
        point: { x: 0.2, y: 0.3 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'bolt-1',
        topoId: 'project-1',
        kind: 'bolt',
        color: '#FACC15',
        point: { x: 0.4, y: 0.5 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'path-1',
        topoId: 'project-1',
        kind: 'climbLine',
        color: '#2563EB',
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.8, y: 0.8 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

function startMarker(id: string, label?: string) {
  return {
    id,
    topoId: 'project-1',
    kind: 'start' as const,
    color: '#FACC15',
    label,
    point: { x: 0.2, y: 0.3 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('EditorScreen label editing', () => {
  const addAnnotation = jest.fn();
  const addPathAnnotation = jest.fn();
  const attachPhotoFromLibrary = jest.fn();
  const loadTopoEditor = jest.fn();
  const removeAnnotation = jest.fn();
  const replaceAnnotations = jest.fn();
  const updateAnnotation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    keyboardListeners.clear();
    jest.spyOn(Keyboard, 'addListener').mockImplementation((eventName, listener) => {
      const listeners = keyboardListeners.get(eventName) ?? [];
      listeners.push(listener as KeyboardListener);
      keyboardListeners.set(eventName, listeners);
      return {
        remove: jest.fn(() => {
          keyboardListeners.set(
            eventName,
            (keyboardListeners.get(eventName) ?? []).filter((item) => item !== listener),
          );
        }),
      } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
    loadTopoEditor.mockResolvedValue(bundleFromProject(project));
    addAnnotation.mockImplementation(
      async (input: { color?: string; kind?: string; label?: string; labelFontSize?: number; point?: NormalizedPoint }) => ({
        id: input.kind === 'label' || !input.kind ? 'label-1' : `${input.kind}-1`,
        topoId: 'project-1',
        kind: input.kind ?? 'label',
        color: input.color ?? '#111827',
        label: input.label ?? (input.kind === 'label' || !input.kind ? '' : undefined),
        labelFontSize: input.kind === 'label' || !input.kind ? input.labelFontSize : undefined,
        point: input.point,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    addPathAnnotation.mockImplementation(
      async (input: { color?: string; kind: string; lineWeight?: string; points: NormalizedPoint[] }) => ({
        id: 'path-1',
        topoId: 'project-1',
        kind: input.kind,
        color: input.color ?? '#FACC15',
        lineWeight: input.lineWeight ?? 'medium',
        points: input.points,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    updateAnnotation.mockImplementation(async (annotation) => annotation);
    attachPhotoFromLibrary.mockResolvedValue(true);
    removeAnnotation.mockResolvedValue(undefined);
    replaceAnnotations.mockResolvedValue(undefined);
    (useTopoStore as jest.Mock).mockReturnValue({
      addAnnotation,
      addPathAnnotation,
      attachPhotoFromLibrary,
      isReady: true,
      loadTopoEditor,
      removeAnnotation,
      replaceAnnotations,
      updateAnnotation,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('offers camera and import actions when a topo has no photo', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject({ ...project, photos: [] }));

    render(<EditorScreen />);
    await waitFor(() => expect(screen.getByTestId('editor:no-photo')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(router.replace).toHaveBeenCalledWith('/crags/crag-1');

    fireEvent.press(screen.getByTestId('editor:no-photo:camera'));
    expect(router.push).toHaveBeenCalledWith('/crags/crag-1/topos/project-1/camera');

    await act(async () => {
      fireEvent.press(screen.getByTestId('editor:no-photo:import'));
    });

    expect(attachPhotoFromLibrary).toHaveBeenCalledWith('project-1');
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

    fireEvent.press(screen.getByLabelText('Text colour: Ink'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Red text colour'));
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

  it('uses selected swatch colour for new route lines', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Line tool'));
    fireEvent.press(screen.getByLabelText('Line colour: Yellow'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Blue line colour'));
    });

    act(() => {
      latestCanvasProps().onBeginPathDraft('climbLine', { x: 0.1, y: 0.1 });
    });
    await act(async () => {
      await latestCanvasProps().onFinishPathDraft(
        { x: 0.5, y: 0.5 },
        { width: 1000, height: 1000 },
      );
    });

    expect(addPathAnnotation).toHaveBeenCalledWith(expect.objectContaining({ color: '#2563EB' }));
  });

  it('shows line weight control only for active or selected route lines', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject(projectWithAnnotations()));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    expect(screen.queryByLabelText('Large line weight')).toBeNull();

    fireEvent.press(screen.getByLabelText('Line tool'));
    expect(screen.getByLabelText('Large line weight')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Bolt'));
    expect(screen.queryByLabelText('Large line weight')).toBeNull();

    act(() => {
      latestCanvasProps().onSelectPath('path-1', [
        { x: 0.1, y: 0.1 },
        { x: 0.8, y: 0.8 },
      ]);
    });
    expect(screen.getByLabelText('Large line weight')).toBeTruthy();
  });

  it('uses selected and default line weights for new route lines', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Line tool'));
    act(() => {
      latestCanvasProps().onBeginPathDraft('climbLine', { x: 0.1, y: 0.1 });
    });
    await act(async () => {
      await latestCanvasProps().onFinishPathDraft(
        { x: 0.5, y: 0.5 },
        { width: 1000, height: 1000 },
      );
    });

    expect(addPathAnnotation).toHaveBeenLastCalledWith(expect.objectContaining({ lineWeight: 'medium' }));

    fireEvent.press(screen.getByLabelText('Line tool'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Large line weight'));
    });
    act(() => {
      latestCanvasProps().onBeginPathDraft('climbLine', { x: 0.2, y: 0.2 });
    });
    await act(async () => {
      await latestCanvasProps().onFinishPathDraft(
        { x: 0.6, y: 0.6 },
        { width: 1000, height: 1000 },
      );
    });

    expect(addPathAnnotation).toHaveBeenLastCalledWith(expect.objectContaining({ lineWeight: 'large' }));
  });

  it('updates selected route line weight while preserving colour and points', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject(projectWithAnnotations()));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    act(() => {
      latestCanvasProps().onSelectPath('path-1', [
        { x: 0.1, y: 0.1 },
        { x: 0.8, y: 0.8 },
      ]);
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Large line weight'));
    });

    await waitFor(() =>
      expect(updateAnnotation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'path-1',
          color: '#2563EB',
          lineWeight: 'large',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.8 },
          ],
        }),
      ),
    );
  });

  it('keeps stamp colour defaults independent by stamp kind', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Bolt'));
    fireEvent.press(screen.getByLabelText('Stamp colour: Yellow'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Magenta stamp colour'));
    });
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('bolt', { x: 0.2, y: 0.3 }, {});
    });
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('rappel', { x: 0.4, y: 0.5 }, {});
    });

    expect(addAnnotation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'bolt', color: '#EC4899' }));
    expect(addAnnotation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'rappel', color: '#FACC15' }));
  });

  it('applies stamp size changes to all stamps and not lines or text', async () => {
    const projectWithAnnotations: TopoProject = {
      ...project,
      annotations: [
        {
          id: 'bolt-1',
          topoId: 'project-1',
          kind: 'bolt',
          color: '#FACC15',
          point: { x: 0.2, y: 0.3 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'rappel-1',
          topoId: 'project-1',
          kind: 'rappel',
          color: '#2563EB',
          point: { x: 0.4, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'label-1',
          topoId: 'project-1',
          kind: 'label',
          color: '#111827',
          label: 'Pitch 1',
          labelFontSize: 24,
          point: { x: 0.6, y: 0.7 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'line-1',
          topoId: 'project-1',
          kind: 'climbLine',
          color: '#FACC15',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.8 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    loadTopoEditor.mockResolvedValue(bundleFromProject(projectWithAnnotations));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Bolt'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Large stamp size'));
    });

    await waitFor(() => {
      expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'bolt-1', stampSize: 'large' }));
      expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'rappel-1', stampSize: 'large' }));
    });
    expect(updateAnnotation).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'label-1', stampSize: 'large' }));
    expect(updateAnnotation).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'line-1', stampSize: 'large' }));
  });

  it('uses selected stamp size for new stamps', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Bolt'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Large stamp size'));
    });
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('bolt', { x: 0.2, y: 0.3 }, {});
    });

    expect(addAnnotation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'bolt', stampSize: 'large' }));
  });

  it('places route markers with auto-incremented labels', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Route marker'));
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('start', { x: 0.2, y: 0.3 }, {});
    });
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('start', { x: 0.4, y: 0.5 }, {});
    });

    expect(addAnnotation).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: 'start', label: '1' }));
    expect(addAnnotation).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'start', label: '2' }));
  });

  it('refills a freed route marker number after direct edit', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject({
      ...project,
      annotations: [startMarker('start-1', '1'), startMarker('start-2', '2'), startMarker('start-3', '3')],
    }));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    act(() => {
      latestCanvasProps().onSelectStamp('start-3');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Route marker number: value'), '7');
    });
    fireEvent.press(screen.getByLabelText('Route marker'));
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('start', { x: 0.6, y: 0.7 }, {});
    });

    expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'start-3', label: '7' }));
    expect(addAnnotation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'start', label: '3' }));
  });

  it('skips taken route marker numbers during auto-increment', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject({
      ...project,
      annotations: [startMarker('start-7', '7')],
    }));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Route marker'));
    fireEvent.changeText(screen.getByLabelText('Next route marker number: value'), '6');
    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('start', { x: 0.6, y: 0.7 }, {});
    });

    expect(addAnnotation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'start', label: '6' }));
    expect(screen.getByLabelText('Next route marker number: value').props.value).toBe('8');
  });

  it('allows the next route marker number to be blank from decrement and keyboard entry', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Route marker'));

    fireEvent.press(screen.getByLabelText('Next route marker number: decrement'));
    expect(screen.getByLabelText('Next route marker number: value').props.value).toBe('');

    fireEvent.changeText(screen.getByLabelText('Next route marker number: value'), '4');
    expect(screen.getByLabelText('Next route marker number: value').props.value).toBe('4');

    fireEvent.changeText(screen.getByLabelText('Next route marker number: value'), '');
    expect(screen.getByLabelText('Next route marker number: value').props.value).toBe('');

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('start', { x: 0.6, y: 0.7 }, {});
    });

    expect(addAnnotation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'start', label: undefined }));
  });

  it('moves bottom controls above the keyboard while editing the route marker number', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Route marker'));
    fireEvent(screen.getByLabelText('Next route marker number: value'), 'focus');
    emitKeyboardEvent('keyboardDidShow', 320, 9999);

    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).bottom).toBe(320);
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).display).toBeUndefined();
    expect(screen.getByLabelText('Next route marker number')).toBeTruthy();
    expect(screen.queryByLabelText('Route marker')).toBeNull();

    fireEvent(screen.getByLabelText('Next route marker number: value'), 'blur');
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).bottom).toBe(0);
    expect(screen.getByLabelText('Route marker')).toBeTruthy();
  });

  it('allows duplicate and blank direct route marker number edits', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject({
      ...project,
      annotations: [startMarker('start-3', '3'), startMarker('start-7', '7')],
    }));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    act(() => {
      latestCanvasProps().onSelectStamp('start-3');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Route marker number: value'), '7');
    });
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Route marker number: value'), '');
    });

    expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'start-3', label: '7' }));
    expect(updateAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'start-3', label: undefined }));
  });

  it('shows route marker number control only for route marker tool or selected route markers', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject({
      ...project,
      annotations: [startMarker('start-1', '1'), projectWithAnnotations().annotations[0]],
    }));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    expect(screen.queryByLabelText('Next route marker number')).toBeNull();

    fireEvent.press(screen.getByLabelText('Bolt'));
    expect(screen.queryByLabelText('Next route marker number')).toBeNull();

    fireEvent.press(screen.getByLabelText('Route marker'));
    expect(screen.getByLabelText('Next route marker number')).toBeTruthy();

    act(() => {
      latestCanvasProps().onSelectStamp('start-1');
    });
    expect(screen.getByLabelText('Route marker number')).toBeTruthy();

    act(() => {
      latestCanvasProps().onSelectLabel('label-1');
    });
    expect(screen.queryByLabelText('Route marker number')).toBeNull();
  });

  it('shows contextual delete only while an annotation is selected', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject(projectWithAnnotations()));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    expect(latestTopBarProps().canDelete).toBe(false);
    expect(screen.queryByLabelText('Delete selected annotation')).toBeNull();

    act(() => {
      latestCanvasProps().onSelectLabel('label-1');
    });

    expect(latestTopBarProps().canDelete).toBe(true);
    expect(screen.getByLabelText('Delete selected annotation')).toBeTruthy();

    act(() => {
      latestCanvasProps().onSelectLabel(undefined);
    });

    expect(latestTopBarProps().canDelete).toBe(false);
    expect(screen.queryByLabelText('Delete selected annotation')).toBeNull();
  });

  it.each([
    ['label', () => latestCanvasProps().onSelectLabel('label-1'), 'label-1'],
    ['stamp', () => latestCanvasProps().onSelectStamp('bolt-1'), 'bolt-1'],
    [
      'route line',
      () =>
        latestCanvasProps().onSelectPath('path-1', [
          { x: 0.1, y: 0.1 },
          { x: 0.8, y: 0.8 },
        ]),
      'path-1',
    ],
  ])('deletes the selected %s and clears the delete control', async (_target, selectTarget, targetId) => {
    loadTopoEditor.mockResolvedValue(bundleFromProject(projectWithAnnotations()));

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    act(() => {
      selectTarget();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete selected annotation'));
    });

    await waitFor(() =>
      expect(removeAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: targetId })),
    );
    expect(updateAnnotation).not.toHaveBeenCalledWith(expect.objectContaining({ id: targetId }));
    expect(latestTopBarProps().canDelete).toBe(false);
  });

  it('resizes the canvas region and keeps text colour controls above the keyboard while editing text', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.2, y: 0.8 }, { labelFontSize: 24 });
    });

    emitKeyboardEvent('keyboardDidShow', 320, 9999);

    expect(StyleSheet.flatten(screen.getByTestId('editor-canvas-region').props.style).marginBottom).toBeGreaterThan(0);
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).bottom).toBe(320);
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).display).toBeUndefined();
    expect(screen.getByLabelText('Text colour: Ink')).toBeTruthy();
    expect(screen.queryByLabelText('Route marker')).toBeNull();

    emitKeyboardEvent('keyboardDidHide', 0, 800);

    expect(StyleSheet.flatten(screen.getByTestId('editor-canvas-region').props.style).marginBottom).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).bottom).toBe(0);
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).display).toBeUndefined();
  });

  it('supports undo and redo when placing annotations', async () => {
    let currentAnnotations: Annotation[] = [];
    loadTopoEditor.mockImplementation(async () => ({
      ...bundleFromProject(project),
      annotations: currentAnnotations,
    }));
    addAnnotation.mockImplementation(async (input: { color?: string; kind: string; point: NormalizedPoint }) => {
      const created: Annotation = {
        id: 'bolt-1',
        topoId: 'project-1',
        kind: input.kind as 'bolt',
        color: input.color ?? '#FACC15',
        point: input.point,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      currentAnnotations = [created];
      return created;
    });
    replaceAnnotations.mockImplementation(async (_topoId: string, annotations: Annotation[]) => {
      currentAnnotations = annotations;
    });

    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    expect(screen.queryByLabelText('Undo')).toBeNull();
    expect(screen.queryByLabelText('Redo')).toBeNull();

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('bolt', { x: 0.5, y: 0.5 }, {});
    });

    expect(screen.getByLabelText('Undo')).toBeTruthy();
    expect(screen.queryByLabelText('Redo')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Undo'));
    });

    expect(replaceAnnotations).toHaveBeenCalledWith('project-1', []);
    expect(screen.queryByLabelText('Undo')).toBeNull();
    expect(screen.getByLabelText('Redo')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Redo'));
    });

    expect(replaceAnnotations).toHaveBeenCalledWith(
      'project-1',
      expect.arrayContaining([expect.objectContaining({ kind: 'bolt' })]),
    );
    expect(screen.getByLabelText('Undo')).toBeTruthy();
    expect(screen.queryByLabelText('Redo')).toBeNull();
  });

  it('supports undo when deleting an annotation', async () => {
    loadTopoEditor.mockResolvedValue(bundleFromProject(projectWithAnnotations()));
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      latestCanvasProps().onSelectStamp('bolt-1');
    });

    expect(screen.getByLabelText('Delete selected annotation')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Delete selected annotation'));
    });

    expect(removeAnnotation).toHaveBeenCalledWith(expect.objectContaining({ id: 'bolt-1' }));
    expect(screen.getByLabelText('Undo')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Undo'));
    });

    expect(replaceAnnotations).toHaveBeenCalledWith(
      'project-1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'label-1' }),
        expect.objectContaining({ id: 'bolt-1' }),
        expect.objectContaining({ id: 'path-1' }),
      ]),
    );
  });
});
