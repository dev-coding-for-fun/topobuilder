import { render } from '@testing-library/react-native';
import { matchFont, Skia, useFonts, useTypeface } from '@shopify/react-native-skia';

import type { TopoRenderItem } from './scene';
import type { SkiaTextTypefaces } from './SkiaTopoRenderer';
import { SkiaTextFontProvider, SkiaTopoScene, SkiaTopoStaticScene } from './SkiaTopoRenderer';
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

const centeredMarkerTextItem: TopoRenderItem = {
  ...textItem,
  id: 'start-1:text',
  fontSize: 16,
  text: '12',
  textAnchor: 'middle',
  x: 200,
  y: 206,
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

    expect(useFonts).not.toHaveBeenCalled();
    expect(useTypeface).not.toHaveBeenCalled();
    expect(matchFont).not.toHaveBeenCalled();
    expect(Skia.Font).toHaveBeenCalledWith('bold-typeface', 48);
    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font.fontSize).toBe(48);
  });

  it('throws instead of omitting export text when a static Inter typeface is missing', () => {
    const missingBoldTypeface = {
      '400': 'regular-typeface',
    } as unknown as SkiaTextTypefaces;

    expect(() => {
      render(<SkiaTopoStaticScene items={[textItem]} typefaces={missingBoldTypeface} />);
    }).toThrow('Export font 700 could not be loaded.');
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
    expect(Skia.Font).not.toHaveBeenCalled();
  });
});

describe('SkiaTopoScene bundled font gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFonts as jest.Mock).mockReturnValue('sk-font-manager');
    (useTypeface as jest.Mock).mockReturnValue('sk-typeface');
  });

  it('skips text on every platform until bundled Skia typefaces are loaded', () => {
    (useTypeface as jest.Mock).mockReturnValue(null);

    const { UNSAFE_queryByProps } = render(<SkiaTopoScene items={[textItem]} />);

    expect(useFonts).not.toHaveBeenCalled();
    expect(useTypeface).toHaveBeenCalledWith(SKIA_INTER_FONT_BY_WEIGHT['400']);
    expect(useTypeface).toHaveBeenCalledWith(SKIA_INTER_FONT_BY_WEIGHT['700']);
    expect(matchFont).not.toHaveBeenCalled();
    expect(UNSAFE_queryByProps({ text: 'Pitch 1' })).toBeNull();
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });

  it('renders text from the bundled Inter typeface once typefaces are loaded', () => {
    const loadedFont = {
      fontSize: 48,
      measureText: jest.fn((text = '') => ({ width: String(text).length * 24 })),
    };
    (useTypeface as jest.Mock)
      .mockReturnValueOnce('regular-typeface')
      .mockReturnValueOnce('bold-typeface');
    (Skia.Font as jest.Mock).mockReturnValueOnce(loadedFont);

    const { UNSAFE_getByProps } = render(<SkiaTopoScene items={[textItem]} />);

    expect(useFonts).not.toHaveBeenCalled();
    expect(Skia.TypefaceFontProvider.Make).not.toHaveBeenCalled();
    expect(matchFont).not.toHaveBeenCalled();
    expect(Skia.Font).toHaveBeenCalledWith('bold-typeface', textItem.fontSize);
    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font).toBe(loadedFont);
    expect(Skia.FontMgr.System).not.toHaveBeenCalled();
  });

  it('reuses one set of bundled Inter typefaces for nested scenes under a provider', () => {
    (useTypeface as jest.Mock)
      .mockReturnValueOnce('regular-typeface')
      .mockReturnValueOnce('bold-typeface');

    render(
      <SkiaTextFontProvider>
        <SkiaTopoScene items={[textItem]} />
        <SkiaTopoScene items={[{ ...textItem, id: 'label-2:text:0', text: 'Pitch 2' }]} />
      </SkiaTextFontProvider>,
    );

    expect(useFonts).not.toHaveBeenCalled();
    expect(useTypeface).toHaveBeenCalledTimes(2);
    expect(Skia.TypefaceFontProvider.Make).not.toHaveBeenCalled();
    expect(matchFont).not.toHaveBeenCalled();
    expect(Skia.Font).toHaveBeenCalledTimes(2);
    expect(Skia.Font).toHaveBeenNthCalledWith(1, 'bold-typeface', textItem.fontSize);
    expect(Skia.Font).toHaveBeenNthCalledWith(2, 'bold-typeface', textItem.fontSize);
  });

  it('does not use Skia useFonts because it throws uncaught typeface errors on web', () => {
    (useFonts as jest.Mock).mockImplementation(() => {
      throw new Error("Couldn't create typeface for Inter");
    });
    (useTypeface as jest.Mock)
      .mockReturnValueOnce('regular-typeface')
      .mockReturnValueOnce('bold-typeface');

    expect(() => {
      render(
        <SkiaTextFontProvider>
          <SkiaTopoScene items={[textItem]} />
        </SkiaTextFontProvider>,
      );
    }).not.toThrow();

    expect(useFonts).not.toHaveBeenCalled();
    expect(useTypeface).toHaveBeenCalledTimes(2);
    expect(Skia.TypefaceFontProvider.Make).not.toHaveBeenCalled();
  });

  it('does not match fonts through TypefaceFontProvider because that is not implemented on web', () => {
    const fontMgr = {
      registerFont: jest.fn(),
      matchFamilyStyle: jest.fn(() => {
        throw new Error('Not implemented on React Native Web');
      }),
    };
    (useTypeface as jest.Mock)
      .mockReturnValueOnce('regular-typeface')
      .mockReturnValueOnce('bold-typeface');
    (Skia.TypefaceFontProvider.Make as jest.Mock).mockReturnValueOnce(fontMgr);
    (matchFont as jest.Mock).mockImplementationOnce((_fontStyle, manager) => {
      manager.matchFamilyStyle('Inter', { weight: 700, width: 5, slant: 0 });
    });

    expect(() => {
      render(
        <SkiaTextFontProvider>
          <SkiaTopoScene items={[textItem]} />
        </SkiaTextFontProvider>,
      );
    }).not.toThrow();

    expect(fontMgr.matchFamilyStyle).not.toHaveBeenCalled();
    expect(matchFont).not.toHaveBeenCalled();
  });

  it('centers route marker text without calling SkFont.measureText, which is not implemented on web', () => {
    const loadedFont = {
      fontSize: 16,
      getTextWidth: jest.fn(() => 12),
      measureText: jest.fn(() => {
        throw new Error('Not implemented on React Native Web');
      }),
    };
    (useTypeface as jest.Mock)
      .mockReturnValueOnce('regular-typeface')
      .mockReturnValueOnce('bold-typeface');
    (Skia.Font as jest.Mock).mockReturnValueOnce(loadedFont);

    const { UNSAFE_getByProps } = render(<SkiaTopoScene items={[centeredMarkerTextItem]} />);

    expect(loadedFont.measureText).not.toHaveBeenCalled();
    expect(loadedFont.getTextWidth).toHaveBeenCalledWith('12');
    expect(UNSAFE_getByProps({ text: '12' }).props.x).toBe(194);
  });
});
