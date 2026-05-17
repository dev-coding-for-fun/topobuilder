import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Annotation, PhotoAsset, TopoProject } from '@/domain/types';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function annotationSvg(annotation: Annotation, photo: PhotoAsset) {
  if ('points' in annotation) {
    const points = annotation.points
      .map((point) => `${point.x * photo.width},${point.y * photo.height}`)
      .join(' ');
    const dash = annotation.kind === 'walkoff' ? 'stroke-dasharray="8 10"' : annotation.kind === 'scramble' ? 'stroke-dasharray="16 8"' : '';
    return `<polyline points="${points}" fill="none" stroke="${annotation.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" ${dash} />`;
  }

  const x = annotation.point.x * photo.width;
  const y = annotation.point.y * photo.height;

  if (annotation.kind === 'label') {
    return `<text x="${x}" y="${y}" fill="${annotation.color}" font-size="42" font-weight="700">${escapeHtml(annotation.label ?? 'Label')}</text>`;
  }

  return `<circle cx="${x}" cy="${y}" r="20" fill="#fff" /><circle cx="${x}" cy="${y}" r="14" fill="${annotation.color}" />`;
}

export async function exportTopoPdf(project: TopoProject, photo: PhotoAsset) {
  const annotations = project.annotations.filter((annotation) => annotation.photoId === photo.id);
  const overlay = annotations.map((annotation) => annotationSvg(annotation, photo)).join('');
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
          <img src="${photo.uri}" />
          <svg viewBox="0 0 ${photo.width} ${photo.height}" xmlns="http://www.w3.org/2000/svg">${overlay}</svg>
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
