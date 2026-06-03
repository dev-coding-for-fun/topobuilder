import {
  DEFAULT_SCREEN_LABEL_FONT_SIZE,
  findNearestLabelHandle,
  measureLabelBounds,
  photoFontSizeFromScreen,
  splitLabelLines,
} from './textLabels';

describe('text label helpers', () => {
  it('splits only on explicit newline characters', () => {
    expect(splitLabelLines('Pitch 1 is long')).toEqual(['Pitch 1 is long']);
    expect(splitLabelLines('Pitch 1\n5.10a')).toEqual(['Pitch 1', '5.10a']);
  });

  it('measures long text as one unwrapped line', () => {
    const oneLine = measureLabelBounds({
      point: { x: 0.1, y: 0.2 },
      text: 'This is a long line without manual breaks',
      fontSize: 20,
      size: { width: 1000, height: 500 },
    });
    const multiline = measureLabelBounds({
      point: { x: 0.1, y: 0.2 },
      text: 'This is a long line\nwithout manual breaks',
      fontSize: 20,
      size: { width: 1000, height: 500 },
    });

    expect(oneLine.height).toBeLessThan(multiline.height);
    expect(oneLine.width).toBeGreaterThan(multiline.width);
  });

  it('adds leading selection room without adding trailing padding', () => {
    const bounds = measureLabelBounds({
      point: { x: 0.1, y: 0.2 },
      text: 'Pitch',
      fontSize: 20,
      size: { width: 1000, height: 500 },
    });

    expect(bounds.x).toBeCloseTo(97.6);
    expect(bounds.width).toBeCloseTo(54.4);
    expect(bounds.x + bounds.width).toBeCloseTo(152);
  });

  it('derives photo-relative font size from current screen zoom', () => {
    const unzoomed = photoFontSizeFromScreen({
      imageFit: { scale: 0.5 },
      screenFontSize: DEFAULT_SCREEN_LABEL_FONT_SIZE,
      viewScale: 1,
    });
    const zoomedIn = photoFontSizeFromScreen({
      imageFit: { scale: 0.5 },
      screenFontSize: DEFAULT_SCREEN_LABEL_FONT_SIZE,
      viewScale: 2,
    });
    const zoomedOut = photoFontSizeFromScreen({
      imageFit: { scale: 0.5 },
      screenFontSize: DEFAULT_SCREEN_LABEL_FONT_SIZE,
      viewScale: 0.5,
    });

    expect(zoomedIn).toBeLessThan(unzoomed);
    expect(zoomedOut).toBeGreaterThan(unzoomed);
  });

  it('finds corner handles within tolerance', () => {
    expect(
      findNearestLabelHandle({ x: 10, y: 20, width: 100, height: 40 }, { x: 108, y: 58 }, 8),
    ).toMatchObject({ handle: 'resize' });
    expect(
      findNearestLabelHandle({ x: 10, y: 20, width: 100, height: 40 }, { x: 12, y: 22 }, 8),
    ).toMatchObject({ handle: 'move' });
    expect(
      findNearestLabelHandle({ x: 10, y: 20, width: 100, height: 40 }, { x: 60, y: 40 }, 8),
    ).toBeUndefined();
  });
});
