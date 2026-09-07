import { Skia } from '@shopify/react-native-skia';

import type { Route } from '@/domain/types';

import type { ExportSkiaTypefaces } from './exportFonts';
import type { TopoRenderItem } from './scene';

export const MIN_WIDTH_FOR_2_COLUMNS = 900;

export type RouteFooterLayoutInput = {
  routes: Route[];
  startY: number;
  width: number;
  typefaces?: ExportSkiaTypefaces | null;
};

export type RouteFooterLayoutResult = {
  columns: number;
  height: number;
  items: TopoRenderItem[];
};

export function buildRouteFooterRenderScene({
  routes,
  startY,
  width,
  typefaces,
}: RouteFooterLayoutInput): RouteFooterLayoutResult {
  const sortedRoutes = [...routes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (sortedRoutes.length === 0) {
    return { columns: 1, height: 0, items: [] };
  }

  // Never more than 2 columns; use 2 columns only if width >= 900 and there are >= 2 routes
  const columns = width >= MIN_WIDTH_FOR_2_COLUMNS && sortedRoutes.length >= 2 ? 2 : 1;

  const scale = Math.max(0.75, Math.min(width / 900, 2.5));
  const fontSize = Math.round(14 * scale);
  const gradeFontSize = Math.round(13 * scale);
  const badgeFontSize = Math.round(11 * scale);
  const badgeRadius = Math.round(11 * scale);
  const rowHeight = Math.round(34 * scale);
  const paddingY = Math.round(20 * scale);
  const paddingX = Math.round(24 * scale);
  const columnGap = Math.round(32 * scale);

  const rowCount = Math.ceil(sortedRoutes.length / columns);
  const footerHeight = paddingY * 2 + rowCount * rowHeight;

  const font400 = typefaces?.['400'] ? Skia.Font(typefaces['400'], gradeFontSize) : undefined;
  const font700 = typefaces?.['700'] ? Skia.Font(typefaces['700'], fontSize) : undefined;

  const items: TopoRenderItem[] = [
    {
      color: '#FFFFFF',
      height: footerHeight,
      id: 'footer-background',
      kind: 'roundedRect',
      r: 0,
      width,
      x: 0,
      y: startY,
    },
    {
      color: '#E5E7EB',
      id: 'footer-top-divider',
      kind: 'line',
      p1: { x: 0, y: startY },
      p2: { x: width, y: startY },
      strokeWidth: Math.max(1, Math.round(1.5 * scale)),
    },
  ];

  const colWidth = (width - paddingX * 2 - (columns - 1) * columnGap) / columns;

  for (let i = 0; i < sortedRoutes.length; i++) {
    const route = sortedRoutes[i];
    const colIndex = columns === 2 ? (i < rowCount ? 0 : 1) : 0;
    const rowIndex = columns === 2 ? (i < rowCount ? i : i - rowCount) : i;

    const colLeft = paddingX + colIndex * (colWidth + columnGap);
    const colRight = colLeft + colWidth;

    const rowCenterY = startY + paddingY + rowIndex * rowHeight + rowHeight / 2;
    const badgeCx = colLeft + badgeRadius;
    const badgeCy = rowCenterY;

    // Number badge circle (white fill with neutral border and black number)
    items.push({
      color: '#FFFFFF',
      cx: badgeCx,
      cy: badgeCy,
      id: `footer-route-${route.id}-badge-fill`,
      kind: 'circle',
      r: badgeRadius,
    });

    items.push({
      color: '#D1D5DB',
      cx: badgeCx,
      cy: badgeCy,
      id: `footer-route-${route.id}-badge-stroke`,
      kind: 'circle',
      r: badgeRadius,
      strokeWidth: Math.max(1, Math.round(1.5 * scale)),
      style: 'stroke',
    });

    // Badge number text (black number)
    items.push({
      color: '#111827',
      fontSize: badgeFontSize,
      fontWeight: '700',
      id: `footer-route-${route.id}-badge-num`,
      kind: 'text',
      text: String(i + 1),
      textAnchor: 'middle',
      x: badgeCx,
      y: badgeCy + Math.round(badgeFontSize * 0.35),
    });

    // Grade (if available)
    const gradeStr = route.grade?.trim();
    let gradeWidth = 0;
    if (gradeStr) {
      gradeWidth = font400?.getTextWidth
        ? font400.getTextWidth(gradeStr)
        : gradeStr.length * gradeFontSize * 0.6;
      const gradeX = colRight - gradeWidth;
      const gradeY = rowCenterY + Math.round(gradeFontSize * 0.35);

      items.push({
        color: '#6B7280',
        fontSize: gradeFontSize,
        fontWeight: '400',
        id: `footer-route-${route.id}-grade`,
        kind: 'text',
        text: gradeStr,
        x: gradeX,
        y: gradeY,
      });
    }

    // Route Name
    const nameLeft = badgeCx + badgeRadius + Math.round(10 * scale);
    const nameMaxRight = gradeStr ? colRight - gradeWidth - Math.round(14 * scale) : colRight;
    const maxNameWidth = Math.max(0, nameMaxRight - nameLeft);

    let displayName = route.name.trim() || `Route ${i + 1}`;
    if (font700?.getTextWidth && maxNameWidth > 0) {
      if (font700.getTextWidth(displayName) > maxNameWidth) {
        while (displayName.length > 2 && font700.getTextWidth(`${displayName}…`) > maxNameWidth) {
          displayName = displayName.slice(0, -1);
        }
        displayName = `${displayName}…`;
      }
    }

    items.push({
      color: '#111827',
      fontSize,
      fontWeight: '700',
      id: `footer-route-${route.id}-name`,
      kind: 'text',
      text: displayName,
      x: nameLeft,
      y: rowCenterY + Math.round(fontSize * 0.35),
    });
  }

  return {
    columns,
    height: footerHeight,
    items,
  };
}
