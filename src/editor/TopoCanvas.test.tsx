import { act, render } from '@testing-library/react-native';

import type { Annotation, PhotoAsset } from '@/domain/types';

import { TopoCanvas } from './TopoCanvas';

let mockTapEnd: ((event: { x: number; y: number }) => void) | undefined;

type MockGestureChain = {
  maxDeltaX: jest.Mock<MockGestureChain>;
  maxDeltaY: jest.Mock<MockGestureChain>;
  maxPointers: jest.Mock<MockGestureChain>;
  minDistance: jest.Mock<MockGestureChain>;
  minPointers: jest.Mock<MockGestureChain>;
  onCancel: jest.Mock<MockGestureChain>;
  onChange: jest.Mock<MockGestureChain>;
  onEnd: jest.Mock<MockGestureChain>;
  onStart: jest.Mock<MockGestureChain>;
  onTouchesCancelled: jest.Mock<MockGestureChain>;
  onTouchesDown: jest.Mock<MockGestureChain>;
  onTouchesUp: jest.Mock<MockGestureChain>;
};

function mockGestureChain(captureTap = false): MockGestureChain {
  const chain: MockGestureChain = {
    maxDeltaX: jest.fn(() => chain),
    maxDeltaY: jest.fn(() => chain),
    maxPointers: jest.fn(() => chain),
    minDistance: jest.fn(() => chain),
    minPointers: jest.fn(() => chain),
    onCancel: jest.fn(() => chain),
    onChange: jest.fn(() => chain),
    onEnd: jest.fn((callback: (event: { x: number; y: number }) => void) => {
      if (captureTap) {
        mockTapEnd = callback;
      }
      return chain;
    }),
    onStart: jest.fn(() => chain),
    onTouchesCancelled: jest.fn(() => chain),
    onTouchesDown: jest.fn(() => chain),
    onTouchesUp: jest.fn(() => chain),
  };
  return chain;
}

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => mockGestureChain()),
    Pinch: jest.fn(() => mockGestureChain()),
    Race: jest.fn(() => mockGestureChain()),
    Simultaneous: jest.fn(() => mockGestureChain()),
    Tap: jest.fn(() => mockGestureChain(true)),
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

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
  annotations,
  onSelectLabel = jest.fn(),
  onSelectPath = jest.fn(),
}: {
  annotations: Annotation[];
  onSelectLabel?: jest.Mock;
  onSelectPath?: jest.Mock;
}) {
  mockTapEnd = undefined;
  render(
    <TopoCanvas
      activeTool="select"
      annotations={annotations}
      onBeginPathDraft={jest.fn()}
      onChangeSelectedLabelText={jest.fn()}
      onCommitSelectedLabelEdit={jest.fn()}
      onCommitSelectedPathEdit={jest.fn()}
      onExtendPathDraft={jest.fn()}
      onFinishPathDraft={jest.fn()}
      onMoveSelectedLabel={jest.fn()}
      onMoveSelectedPathPoint={jest.fn()}
      onPlaceAnnotation={jest.fn()}
      onResizeSelectedLabel={jest.fn()}
      onSelectLabel={onSelectLabel}
      onSelectPath={onSelectPath}
      photo={photo}
    />,
  );

  return { onSelectLabel, onSelectPath };
}

describe('TopoCanvas selection callbacks', () => {
  it('selects a label without clearing it through path selection', () => {
    const label: Annotation = {
      id: 'label-1',
      topoId: 'topo-1',
      photoId: 'photo-1',
      kind: 'label',
      color: '#111827',
      label: 'Pitch 1',
      labelFontSize: 24,
      point: { x: 0.5, y: 0.5 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { onSelectLabel, onSelectPath } = renderCanvas({ annotations: [label] });

    act(() => {
      mockTapEnd?.({ x: 0.5, y: 0.5 });
    });

    expect(onSelectLabel).toHaveBeenCalledWith('label-1');
    expect(onSelectPath).not.toHaveBeenCalledWith(undefined);
  });

  it('selects a path without clearing label selection in the same tap', () => {
    const path: Annotation = {
      id: 'path-1',
      topoId: 'topo-1',
      photoId: 'photo-1',
      kind: 'climbLine',
      color: '#C6F24F',
      points: [
        { x: 0.25, y: 0.5 },
        { x: 0.75, y: 0.5 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const { onSelectLabel, onSelectPath } = renderCanvas({ annotations: [path] });

    act(() => {
      mockTapEnd?.({ x: 0.5, y: 0.5 });
    });

    expect(onSelectPath).toHaveBeenCalledWith('path-1', path.points);
    expect(onSelectLabel).not.toHaveBeenCalledWith(undefined);
  });
});
