import { render } from '@testing-library/react-native';
import { Skia, useFont } from '@shopify/react-native-skia';

import type { TopoRenderItem } from './scene';
import type { SkiaTextTypefaces } from './SkiaTopoRenderer';
import { SkiaTopoScene, SkiaTopoStaticScene } from './SkiaTopoRenderer';
import { SKIA_INTER_FONT_BY_WEIGHT } from './skiaFontRegistry';

const textItem: TopoRenderItem = {
  id: 'label-1:text:0',
  kind: 'text',
  color: '#111827',
  fontSize: 48,
  fontWeight: '700',
  text: 'Pitch 1',
  x: 100,
  y: 120,
};

describe('SkiaTopoStaticScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const typefaces = {
    '400': 'regular-typeface',
    '700': 'bold-typeface',
  } as unknown as SkiaTextTypefaces;

  it('renders text with preloaded bundled Inter typefaces', () => {
    const { UNSAFE_getByProps } = render(
      <SkiaTopoStaticScene items={[textItem]} typefaces={typefaces} />,
    );

    expect(useFont).not.toHaveBeenCalled();
    expect(Skia.Font).toHaveBeenCalledWith('bold-typeface', 48);
    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font.fontSize).toBe(48);
  });

  it('skips text rather than falling back when static Inter typefaces are missing', () => {
    const { UNSAFE_queryByProps } = render(<SkiaTopoStaticScene items={[textItem]} />);

    expect(UNSAFE_queryByProps({ text: 'Pitch 1' })).toBeNull();
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
    expect(Skia.Font).not.toHaveBeenCalled();
  });
});

describe('SkiaTopoScene bundled font gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips text on every platform until bundled Skia fonts are loaded', () => {
    (useFont as jest.Mock).mockReturnValueOnce(null);

    const { UNSAFE_queryByProps } = render(<SkiaTopoScene items={[textItem]} />);

    expect(useFont).toHaveBeenCalledWith(
      SKIA_INTER_FONT_BY_WEIGHT[textItem.fontWeight],
      textItem.fontSize,
    );
    expect(UNSAFE_queryByProps({ text: 'Pitch 1' })).toBeNull();
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });

  it('renders text with bundled Inter once Skia fonts are loaded', () => {
    const loadedFont = {
      fontSize: 48,
      measureText: jest.fn((text = '') => ({ width: String(text).length * 24 })),
    };
    (useFont as jest.Mock).mockReturnValueOnce(loadedFont);

    const { UNSAFE_getByProps } = render(<SkiaTopoScene items={[textItem]} />);

    expect(useFont).toHaveBeenCalledWith(
      SKIA_INTER_FONT_BY_WEIGHT[textItem.fontWeight],
      textItem.fontSize,
    );
    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font).toBe(loadedFont);
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });
});
