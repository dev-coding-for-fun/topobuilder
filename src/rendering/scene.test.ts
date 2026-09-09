import type { Annotation } from '@/domain/types';

import type { TopoRenderItem } from './scene';
import { annotationsInRenderOrder, buildTopoRenderScene, smoothedRenderPath } from './scene';

const base = {
  topoId: 'topo-1',
  color: '#2563EB',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('buildTopoRenderScene', () => {
  it('renders paths before stamps before labels and excludes drafts', () => {
    const annotations: Annotation[] = [
      {
        ...base,
        id: 'label-1',
        kind: 'label',
        label: 'Pitch 1',
        point: { x: 0.2, y: 0.3 },
      },
      {
        ...base,
        id: 'draft',
        kind: 'climbLine',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      {
        ...base,
        id: 'bolt-1',
        kind: 'bolt',
        point: { x: 0.5, y: 0.5 },
        stampSize: 'large',
      },
      {
        ...base,
        id: 'line-1',
        kind: 'climbLine',
        lineWeight: 'large',
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.8, y: 0.9 },
        ],
      },
    ];

    expect(annotationsInRenderOrder(annotations).map((annotation) => annotation.id)).toEqual([
      'line-1',
      'bolt-1',
      'label-1',
    ]);

    const scene = buildTopoRenderScene({ annotations, size: { width: 1000, height: 800 } });

    expect(scene[0]).toMatchObject({
      id: 'line-1',
      kind: 'path',
      strokeWidth: 7,
    });
    expect(scene.some((item) => item.id === 'draft')).toBe(false);
    expect(scene.find((item) => item.id === 'label-1:text:0')).toMatchObject({
      kind: 'text',
      text: 'Pitch 1',
    });
  });

  it('scales artifact stamps and line weights for PDF-quality raster output without inflating labels', () => {
    const scene = buildTopoRenderScene({
      annotations: [
        {
          ...base,
          id: 'start-1',
          kind: 'start',
          label: '12',
          point: { x: 0.2, y: 0.3 },
        },
        {
          ...base,
          id: 'label-1',
          kind: 'label',
          label: 'Pitch 1',
          labelFontSize: 80,
          point: { x: 0.3, y: 0.4 },
        },
        {
          ...base,
          id: 'line-1',
          kind: 'climbLine',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.8 },
          ],
        },
      ],
      size: { width: 4000, height: 3200 },
      sourcePhoto: { width: 4000, height: 3200 },
      target: 'artifact',
    });

    expect(scene.find((item) => item.id === 'line-1')).toMatchObject({
      kind: 'path',
      strokeWidth: 8,
    });
    expect(scene.find((item) => item.id === 'start-1:fill')).toMatchObject({
      kind: 'circle',
      r: 66.66666666666667,
    });
    expect(scene.find((item) => item.id === 'start-1:text')).toMatchObject({
      kind: 'text',
      fontSize: 71.11111111111111,
      text: '12',
    });
    expect(scene.find((item) => item.id === 'label-1:text:0')).toMatchObject({
      kind: 'text',
      fontSize: 80,
      text: 'Pitch 1',
    });
  });

  it('keeps artifact label backdrops proportional when downscaling high-resolution photos', () => {
    const sourcePhoto = { width: 4000, height: 3000 };
    const downscaledSize = { width: 2400, height: 1800 };
    const label: Annotation = {
      ...base,
      id: 'label-1',
      kind: 'label',
      label: 'Pitch 1',
      labelFontSize: 80,
      point: { x: 0.3, y: 0.4 },
    };
    const sourceScene = buildTopoRenderScene({
      annotations: [label],
      size: sourcePhoto,
      sourcePhoto,
      target: 'artifact',
    });
    const downscaledScene = buildTopoRenderScene({
      annotations: [label],
      size: downscaledSize,
      sourcePhoto,
      target: 'artifact',
    });
    const exportScale = downscaledSize.width / sourcePhoto.width;

    const sourceText = expectRenderItem(sourceScene, 'label-1:text:0', 'text');
    const downscaledText = expectRenderItem(downscaledScene, 'label-1:text:0', 'text');
    const sourceBackdrop = expectRenderItem(sourceScene, 'label-1:backdrop', 'roundedRect');
    const downscaledBackdrop = expectRenderItem(downscaledScene, 'label-1:backdrop', 'roundedRect');

    expect(downscaledText.text).toBe('Pitch 1');
    expect(downscaledText.fontSize).toBeCloseTo(sourceText.fontSize * exportScale);
    expect(downscaledBackdrop.height).toBeCloseTo(sourceBackdrop.height * exportScale);
    expect(downscaledBackdrop.width).toBeCloseTo(sourceBackdrop.width * exportScale);
    expect(downscaledBackdrop.x).toBeCloseTo(sourceBackdrop.x * exportScale);
    expect(downscaledBackdrop.y).toBeCloseTo(sourceBackdrop.y * exportScale);
  });

  it('creates smoothed path data from render points', () => {
    expect(
      smoothedRenderPath([
        { x: 0, y: 0 },
        { x: 50, y: 100 },
        { x: 100, y: 0 },
      ]),
    ).toBe('M 0 0 Q 50 100 75 50 L 100 0');
  });

  it('computes dash intervals based on lineStyle and lineWeight', () => {
    const scene = buildTopoRenderScene({
      annotations: [
        {
          ...base,
          id: 'solid-line',
          kind: 'climbLine',
          lineStyle: 'solid',
          lineWeight: 'medium',
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
        {
          ...base,
          id: 'dashed-line',
          kind: 'climbLine',
          lineStyle: 'dashed',
          lineWeight: 'medium', // strokeWidth = 5
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
        {
          ...base,
          id: 'dotted-line',
          kind: 'climbLine',
          lineStyle: 'dotted',
          lineWeight: 'medium', // strokeWidth = 5
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
        {
          ...base,
          id: 'walkoff-default',
          kind: 'walkoff',
          lineWeight: 'medium', // strokeWidth = 5 -> dotted
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
        {
          ...base,
          id: 'scramble-default',
          kind: 'scramble',
          lineWeight: 'medium', // strokeWidth = 5 -> dashed
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        },
      ],
      size: { width: 1000, height: 800 },
    });

    const solid = expectRenderItem(scene, 'solid-line', 'path');
    expect(solid.dash).toBeUndefined();

    const dashed = expectRenderItem(scene, 'dashed-line', 'path');
    expect(dashed.dash).toEqual([15, 8]); // [5 * 3, 5 * 1.6]

    const dotted = expectRenderItem(scene, 'dotted-line', 'path');
    expect(dotted.dash).toEqual([0.1, 11]); // [0.1, 5 * 2.2]

    const walkoffDefault = expectRenderItem(scene, 'walkoff-default', 'path');
    expect(walkoffDefault.dash).toEqual([0.1, 11]);

    const scrambleDefault = expectRenderItem(scene, 'scramble-default', 'path');
    expect(scrambleDefault.dash).toEqual([15, 8]);
  });
});

function expectRenderItem<TKind extends TopoRenderItem['kind']>(
  scene: TopoRenderItem[],
  id: string,
  kind: TKind,
) {
  const item = scene.find((candidate) => candidate.id === id);
  expect(item).toMatchObject({ id, kind });
  if (!item || item.kind !== kind) {
    throw new Error(`Expected ${id} to be a ${kind} render item`);
  }
  return item as Extract<TopoRenderItem, { kind: TKind }>;
}
