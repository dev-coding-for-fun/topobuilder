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
  type SkTypeface,
} from '@shopify/react-native-skia';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

import type { RenderTextFontWeight, TopoRenderItem } from './scene';
import { smoothedRenderPath } from './scene';

/**
 * Mounted editor renders can use Skia's async font hook. Offscreen export
 * renders pass preloaded typefaces into `SkiaTopoStaticScene` instead.
 */
const SKIA_FONT_BY_WEIGHT = {
  '400': Inter_400Regular,
  '700': Inter_700Bold,
} satisfies Record<RenderTextFontWeight, Parameters<typeof useFont>[0]>;

export type SkiaTextTypefaces = Partial<Record<RenderTextFontWeight, SkTypeface>>;

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

export function SkiaTopoStaticScene({
  items,
  typefaces,
}: {
  items: TopoRenderItem[];
  typefaces?: SkiaTextTypefaces;
}) {
  return (
    <Group>
      {items.map((item) => (
        <SkiaStaticRenderItem item={item} key={item.id} typefaces={typefaces} />
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
  const primitive = primitiveRenderItem(item);
  if (primitive) {
    return primitive;
  }

  if (item.kind === 'text') {
    return <SkiaTextRenderItem item={item} />;
  }
  return null;
}

function SkiaStaticRenderItem({
  item,
  typefaces,
}: {
  item: TopoRenderItem;
  typefaces?: SkiaTextTypefaces;
}) {
  const primitive = primitiveRenderItem(item);
  if (primitive) {
    return primitive;
  }

  if (item.kind === 'text') {
    return <SkiaStaticTextRenderItem item={item} typefaces={typefaces} />;
  }
  return null;
}

function primitiveRenderItem(item: TopoRenderItem) {
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

  return undefined;
}

function SkiaTextRenderItem({ item }: { item: Extract<TopoRenderItem, { kind: 'text' }> }) {
  const font = useFont(SKIA_FONT_BY_WEIGHT[item.fontWeight], item.fontSize) ?? systemFont(item);
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

function SkiaStaticTextRenderItem({
  item,
  typefaces,
}: {
  item: Extract<TopoRenderItem, { kind: 'text' }>;
  typefaces?: SkiaTextTypefaces;
}) {
  const font = bundledFont(item, typefaces) ?? systemFont(item);
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

function bundledFont(
  item: Extract<TopoRenderItem, { kind: 'text' }>,
  typefaces?: SkiaTextTypefaces,
) {
  const typeface = typefaces?.[item.fontWeight];
  return typeface ? Skia.Font(typeface, item.fontSize) : undefined;
}

function systemFont(item: Extract<TopoRenderItem, { kind: 'text' }>) {
  const typeface = Skia.FontMgr.System().matchFamilyStyle('System', {
    weight: item.fontWeight === '700' ? 700 : 400,
  });
  return Skia.Font(typeface ?? undefined, item.fontSize);
}
