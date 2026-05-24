import {
  Circle,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  RoundedRect,
  Skia,
  Text as SkiaText,
  useFont,
  type SkImage,
} from '@shopify/react-native-skia';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

import type { RenderTextFontWeight, TopoRenderItem } from './scene';
import { smoothedRenderPath } from './scene';

/**
 * Only the weights listed in `RenderTextFontWeight` are wired up here. If a
 * new weight is added to that union, TypeScript will require a matching entry
 * in this map – we deliberately avoid a silent fallback to regular.
 */
const SKIA_FONT_BY_WEIGHT = {
  '400': Inter_400Regular,
  '700': Inter_700Bold,
} satisfies Record<RenderTextFontWeight, Parameters<typeof useFont>[0]>;

export function SkiaTopoImage({
  image,
  size,
}: {
  image: SkImage | null;
  size: { width: number; height: number };
}) {
  if (!image) {
    return null;
  }

  return <SkiaImage fit="contain" image={image} width={size.width} height={size.height} x={0} y={0} />;
}

export function SkiaTopoScene({
  items,
  routeMarkerFont,
}: {
  items: TopoRenderItem[];
  routeMarkerFont?: ReturnType<typeof useFont>;
}) {
  return (
    <Group>
      {items.map((item) => (
        <SkiaRenderItem item={item} key={item.id} routeMarkerFont={routeMarkerFont} />
      ))}
    </Group>
  );
}

function SkiaRenderItem({
  item,
  routeMarkerFont,
}: {
  item: TopoRenderItem;
  routeMarkerFont?: ReturnType<typeof useFont>;
}) {
  if (item.kind === 'path') {
    const path = Skia.Path.MakeFromSVGString(smoothedRenderPath(item.points)) ?? Skia.Path.Make();
    return (
      <Path
        color={item.color}
        path={path}
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={item.strokeWidth}
        style="stroke"
      />
    );
  }

  if (item.kind === 'line') {
    return (
      <Line
        color={item.color}
        p1={item.p1}
        p2={item.p2}
        strokeCap="round"
        strokeWidth={item.strokeWidth}
      />
    );
  }

  if (item.kind === 'circle') {
    return (
      <Circle
        color={item.color}
        cx={item.cx}
        cy={item.cy}
        r={item.r}
        strokeWidth={item.strokeWidth}
        style={item.style}
      />
    );
  }

  if (item.kind === 'roundedRect') {
    return (
      <RoundedRect
        color={item.color}
        height={item.height}
        r={item.r}
        width={item.width}
        x={item.x}
        y={item.y}
      />
    );
  }

  return <SkiaTextRenderItem item={item} />;
}

function SkiaTextRenderItem({ item }: { item: Extract<TopoRenderItem, { kind: 'text' }> }) {
  const font = useFont(SKIA_FONT_BY_WEIGHT[item.fontWeight], item.fontSize);
  if (!font) {
    return null;
  }

  const textWidth = item.textAnchor === 'middle' ? font.measureText(item.text).width : 0;
  return (
    <SkiaText
      color={item.color}
      font={font}
      text={item.text}
      x={item.textAnchor === 'middle' ? item.x - textWidth / 2 : item.x}
      y={item.y}
    />
  );
}
