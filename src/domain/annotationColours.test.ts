import {
  ANNOTATION_COLOUR_PALETTE,
  blendRgb,
  chooseTextBackdrop,
  contrastRatio,
  defaultAnnotationColourForTarget,
  parseHexColour,
  relativeLuminance,
  summarizeBackgroundSamples,
} from './annotationColours';

describe('annotation colour helpers', () => {
  it('defines a ten-colour shared annotation palette', () => {
    expect(ANNOTATION_COLOUR_PALETTE).toHaveLength(10);
    expect(ANNOTATION_COLOUR_PALETTE.map((swatch) => swatch.value)).toEqual([
      '#111827',
      '#F8FAFC',
      '#DC2626',
      '#FACC15',
      '#F97316',
      '#06B6D4',
      '#2563EB',
      '#EC4899',
      '#84CC16',
      '#1E3A8A',
    ]);
  });

  it('returns target-specific defaults', () => {
    expect(defaultAnnotationColourForTarget('label')).toBe('#111827');
  });

  it('parses hex colours and calculates WCAG contrast', () => {
    expect(parseHexColour('#F8FAFC')).toEqual({ r: 248, g: 250, b: 252 });
    expect(relativeLuminance(parseHexColour('#000000'))).toBe(0);
    expect(contrastRatio(parseHexColour('#000000'), parseHexColour('#FFFFFF'))).toBeCloseTo(21, 1);
  });

  it('alpha blends foreground over background', () => {
    expect(blendRgb({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0.5)).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });

  it('summarizes background samples by median luminance', () => {
    expect(
      summarizeBackgroundSamples([
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 120, g: 120, b: 120 },
      ]),
    ).toEqual({ representative: { r: 120, g: 120, b: 120 } });
  });

  it('skips backdrop when sampled background already contrasts enough', () => {
    expect(
      chooseTextBackdrop({
        textColour: '#111827',
        background: { representative: { r: 248, g: 250, b: 252 } },
      }),
    ).toEqual({ color: '#000000', opacity: 0 });
  });

  it('selects the least visible backdrop that reaches target contrast', () => {
    const decision = chooseTextBackdrop({
      textColour: '#F8FAFC',
      background: { representative: { r: 245, g: 245, b: 245 } },
    });

    expect(decision.color).toBe('#000000');
    expect(decision.opacity).toBeGreaterThan(0);
    expect(decision.opacity).toBeLessThanOrEqual(0.56);
  });

  it('uses deterministic fallback when background samples are unavailable', () => {
    expect(chooseTextBackdrop({ textColour: '#111827' })).toEqual({
      color: '#000000',
      opacity: 0,
    });
    expect(chooseTextBackdrop({ textColour: '#FACC15' })).toEqual({
      color: '#000000',
      opacity: 0.34,
    });
  });
});
