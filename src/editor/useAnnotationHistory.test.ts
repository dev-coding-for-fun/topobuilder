import { act, renderHook } from '@testing-library/react-native';

import type { Annotation } from '@/domain/types';
import { cloneAnnotations, useAnnotationHistory } from './useAnnotationHistory';

function createMockAnnotation(id: string, label?: string): Annotation {
  return {
    id,
    topoId: 'topo-1',
    kind: 'label',
    color: '#FF0000',
    point: { x: 0.1, y: 0.2 },
    label: label ?? `Label ${id}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('useAnnotationHistory', () => {
  it('initializes with empty history and disabled undo/redo', () => {
    const { result } = renderHook(() => useAnnotationHistory('topo-1'));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyDepth).toBe(0);
    expect(result.current.futureDepth).toBe(0);
  });

  it('records a snapshot and enables undo', () => {
    const { result } = renderHook(() => useAnnotationHistory('topo-1'));
    const initialAnnotations: Annotation[] = [];

    act(() => {
      result.current.recordSnapshot(initialAnnotations);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyDepth).toBe(1);
  });

  it('undo returns previous snapshot and enables redo', () => {
    const { result } = renderHook(() => useAnnotationHistory('topo-1'));
    const state0: Annotation[] = [];
    const state1: Annotation[] = [createMockAnnotation('1')];

    act(() => {
      result.current.recordSnapshot(state0);
    });

    let restored: Annotation[] | undefined;
    act(() => {
      restored = result.current.undo(state1);
    });

    expect(restored).toEqual(state0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.futureDepth).toBe(1);
  });

  it('redo restores future snapshot and enables undo again', () => {
    const { result } = renderHook(() => useAnnotationHistory('topo-1'));
    const state0: Annotation[] = [];
    const state1: Annotation[] = [createMockAnnotation('1')];

    act(() => {
      result.current.recordSnapshot(state0);
    });

    act(() => {
      result.current.undo(state1);
    });

    let redone: Annotation[] | undefined;
    act(() => {
      redone = result.current.redo(state0);
    });

    expect(redone).toEqual(state1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('recording a new snapshot after undo clears future (redo stack)', () => {
    const { result } = renderHook(() => useAnnotationHistory('topo-1'));
    const state0: Annotation[] = [];
    const state1: Annotation[] = [createMockAnnotation('1')];
    const state2Alternative: Annotation[] = [createMockAnnotation('2')];

    act(() => {
      result.current.recordSnapshot(state0);
    });
    act(() => {
      result.current.undo(state1);
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.recordSnapshot(state0);
    });

    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('caps history at maxHistory', () => {
    const maxHistory = 3;
    const { result } = renderHook(() => useAnnotationHistory('topo-1', maxHistory));

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.recordSnapshot([createMockAnnotation(`${i}`)]);
      });
    }

    expect(result.current.historyDepth).toBe(maxHistory);
  });

  it('clears history when topoId changes', () => {
    let topoId = 'topo-1';
    const { result, rerender } = renderHook(() => useAnnotationHistory(topoId));

    act(() => {
      result.current.recordSnapshot([createMockAnnotation('1')]);
    });
    expect(result.current.canUndo).toBe(true);

    topoId = 'topo-2';
    rerender({});

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyDepth).toBe(0);
  });

  it('deep clones annotations so in-place mutations do not corrupt history', () => {
    const original = [createMockAnnotation('1', 'Original')];
    const cloned = cloneAnnotations(original);

    original[0].label = 'Mutated';
    expect(cloned[0].label).toBe('Original');
  });
});
