import { Group, ImageFormat, Skia } from '@shopify/react-native-skia';
import { drawAsImage } from '@shopify/react-native-skia/lib/module/renderer/Offscreen';
import * as FileSystem from 'expo-file-system/legacy';

import { annotationsForPhoto } from '@/domain/annotationFactory';
import type { PhotoAsset, TopoProject } from '@/domain/types';

import { buildTopoRenderScene } from './scene';
import { SkiaTopoImage, SkiaTopoScene } from './SkiaTopoRenderer';

export type RasterTopoOptions = {
  format?: ImageFormat;
  quality?: number;
  targetWidth?: number;
};

const DEFAULT_EXPORT_WIDTH = 1800;

export async function renderTopoRasterBase64(
  project: TopoProject,
  photo: PhotoAsset,
  options: RasterTopoOptions = {},
) {
  const targetWidth = options.targetWidth ?? Math.min(Math.max(photo.width, DEFAULT_EXPORT_WIDTH), 2400);
  const size = {
    width: targetWidth,
    height: Math.round((targetWidth / photo.width) * photo.height),
  };
  const photoImage = await skiaImageFromUri(photo.uri);
  if (!photoImage) {
    throw new Error('Topo photo could not be decoded for export.');
  }

  const scene = buildTopoRenderScene({
    annotations: annotationsForPhoto(project.annotations, photo.id),
    size,
    sourcePhoto: photo,
    target: 'artifact',
  });
  const renderedImage = await drawAsImage(
    <Group>
      <SkiaTopoImage image={photoImage} size={size} />
      <SkiaTopoScene items={scene} />
    </Group>,
    size,
  );

  return {
    base64: renderedImage.encodeToBase64(options.format ?? ImageFormat.JPEG, options.quality ?? 92),
    height: size.height,
    mimeType: imageFormatMimeType(options.format ?? ImageFormat.JPEG),
    width: size.width,
  };
}

async function skiaImageFromUri(uri: string) {
  const encoded = await encodedImageBase64(uri);
  const data = Skia.Data.fromBase64(encoded);
  return Skia.Image.MakeImageFromEncoded(data);
}

async function encodedImageBase64(uri: string) {
  const dataUriMatch = uri.match(/^data:[^;]+;base64,(.*)$/);
  if (dataUriMatch) {
    return dataUriMatch[1];
  }

  if (/^https?:\/\//i.test(uri)) {
    const data = await Skia.Data.fromURI(uri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    const base64 = image?.encodeToBase64();
    if (!base64) {
      throw new Error('Remote topo photo could not be decoded.');
    }
    return base64;
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function imageFormatMimeType(format: ImageFormat) {
  if (format === ImageFormat.PNG) {
    return 'image/png';
  }
  if (format === ImageFormat.WEBP) {
    return 'image/webp';
  }
  return 'image/jpeg';
}
