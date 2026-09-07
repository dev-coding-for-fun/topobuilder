import {
  Circle,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  RoundedRect,
  Skia,
  Text as SkiaText,
  useTypeface,
  type SkFont,
  type SkImage,
  type SkTypeface,
} from '@shopify/react-native-skia';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { RenderTextFontWeight, TopoRenderItem } from './scene';
import { smoothedRenderPath } from './scene';
import { SKIA_INTER_FONT_BY_WEIGHT } from './skiaFontRegistry';

/**
 * Mounted editor renders can share Skia's async typefaces through
 * `SkiaTextFontProvider`; standalone scenes fall back to local typefaces.
 * Offscreen export renders pass preloaded typefaces into `SkiaTopoStaticScene`.
 */
export type SkiaTextTypefaces = Record<RenderTextFontWeight, SkTypeface>;
const SkiaTextTypefacesContext = createContext<SkiaTextTypefaces | null | undefined>(undefined);

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
  typefaces: explicitTypefaces,
}: {
  items: TopoRenderItem[];
  typefaces?: SkiaTextTypefaces | null;
}) {
  const contextTypefaces = useContext(SkiaTextTypefacesContext);
  const typefaces = explicitTypefaces !== undefined ? explicitTypefaces : contextTypefaces;

  if (typefaces !== undefined) {
    return <SkiaTopoSceneContent items={items} typefaces={typefaces} />;
  }

  return <SkiaTopoSceneWithLocalFonts items={items} />;
}

export function SkiaTextFontProvider({
  children,
  typefaces: explicitTypefaces,
}: {
  children: ReactNode;
  typefaces?: SkiaTextTypefaces | null;
}) {
  const localTypefaces = useSkiaInterTypefaces();
  const typefaces = explicitTypefaces !== undefined ? explicitTypefaces : localTypefaces;

  return (
    <SkiaTextTypefacesContext.Provider value={typefaces}>
      {children}
    </SkiaTextTypefacesContext.Provider>
  );
}

function SkiaTopoSceneWithLocalFonts({
  items,
}: {
  items: TopoRenderItem[];
}) {
  const typefaces = useSkiaInterTypefaces();

  return <SkiaTopoSceneContent items={items} typefaces={typefaces} />;
}

let cachedInterTypefaces: SkiaTextTypefaces | null = null;

export function clearCachedSkiaInterTypefacesForTests() {
  cachedInterTypefaces = null;
}

export function useSkiaInterTypefaces() {
  const regularTypeface = useTypeface(SKIA_INTER_FONT_BY_WEIGHT['400']);
  const boldTypeface = useTypeface(SKIA_INTER_FONT_BY_WEIGHT['700']);

  return useMemo(() => {
    if (regularTypeface && boldTypeface) {
      cachedInterTypefaces = {
        '400': regularTypeface,
        '700': boldTypeface,
      } satisfies SkiaTextTypefaces;
      return cachedInterTypefaces;
    }

    return cachedInterTypefaces;
  }, [boldTypeface, regularTypeface]);
}

function SkiaTopoSceneContent({
  items,
  typefaces,
}: {
  items: TopoRenderItem[];
  typefaces: SkiaTextTypefaces | null;
}) {
  return (
    <Group>
      {items.map((item) => (
        <SkiaRenderItem item={item} key={item.id} typefaces={typefaces} />
      ))}
    </Group>
  );
}

export function SkiaTopoStaticScene({
  items,
  typefaces,
}: {
  items: TopoRenderItem[];
  typefaces: SkiaTextTypefaces;
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
  typefaces,
}: {
  item: TopoRenderItem;
  typefaces: SkiaTextTypefaces | null;
}) {
  const primitive = primitiveRenderItem(item);
  if (primitive) {
    return primitive;
  }

  if (item.kind === 'text') {
    return typefaces ? <SkiaTextRenderItem item={item} typefaces={typefaces} /> : null;
  }
  return null;
}

function SkiaStaticRenderItem({
  item,
  typefaces,
}: {
  item: TopoRenderItem;
  typefaces: SkiaTextTypefaces;
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

function SkiaTextRenderItem({
  item,
  typefaces,
}: {
  item: Extract<TopoRenderItem, { kind: 'text' }>;
  typefaces: SkiaTextTypefaces;
}) {
  const font = bundledFontFromTypefaces(item, typefaces);
  if (!font) {
    return null;
  }

  const textWidth = item.textAnchor === 'middle' ? textWidthForFont(font, item.text) : 0;
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
  typefaces: SkiaTextTypefaces;
}) {
  const font = exportFontFromTypefaces(item, typefaces);

  const textWidth = item.textAnchor === 'middle' ? textWidthForFont(font, item.text) : 0;
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

function bundledFontFromTypefaces(
  item: Extract<TopoRenderItem, { kind: 'text' }>,
  typefaces: SkiaTextTypefaces,
) {
  return Skia.Font(typefaces[item.fontWeight], item.fontSize);
}

function exportFontFromTypefaces(
  item: Extract<TopoRenderItem, { kind: 'text' }>,
  typefaces: SkiaTextTypefaces,
) {
  const typeface = typefaces[item.fontWeight];
  if (!typeface) {
    throw new Error(`Export font ${item.fontWeight} could not be loaded.`);
  }

  return Skia.Font(typeface, item.fontSize);
}

function textWidthForFont(font: SkFont, text: string) {
  return font.getTextWidth(text);
}
