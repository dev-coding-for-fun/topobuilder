const fs = require('fs');
const path = require('path');
const { TextDecoder, TextEncoder } = require('util');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');

let CanvasKit;

beforeAll(async () => {
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
  CanvasKit = await CanvasKitInit({});
});

function countPaintedTextPixels(typeface) {
  const surface = CanvasKit.MakeSurface(300, 120);
  const canvas = surface.getCanvas();
  const paint = new CanvasKit.Paint();

  paint.setColor(CanvasKit.Color(255, 255, 255, 1));
  canvas.drawRect(CanvasKit.LTRBRect(0, 0, 300, 120), paint);
  paint.setColor(CanvasKit.Color(0, 0, 0, 1));

  const font = new CanvasKit.Font(typeface, 48);
  canvas.drawText('Pitch 1', 20, 70, paint, font);

  const image = surface.makeImageSnapshot();
  const pixels = image.readPixels(0, 0, {
    alphaType: CanvasKit.AlphaType.Unpremul,
    colorSpace: CanvasKit.ColorSpace.SRGB,
    colorType: CanvasKit.ColorType.RGBA_8888,
    height: 120,
    width: 300,
  });

  let darkPixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 64 && pixels[index + 1] < 64 && pixels[index + 2] < 64 && pixels[index + 3] > 0) {
      darkPixels += 1;
    }
  }
  return darkPixels;
}

describe('Skia offscreen text pixels', () => {
  it('does not paint glyph pixels with the default CanvasKit font', () => {
    expect(countPaintedTextPixels(null)).toBe(0);
  });

  it('paints glyph pixels with the bundled Inter font', () => {
    const fontPath = path.resolve(__dirname, '../../node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf');
    const typeface = CanvasKit.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(fontPath));

    expect(typeface).toBeTruthy();
    expect(countPaintedTextPixels(typeface)).toBeGreaterThan(0);
  });
});
