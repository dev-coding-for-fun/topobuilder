import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Skia, useFont } from '@shopify/react-native-skia';

import type { TopoRenderItem } from './scene';
import { SkiaTopoScene, SkiaTopoStaticScene } from './SkiaTopoRenderer';

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

  it('renders text with a synchronous Skia font without useFont', () => {
    (useFont as jest.Mock).mockReturnValueOnce(null);

    const { UNSAFE_getByProps } = render(<SkiaTopoStaticScene items={[textItem]} />);

    expect(useFont).not.toHaveBeenCalled();
    expect(Skia.Font).toHaveBeenCalledWith(expect.anything(), 48);
    expect(UNSAFE_getByProps({ text: 'Pitch 1' }).props.font.fontSize).toBe(48);
  });
});

describe('SkiaTopoScene web font fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression: `FontMgr.System().matchFamilyStyle` is not implemented on React
  // Native Web and throws synchronously, which crashed the whole canvas (blank
  // editor). When the bundled `useFont` hasn't resolved yet on web we must skip
  // rendering the glyphs rather than fall back to the system font manager.
  it('never touches the system font manager on web while useFont is unresolved', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    (useFont as jest.Mock).mockReturnValue(null);

    try {
      expect(() => render(<SkiaTopoScene items={[textItem]} />)).not.toThrow();
      expect(Skia.FontMgr.System).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });

  it('still uses the system font fallback on native when useFont is unresolved', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    (useFont as jest.Mock).mockReturnValue(null);

    try {
      render(<SkiaTopoScene items={[textItem]} />);
      expect(Skia.FontMgr.System).toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });
});
