import { render } from '@testing-library/react-native';
import { Skia, useFont } from '@shopify/react-native-skia';

import type { TopoRenderItem } from './scene';
import { SkiaTopoStaticScene } from './SkiaTopoRenderer';

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
