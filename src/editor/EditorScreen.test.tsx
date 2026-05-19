import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';

import type { NormalizedPoint, TopoProject } from '@/domain/types';
import { EditorTopBar } from '@/editor/EditorTopBar';
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
  EditorTopBar: jest.fn(({ canDelete, onDelete }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return canDelete
      ? React.createElement(
          Pressable,
          { accessibilityLabel: 'Delete selected annotation', onPress: onDelete },
          React.createElement(Text, null, 'Delete'),
        )
      : null;
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

function projectWithAnnotations(): TopoProject {
  return {
    ...project,
    annotations: [
      {
        id: 'label-1',
        topoId: 'project-1',
        photoId: 'photo-1',
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
        photoId: 'photo-1',
        kind: 'bolt',
        color: '#FACC15',
        point: { x: 0.4, y: 0.5 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'path-1',
        topoId: 'project-1',
        photoId: 'photo-1',
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
    photoId: 'photo-1',
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
  const loadProject = jest.fn();
  const removeAnnotation = jest.fn();
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
    loadProject.mockResolvedValue(project);
    addAnnotation.mockImplementation(
      async (input: { color?: string; kind?: string; label?: string; labelFontSize?: number; point?: NormalizedPoint }) => ({
        id: input.kind === 'label' || !input.kind ? 'label-1' : `${input.kind}-1`,
        topoId: 'project-1',
        photoId: 'photo-1',
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
      async (input: { color?: string; kind: string; points: NormalizedPoint[] }) => ({
        id: 'path-1',
        topoId: 'project-1',
        photoId: 'photo-1',
        kind: input.kind,
        color: input.color ?? '#FACC15',
        points: input.points,
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
          photoId: 'photo-1',
          kind: 'bolt',
          color: '#FACC15',
          point: { x: 0.2, y: 0.3 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'rappel-1',
          topoId: 'project-1',
          photoId: 'photo-1',
          kind: 'rappel',
          color: '#2563EB',
          point: { x: 0.4, y: 0.5 },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'label-1',
          topoId: 'project-1',
          photoId: 'photo-1',
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
          photoId: 'photo-1',
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
    loadProject.mockResolvedValue(projectWithAnnotations);

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
    loadProject.mockResolvedValue({
      ...project,
      annotations: [startMarker('start-1', '1'), startMarker('start-2', '2'), startMarker('start-3', '3')],
    });

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
    loadProject.mockResolvedValue({
      ...project,
      annotations: [startMarker('start-7', '7')],
    });

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
    loadProject.mockResolvedValue({
      ...project,
      annotations: [startMarker('start-3', '3'), startMarker('start-7', '7')],
    });

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
    loadProject.mockResolvedValue({
      ...project,
      annotations: [startMarker('start-1', '1'), projectWithAnnotations().annotations[0]],
    });

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
    loadProject.mockResolvedValue(projectWithAnnotations());

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
    loadProject.mockResolvedValue(projectWithAnnotations());

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

  it('resizes the canvas region and hides bottom controls while editing text with the keyboard open', async () => {
    render(<EditorScreen />);
    await waitFor(() => expect(TopoCanvas).toHaveBeenCalled());

    await act(async () => {
      await latestCanvasProps().onPlaceAnnotation('label', { x: 0.2, y: 0.8 }, { labelFontSize: 24 });
    });

    emitKeyboardEvent('keyboardDidShow', 320, 480);

    expect(StyleSheet.flatten(screen.getByTestId('editor-canvas-region').props.style).marginBottom).toBeGreaterThan(0);
    expect(
      StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay', { includeHiddenElements: true }).props.style)
        .display,
    ).toBe('none');

    emitKeyboardEvent('keyboardDidHide', 0, 800);

    expect(StyleSheet.flatten(screen.getByTestId('editor-canvas-region').props.style).marginBottom).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('editor-bottom-overlay').props.style).display).toBeUndefined();
  });
});
