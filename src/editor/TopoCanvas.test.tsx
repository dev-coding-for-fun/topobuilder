import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';

import type { Annotation, PhotoAsset } from '@/domain/types';

import { annotationsInCanvasStackOrder, TopoCanvas } from './TopoCanvas';

let mockTapEnd: ((event: { x: number; y: number }) => void) | undefined;
let mockLongPressStart: ((event: { x: number; y: number }) => void) | undefined;
let mockGestureDetectorMounts = 0;
let mockGestureDetectorUnmounts = 0;
let mockPanChains: MockGestureChain[] = [];

type MockGestureChain = {
  maxDeltaX: jest.Mock<MockGestureChain>;
  maxDeltaY: jest.Mock<MockGestureChain>;
  maxDistance: jest.Mock<MockGestureChain>;
  maxPointers: jest.Mock<MockGestureChain>;
  minDistance: jest.Mock<MockGestureChain>;
  minDuration: jest.Mock<MockGestureChain>;
  minPointers: jest.Mock<MockGestureChain>;
  onCancel: jest.Mock<MockGestureChain>;
  onChange: jest.Mock<MockGestureChain>;
  onEnd: jest.Mock<MockGestureChain>;
  onStart: jest.Mock<MockGestureChain>;
  onTouchesCancelled: jest.Mock<MockGestureChain>;
  onTouchesDown: jest.Mock<MockGestureChain>;
  onTouchesUp: jest.Mock<MockGestureChain>;
  triggerChange: (event: { x: number; y: number; translationX: number; translationY: number }) => void;
  triggerEnd: () => void;
  triggerStart: (event: { x: number; y: number }) => void;
};

function mockGestureChain(captureTap = false, captureLongPress = false): MockGestureChain {
  let changeCallback: ((event: { x: number; y: number; translationX: number; translationY: number }) => void) | undefined;
  let endCallback: ((event: { x: number; y: number }) => void) | undefined;
  let startCallback: ((event: { x: number; y: number }) => void) | undefined;
  const chain: MockGestureChain = {
    maxDeltaX: jest.fn(() => chain),
    maxDeltaY: jest.fn(() => chain),
    maxDistance: jest.fn(() => chain),
    maxPointers: jest.fn(() => chain),
    minDistance: jest.fn(() => chain),
    minDuration: jest.fn(() => chain),
    minPointers: jest.fn(() => chain),
    onCancel: jest.fn(() => chain),
    onChange: jest.fn((callback) => {
      changeCallback = callback;
      return chain;
    }),
    onEnd: jest.fn((callback: (event: { x: number; y: number }) => void) => {
      if (captureTap) {
        mockTapEnd = callback;
      }
      endCallback = callback;
      return chain;
    }),
    onStart: jest.fn((callback) => {
      if (captureLongPress) {
        mockLongPressStart = callback;
      }
      startCallback = callback;
      return chain;
    }),
    onTouchesCancelled: jest.fn(() => chain),
    onTouchesDown: jest.fn(() => chain),
    onTouchesUp: jest.fn(() => chain),
    triggerChange: (event) => changeCallback?.(event),
    triggerEnd: () => endCallback?.({ x: 0, y: 0 }),
    triggerStart: (event) => startCallback?.(event),
  };
  return chain;
}

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    Gesture: {
      LongPress: jest.fn(() => mockGestureChain(false, true)),
      Pan: jest.fn(() => {
        const chain = mockGestureChain();
        mockPanChains.push(chain);
        return chain;
      }),
      Pinch: jest.fn(() => mockGestureChain()),
      Race: jest.fn(() => mockGestureChain()),
      Simultaneous: jest.fn(() => mockGestureChain()),
      Tap: jest.fn(() => mockGestureChain(true)),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => {
      React.useEffect(() => {
        mockGestureDetectorMounts += 1;
        return () => {
          mockGestureDetectorUnmounts += 1;
        };
      }, []);
      return children;
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  useDerivedValue: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => {
    const React = require('react');
    return React.useRef({ value }).current;
  },
}));

