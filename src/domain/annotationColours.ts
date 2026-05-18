import type { AnnotationKind, MarkerAnnotationKind } from './types';

export type RgbColour = {
  r: number;
  g: number;
  b: number;
};

export type AnnotationColourSwatch = {
  id: string;
  label: string;
  value: string;
};

export type StampAnnotationKind = Extract<MarkerAnnotationKind, 'bolt' | 'rappel' | 'belay' | 'start'>;
export type AnnotationColourTarget = 'label' | 'line' | StampAnnotationKind;

export type TextBackdropDecision = {
  color: '#000000' | '#FFFFFF';
  opacity: number;
};

export type BackgroundSampleSummary = {
  representative: RgbColour;
};

export const ANNOTATION_COLOUR_PALETTE: AnnotationColourSwatch[] = [
  { id: 'ink', label: 'Ink', value: '#111827' },
  { id: 'white', label: 'White', value: '#F8FAFC' },
  { id: 'red', label: 'Red', value: '#DC2626' },
  { id: 'yellow', label: 'Yellow', value: '#FACC15' },
  { id: 'orange', label: 'Orange', value: '#F97316' },
  { id: 'cyan', label: 'Cyan', value: '#06B6D4' },
  { id: 'blue', label: 'Blue', value: '#2563EB' },
  { id: 'magenta', label: 'Magenta', value: '#EC4899' },
  { id: 'lime', label: 'Lime', value: '#84CC16' },
  { id: 'deepNavy', label: 'Deep Navy', value: '#1E3A8A' },
];

export const DEFAULT_TEXT_ANNOTATION_COLOUR = '#111827';
export const DEFAULT_LINE_ANNOTATION_COLOUR = '#FACC15';
export const DEFAULT_STAMP_ANNOTATION_COLOUR = '#FACC15';
export const TEXT_BACKDROP_TARGET_CONTRAST = 4.5;
export const TEXT_BACKDROP_FALLBACK_OPACITY = 0.34;
export const TEXT_BACKDROP_FALLBACK_BACKGROUND = '#D1D5DB';
export const TEXT_BACKDROP_CANDIDATE_ALPHAS = [0, 0.12, 0.18, 0.26, 0.34, 0.44, 0.56];
export const TEXT_BACKDROP_COLOURS = ['#000000', '#FFFFFF'] as const;

export function defaultAnnotationColourForTarget(target: AnnotationColourTarget) {
  switch (target) {
    case 'label':
      return DEFAULT_TEXT_ANNOTATION_COLOUR;
    case 'line':
      return DEFAULT_LINE_ANNOTATION_COLOUR;
    case 'belay':
    case 'bolt':
    case 'rappel':
    case 'start':
      return DEFAULT_STAMP_ANNOTATION_COLOUR;
  }
}

export function normaliseHexColour(value: string) {
  const parsed = parseHexColour(value);
  return rgbToHex(parsed);
}

export function parseHexColour(value: string): RgbColour {
  const trimmed = value.trim();
  const match = /^#?([a-f\d]{6})$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid hex colour: ${value}`);
  }

  const hex = match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

export function rgbToHex(colour: RgbColour) {
  return `#${toHexByte(colour.r)}${toHexByte(colour.g)}${toHexByte(colour.b)}`.toUpperCase();
}

export function rgbaString(colour: string, opacity: number) {
  const rgb = parseHexColour(colour);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp01(opacity)})`;
}

export function relativeLuminance(colour: RgbColour) {
  const r = srgbChannelToLinear(colour.r / 255);
  const g = srgbChannelToLinear(colour.g / 255);
  const b = srgbChannelToLinear(colour.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: RgbColour, b: RgbColour) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function blendRgb(foreground: RgbColour, background: RgbColour, alpha: number): RgbColour {
  const clampedAlpha = clamp01(alpha);
  return {
    r: Math.round(foreground.r * clampedAlpha + background.r * (1 - clampedAlpha)),
    g: Math.round(foreground.g * clampedAlpha + background.g * (1 - clampedAlpha)),
    b: Math.round(foreground.b * clampedAlpha + background.b * (1 - clampedAlpha)),
  };
}

export function summarizeBackgroundSamples(samples: RgbColour[]): BackgroundSampleSummary | undefined {
  if (samples.length === 0) {
    return undefined;
  }

  const sorted = [...samples].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  return {
    representative: sorted[Math.floor(sorted.length / 2)],
  };
}

export function chooseTextBackdrop(input: {
  textColour: string;
  background?: BackgroundSampleSummary;
  targetContrast?: number;
}): TextBackdropDecision {
  const text = parseHexColour(input.textColour);
  const targetContrast = input.targetContrast ?? TEXT_BACKDROP_TARGET_CONTRAST;

  if (!input.background) {
    return chooseFallbackBackdrop(text);
  }

  const background = input.background.representative;
  if (contrastRatio(text, background) >= targetContrast) {
    return { color: '#000000', opacity: 0 };
  }

  let best: { decision: TextBackdropDecision; contrast: number } | undefined;

  for (const opacity of TEXT_BACKDROP_CANDIDATE_ALPHAS) {
    for (const color of TEXT_BACKDROP_COLOURS) {
      const blended = blendRgb(parseHexColour(color), background, opacity);
      const contrast = contrastRatio(text, blended);
      const candidate = { decision: { color, opacity }, contrast };

      if (contrast >= targetContrast) {
        if (!best || opacity < best.decision.opacity || (opacity === best.decision.opacity && contrast > best.contrast)) {
          best = candidate;
        }
      }
    }

    if (best && best.decision.opacity === opacity) {
      return best.decision;
    }
  }

  for (const color of TEXT_BACKDROP_COLOURS) {
    const opacity = TEXT_BACKDROP_CANDIDATE_ALPHAS.at(-1) ?? TEXT_BACKDROP_FALLBACK_OPACITY;
    const blended = blendRgb(parseHexColour(color), background, opacity);
    const contrast = contrastRatio(text, blended);
    if (!best || contrast > best.contrast) {
      best = { decision: { color, opacity }, contrast };
    }
  }

  return best?.decision ?? chooseFallbackBackdrop(text);
}

function chooseFallbackBackdrop(text: RgbColour): TextBackdropDecision {
  const assumedRockBackground = parseHexColour(TEXT_BACKDROP_FALLBACK_BACKGROUND);
  if (contrastRatio(text, assumedRockBackground) >= TEXT_BACKDROP_TARGET_CONTRAST) {
    return { color: '#000000', opacity: 0 };
  }

  const black = parseHexColour('#000000');
  const white = parseHexColour('#FFFFFF');
  return {
    color: contrastRatio(text, black) >= contrastRatio(text, white) ? '#000000' : '#FFFFFF',
    opacity: TEXT_BACKDROP_FALLBACK_OPACITY,
  };
}

function srgbChannelToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toHexByte(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
