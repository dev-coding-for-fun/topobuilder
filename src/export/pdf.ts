import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { PhotoAsset, TopoProject } from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';

const PDF_IMAGE_WIDTH = 900;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function exportTopoPdf(project: TopoProject, photo: PhotoAsset) {
  const raster = await renderTopoRasterBase64(project, photo, {
    targetWidth: Math.max(PDF_IMAGE_WIDTH, Math.min(photo.width, 2400)),
  });
  const imageUri = `data:${raster.mimeType};base64,${raster.base64}`;
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 32px; color: #111827; }
          h1 { margin: 0 0 16px; }
          .topo { position: relative; width: 100%; max-width: 900px; }
          .topo img, .topo svg { width: 100%; height: auto; display: block; }
          .topo svg { left: 0; position: absolute; top: 0; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(project.name)}</h1>
        <section class="topo">
          <img src="${escapeHtml(imageUri)}" />
        </section>
      </body>
    </html>
  `;

  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' });
  }
  return result.uri;
}