const photo: PhotoAsset = {
  id: 'photo-1',
  topoId: 'topo-1',
  uri: 'file://photo.jpg',
  width: 1000,
  height: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderCanvas({
  activeTool = 'select',
  annotations,
  onSelectLabel = jest.fn(),
  onSelectPath = jest.fn(),
  onSelectStamp = jest.fn(),
  onCommitSelectedPathEdit = jest.fn(),
  onInsertSelectedPathPoint = jest.fn(),
  onLongPressSelectedPathPoint = jest.fn(),
  onMoveSelectedPathPoint = jest.fn(),
  onCommitSelectedStampEdit = jest.fn(),
  onMoveSelectedStamp = jest.fn(),
  selectedPathId,
  selectedStampId,
}: {
  activeTool?: React.ComponentProps<typeof TopoCanvas>['activeTool'];
  annotations: Annotation[];
  onCommitSelectedStampEdit?: jest.Mock;
  onCommitSelectedPathEdit?: jest.Mock;
  onInsertSelectedPathPoint?: jest.Mock;
  onLongPressSelectedPathPoint?: jest.Mock;
  onMoveSelectedPathPoint?: jest.Mock;
  onMoveSelectedStamp?: jest.Mock;
  onSelectLabel?: jest.Mock;
  onSelectPath?: jest.Mock;
  onSelectStamp?: jest.Mock;
  selectedPathId?: string;
  selectedStampId?: string;
}) {
  mockTapEnd = undefined;
  mockLongPressStart = undefined;
  mockPanChains = [];
  const result = render(
    <TopoCanvas
      activeTool={activeTool}
      annotations={annotations}
      onBeginPathDraft={jest.fn()}
      onChangeSelectedLabelText={jest.fn()}
      onCommitSelectedLabelEdit={jest.fn()}
      onCommitSelectedPathEdit={onCommitSelectedPathEdit}
      onCommitSelectedStampEdit={onCommitSelectedStampEdit}
      onExtendPathDraft={jest.fn()}
      onFinishPathDraft={jest.fn()}
      onInsertSelectedPathPoint={onInsertSelectedPathPoint}
      onLongPressSelectedPathPoint={onLongPressSelectedPathPoint}
      onMoveSelectedLabel={jest.fn()}
      onMoveSelectedPathPoint={onMoveSelectedPathPoint}
      onMoveSelectedStamp={onMoveSelectedStamp}
      onPlaceAnnotation={jest.fn()}
      onResizeSelectedLabel={jest.fn()}
      onSelectLabel={onSelectLabel}
      onSelectPath={onSelectPath}
      onSelectStamp={onSelectStamp}
      photo={photo}
      selectedPathId={selectedPathId}
      selectedStampId={selectedStampId}
    />,
  );

  return {
    ...result,
    onCommitSelectedPathEdit,
    onCommitSelectedStampEdit,
    onInsertSelectedPathPoint,
    onLongPressSelectedPathPoint,
    onMoveSelectedPathPoint,
    onMoveSelectedStamp,
    onSelectLabel,
    onSelectPath,
    onSelectStamp,
  };
}

function layoutCanvas(result: ReturnType<typeof renderCanvas>, width = 1000, height = 1000) {
  act(() => {
    result.UNSAFE_getAllByType(View)[0].props.onLayout({
      nativeEvent: { layout: { height, width } },
    });
  });
}

describe('TopoCanvas selection callbacks', () => {
  beforeEach(() => {
    mockGestureDetectorMounts = 0;
    mockGestureDetectorUnmounts = 0;
  });

  it('selects a label without clearing it through path selection', () => {
    const label: Annotation = {
      id: 'label-1',
      topoId: 'topo-1',
      kind: 'label',
      color: '#111827',
      label: 'Pitch 1',
      labelFontSize: 24,
      point: { x: 0.5, y: 0.5 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { onSelectLabel, onSelectPath, onSelectStamp } = renderCanvas({ annotations: [label] });

    act(() => {
      mockTapEnd?.({ x: 0.5, y: 0.5 });
    });

    expect(onSelectLabel).toHaveBeenCalledWith('label-1');
    expect(onSelectPath).not.toHaveBeenCalledWith(undefined);
    expect(onSelectStamp).not.toHaveBeenCalledWith(undefined);
  });

  it('selects a path without clearing label selection in the same tap', () => {
    const path: Annotation = {
      id: 'path-1',
      topoId: 'topo-1',
      kind: 'climbLine',
      color: '#C6F24F',
      points: [
        { x: 0.25, y: 0.5 },
        { x: 0.75, y: 0.5 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { onSelectLabel, onSelectPath, onSelectStamp } = renderCanvas({ annotations: [path] });

    act(() => {
      mockTapEnd?.({ x: 0.5, y: 0.5 });
    });

    expect(onSelectPath).toHaveBeenCalledWith('path-1', path.points);
    expect(onSelectLabel).not.toHaveBeenCalledWith(undefined);
    expect(onSelectStamp).not.toHaveBeenCalledWith(undefined);
  });

  it('selects a stamp without clearing it through other selection callbacks', () => {
    const stamp: Annotation = {
      id: 'bolt-1',
      topoId: 'topo-1',
      kind: 'bolt',
      color: '#FACC15',
      point: { x: 0.5, y: 0.5 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { onSelectLabel, onSelectPath, onSelectStamp } = renderCanvas({ annotations: [stamp] });

    act(() => {
      mockTapEnd?.({ x: 0.5, y: 0.5 });
    });

    expect(onSelectStamp).toHaveBeenCalledWith('bolt-1');
    expect(onSelectPath).not.toHaveBeenCalledWith(undefined);
    expect(onSelectLabel).not.toHaveBeenCalledWith(undefined);
  });

  it('moves a selected stamp when dragging from the stamp hit area', () => {
    const stamp: Annotation = {
      id: 'bolt-1',
      topoId: 'topo-1',
      kind: 'bolt',
      color: '#FACC15',
      point: { x: 0.5, y: 0.5 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { onCommitSelectedStampEdit, onMoveSelectedStamp } = renderCanvas({
      annotations: [stamp],
      selectedStampId: 'bolt-1',
    });
    const stampGesture = mockPanChains.at(-1);

    act(() => {
      stampGesture?.triggerStart({ x: 0.5, y: 0.5 });
      stampGesture?.triggerChange({ x: 0.6, y: 0.7, translationX: 0.1, translationY: 0.2 });
      stampGesture?.triggerEnd();
    });

    expect(onMoveSelectedStamp).toHaveBeenCalledWith({ x: 0.6, y: 0.7 });
    expect(onCommitSelectedStampEdit).toHaveBeenCalledTimes(1);
  });

  it('keeps panning when dragging away from a selected stamp', () => {
    const stamp: Annotation = {
      id: 'bolt-1',
      topoId: 'topo-1',
      kind: 'bolt',
      color: '#FACC15',
      point: { x: 0, y: 0 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const result = renderCanvas({
      annotations: [stamp],
      selectedStampId: 'bolt-1',
    });
    layoutCanvas(result);
    const { onCommitSelectedStampEdit, onMoveSelectedStamp } = result;
    const stampGesture = mockPanChains.at(-1);

    act(() => {
      stampGesture?.triggerStart({ x: 500, y: 500 });
      stampGesture?.triggerChange({ x: 510, y: 510, translationX: 10, translationY: 10 });
      stampGesture?.triggerEnd();
    });

    expect(onMoveSelectedStamp).not.toHaveBeenCalled();
    expect(onCommitSelectedStampEdit).not.toHaveBeenCalled();
  });

  it('keeps panning when dragging away from selected line control points', () => {
    const path: Annotation = {
      id: 'path-1',
      topoId: 'topo-1',
      kind: 'climbLine',
      color: '#C6F24F',
      points: [
        { x: 0, y: 0 },
        { x: 0.1, y: 0 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const result = renderCanvas({
      annotations: [path],
      selectedPathId: 'path-1',
    });
    layoutCanvas(result);
    const { onCommitSelectedPathEdit, onMoveSelectedPathPoint } = result;
    const controlPointGesture = mockPanChains.at(-1);

    act(() => {
      controlPointGesture?.triggerStart({ x: 500, y: 500 });
      controlPointGesture?.triggerChange({ x: 510, y: 510, translationX: 10, translationY: 10 });
      controlPointGesture?.triggerEnd();
    });

    expect(onMoveSelectedPathPoint).not.toHaveBeenCalled();
    expect(onCommitSelectedPathEdit).not.toHaveBeenCalled();
  });

  it('keeps the gesture detector mounted when switching line gesture modes', () => {
    const path: Annotation = {
      id: 'path-1',
      topoId: 'topo-1',
      kind: 'climbLine',
      color: '#C6F24F',
      points: [
        { x: 0.25, y: 0.5 },
        { x: 0.75, y: 0.5 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { rerender } = renderCanvas({ annotations: [path] });

    expect(mockGestureDetectorMounts).toBe(1);
    expect(mockGestureDetectorUnmounts).toBe(0);

    rerender(
      <TopoCanvas
        activeTool="climbLine"
        annotations={[path]}
        onBeginPathDraft={jest.fn()}
        onChangeSelectedLabelText={jest.fn()}
        onCommitSelectedLabelEdit={jest.fn()}
        onCommitSelectedPathEdit={jest.fn()}
        onCommitSelectedStampEdit={jest.fn()}
        onExtendPathDraft={jest.fn()}
        onFinishPathDraft={jest.fn()}
        onMoveSelectedLabel={jest.fn()}
        onMoveSelectedPathPoint={jest.fn()}
        onMoveSelectedStamp={jest.fn()}
        onPlaceAnnotation={jest.fn()}
        onResizeSelectedLabel={jest.fn()}
        onSelectLabel={jest.fn()}
        onSelectPath={jest.fn()}
        onSelectStamp={jest.fn()}
        photo={photo}
      />,
    );
    rerender(
      <TopoCanvas
        activeTool="select"
        annotations={[path]}
        onBeginPathDraft={jest.fn()}
        onChangeSelectedLabelText={jest.fn()}
        onCommitSelectedLabelEdit={jest.fn()}
        onCommitSelectedPathEdit={jest.fn()}
        onCommitSelectedStampEdit={jest.fn()}
        onExtendPathDraft={jest.fn()}
        onFinishPathDraft={jest.fn()}
        onMoveSelectedLabel={jest.fn()}
        onMoveSelectedPathPoint={jest.fn()}
        onMoveSelectedStamp={jest.fn()}
        onPlaceAnnotation={jest.fn()}
        onResizeSelectedLabel={jest.fn()}
        onSelectLabel={jest.fn()}
        onSelectPath={jest.fn()}
        onSelectStamp={jest.fn()}
        photo={photo}
        selectedPathId="path-1"
      />,
    );

    expect(mockGestureDetectorMounts).toBe(1);
    expect(mockGestureDetectorUnmounts).toBe(0);
  });
});

describe('annotationsInCanvasStackOrder', () => {
  it('draws lines below stamps and text regardless of placement order', () => {
    const annotations: Annotation[] = [
      {
        id: 'label-1',
        topoId: 'topo-1',
        kind: 'label',
        color: '#111827',
        label: 'Pitch 1',
        labelFontSize: 24,
        point: { x: 0.5, y: 0.5 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'bolt-1',
        topoId: 'topo-1',
        kind: 'bolt',
        color: '#FACC15',
        point: { x: 0.5, y: 0.5 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'path-1',
        topoId: 'topo-1',
        kind: 'climbLine',
        color: '#C6F24F',
        points: [
          { x: 0.25, y: 0.5 },
          { x: 0.75, y: 0.5 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(annotationsInCanvasStackOrder(annotations).map((annotation) => annotation.id)).toEqual([
      'path-1',
      'bolt-1',
      'label-1',
    ]);
  });

  it('omits the selected label from the Skia draw order', () => {
    const annotations: Annotation[] = [
      {
        id: 'path-1',
        topoId: 'topo-1',
        kind: 'climbLine',
        color: '#C6F24F',
        points: [
          { x: 0.25, y: 0.5 },
          { x: 0.75, y: 0.5 },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'label-1',
        topoId: 'topo-1',
        kind: 'label',
        color: '#111827',
        label: 'Pitch 1',
        labelFontSize: 24,
        point: { x: 0.5, y: 0.5 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(annotationsInCanvasStackOrder(annotations, 'label-1').map((annotation) => annotation.id)).toEqual([
      'path-1',
    ]);
  });
});

describe('TopoCanvas long press interactions', () => {
  const path: Annotation = {
    id: 'path-1',
    topoId: 'topo-1',
    kind: 'climbLine',
    color: '#C6F24F',
    points: [
      { x: 0.2, y: 0.5 },
      { x: 0.8, y: 0.5 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('inserts a new control point when long pressing on a selected line segment between control points', () => {
    const result = renderCanvas({
      annotations: [path],
      selectedPathId: 'path-1',
    });
    layoutCanvas(result);

    const { onInsertSelectedPathPoint, onLongPressSelectedPathPoint } = result;

    act(() => {
      mockLongPressStart?.({ x: 500, y: 500 });
    });

    expect(onInsertSelectedPathPoint).toHaveBeenCalledTimes(1);
    expect(onInsertSelectedPathPoint).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        x: expect.closeTo(0.5),
        y: expect.closeTo(0.5),
      }),
    );
    expect(onLongPressSelectedPathPoint).not.toHaveBeenCalled();
  });

  it('captures long press on an existing control point and does not insert a new point', () => {
    const result = renderCanvas({
      annotations: [path],
      selectedPathId: 'path-1',
    });
    layoutCanvas(result);

    const { onInsertSelectedPathPoint, onLongPressSelectedPathPoint } = result;

    act(() => {
      // Near control point 0 at (200, 500)
      mockLongPressStart?.({ x: 205, y: 500 });
    });

    expect(onLongPressSelectedPathPoint).toHaveBeenCalledWith(0);
    expect(onInsertSelectedPathPoint).not.toHaveBeenCalled();
  });

  it('does nothing on long press when no path is selected', () => {
    const result = renderCanvas({
      annotations: [path],
      selectedPathId: undefined,
    });
    layoutCanvas(result);

    const { onInsertSelectedPathPoint, onLongPressSelectedPathPoint } = result;

    act(() => {
      mockLongPressStart?.({ x: 500, y: 500 });
    });

    expect(onInsertSelectedPathPoint).not.toHaveBeenCalled();
    expect(onLongPressSelectedPathPoint).not.toHaveBeenCalled();
  });

  it('does not insert a control point when long pressing far from the line', () => {
    const result = renderCanvas({
      annotations: [path],
      selectedPathId: 'path-1',
    });
    layoutCanvas(result);

    const { onInsertSelectedPathPoint, onLongPressSelectedPathPoint } = result;

    act(() => {
      mockLongPressStart?.({ x: 500, y: 100 });
    });

    expect(onInsertSelectedPathPoint).not.toHaveBeenCalled();
    expect(onLongPressSelectedPathPoint).not.toHaveBeenCalled();
  });
});

