import type { Route } from '@/domain/types';

import { buildRouteFooterRenderScene, MIN_WIDTH_FOR_2_COLUMNS } from './routeFooter';

const mockRoutes: Route[] = [
  {
    color: '#DC2626',
    createdAt: '2026-01-01T00:00:00.000Z',
    grade: '5.10a',
    id: 'route-b',
    name: 'Beta Route',
    sortOrder: 2,
    topoId: 'topo-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    color: '#2563EB',
    createdAt: '2026-01-01T00:00:00.000Z',
    grade: '5.9',
    id: 'route-a',
    name: 'Alpha Route',
    sortOrder: 1,
    topoId: 'topo-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    color: '#16A34A',
    createdAt: '2026-01-01T00:00:00.000Z',
    id: 'route-c',
    name: 'Gamma Route',
    sortOrder: 3,
    topoId: 'topo-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('buildRouteFooterRenderScene', () => {
  it('returns empty result when routes array is empty', () => {
    const result = buildRouteFooterRenderScene({
      routes: [],
      startY: 500,
      width: 1000,
    });
    expect(result.height).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.columns).toBe(1);
  });

  it('uses 1 column when width is less than 900', () => {
    const result = buildRouteFooterRenderScene({
      routes: mockRoutes,
      startY: 500,
      width: 800,
    });
    expect(result.columns).toBe(1);
    expect(result.height).toBeGreaterThan(0);
  });

  it('uses 1 column when there is only 1 route regardless of width', () => {
    const result = buildRouteFooterRenderScene({
      routes: [mockRoutes[0]],
      startY: 500,
      width: 1800,
    });
    expect(result.columns).toBe(1);
  });

  it('uses 2 columns when width is at least 900 and there are >= 2 routes', () => {
    const result = buildRouteFooterRenderScene({
      routes: mockRoutes,
      startY: 500,
      width: MIN_WIDTH_FOR_2_COLUMNS,
    });
    expect(result.columns).toBe(2);
  });

  it('never exceeds 2 columns even for very wide canvas', () => {
    const manyRoutes: Route[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockRoutes[0],
      id: `route-${i}`,
      name: `Route ${i + 1}`,
      sortOrder: i,
    }));

    const result = buildRouteFooterRenderScene({
      routes: manyRoutes,
      startY: 1000,
      width: 3000,
    });
    expect(result.columns).toBe(2);
  });

  it('sorts routes by sortOrder and numbers them sequentially', () => {
    const result = buildRouteFooterRenderScene({
      routes: mockRoutes,
      startY: 600,
      width: 1200,
    });

    const numberItems = result.items.filter(
      (item) => item.kind === 'text' && item.id.includes('-badge-num'),
    );
    expect(numberItems).toHaveLength(3);

    // Alpha Route (sortOrder: 1) should be 1
    const alphaNum = result.items.find((item) => item.id === 'footer-route-route-a-badge-num');
    expect(alphaNum).toEqual(expect.objectContaining({ text: '1' }));

    // Beta Route (sortOrder: 2) should be 2
    const betaNum = result.items.find((item) => item.id === 'footer-route-route-b-badge-num');
    expect(betaNum).toEqual(expect.objectContaining({ text: '2' }));

    // Gamma Route (sortOrder: 3) should be 3
    const gammaNum = result.items.find((item) => item.id === 'footer-route-route-c-badge-num');
    expect(gammaNum).toEqual(expect.objectContaining({ text: '3' }));
  });

  it('renders badges with white fill, neutral border stroke, and black number', () => {
    const result = buildRouteFooterRenderScene({
      routes: mockRoutes,
      startY: 600,
      width: 1200,
    });

    const fill = result.items.find((item) => item.id === 'footer-route-route-a-badge-fill');
    expect(fill).toEqual(expect.objectContaining({ color: '#FFFFFF', kind: 'circle' }));

    const stroke = result.items.find((item) => item.id === 'footer-route-route-a-badge-stroke');
    expect(stroke).toEqual(expect.objectContaining({ color: '#D1D5DB', kind: 'circle', style: 'stroke' }));

    const num = result.items.find((item) => item.id === 'footer-route-route-a-badge-num');
    expect(num).toEqual(expect.objectContaining({ color: '#111827', kind: 'text', text: '1' }));
  });

  it('renders grade only when available', () => {
    const result = buildRouteFooterRenderScene({
      routes: mockRoutes,
      startY: 600,
      width: 1200,
    });

    const alphaGrade = result.items.find((item) => item.id === 'footer-route-route-a-grade');
    expect(alphaGrade).toEqual(expect.objectContaining({ text: '5.9' }));

    // Gamma has no grade
    const gammaGrade = result.items.find((item) => item.id === 'footer-route-route-c-grade');
    expect(gammaGrade).toBeUndefined();
  });

  it('includes background and top divider line at startY', () => {
    const result = buildRouteFooterRenderScene({
      routes: mockRoutes,
      startY: 750,
      width: 1000,
    });

    const bg = result.items.find((item) => item.id === 'footer-background');
    expect(bg).toEqual(
      expect.objectContaining({
        color: '#FFFFFF',
        height: result.height,
        kind: 'roundedRect',
        width: 1000,
        x: 0,
        y: 750,
      }),
    );

    const divider = result.items.find((item) => item.id === 'footer-top-divider');
    expect(divider).toEqual(
      expect.objectContaining({
        color: '#E5E7EB',
        kind: 'line',
        p1: { x: 0, y: 750 },
        p2: { x: 1000, y: 750 },
      }),
    );
  });
});
