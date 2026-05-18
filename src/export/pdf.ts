import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { annotationsForPhoto, isPathAnnotation } from '@/domain/annotationFactory';
import { chooseTextBackdrop } from '@/domain/annotationColours';
import type { Annotation, NormalizedPoint, PhotoAsset, TopoProject } from '@/domain/types';
import { labelFontSize, labelText, measureLabelText, splitLabelLines } from '@/domain/textLabels';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function annotationSvg(annotation: Annotation, photo: PhotoAsset) {
  if (isPathAnnotation(annotation)) {
    const path = smoothedPathData(annotation.points, photo);
    const dash = annotation.kind === 'walkoff' ? 'stroke-dasharray="8 10"' : annotation.kind === 'scramble' ? 'stroke-dasharray="16 8"' : '';
    return `<path d="${path}" fill="none" stroke="${annotation.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" ${dash} />`;
  }

  const x = annotation.point.x * photo.width;
  const y = annotation.point.y * photo.height;

  if (annotation.kind === 'label') {
    const fontSize = labelFontSize(annotation);
    const measured = measureLabelText(labelText(annotation), fontSize);
    const lines = splitLabelLines(labelText(annotation));
    const backdrop = chooseTextBackdrop({ textColour: annotation.color });
    const padding = Math.max(4, fontSize * 0.18);
    const backdropSvg =
      backdrop.opacity > 0
        ? `<rect x="${x - padding}" y="${y - padding}" width="${measured.width + padding * 2}" height="${measured.height + padding * 2}" rx="6" ry="6" fill="${backdrop.color}" opacity="${backdrop.opacity}" />`
        : '';
    const textSvg = lines
      .map(
        (line, index) =>
          `<text x="${x}" y="${y + fontSize + measured.lineHeight * index}" fill="${annotation.color}" font-size="${fontSize}" font-weight="700">${escapeHtml(line)}</text>`,
      )
      .join('');
    return `${backdropSvg}${textSvg}`;
  }

  return `<circle cx="${x}" cy="${y}" r="20" fill="#fff" /><circle cx="${x}" cy="${y}" r="14" fill="${annotation.color}" />`;
}

function smoothedPathData(points: NormalizedPoint[], photo: PhotoAsset) {
  const drawingPoints = points.map((point) => ({
    x: point.x * photo.width,
    y: point.y * photo.height,
  }));
  const first = drawingPoints[0];

  if (!first) {
    return '';
  }

  const commands = [`M ${first.x} ${first.y}`];

  if (drawingPoints.length === 2) {
    const last = drawingPoints[1];
    commands.push(`L ${last.x} ${last.y}`);
    return commands.join(' ');
  }

  for (let index = 1; index < drawingPoints.length - 1; index += 1) {
    const control = drawingPoints[index];
    const next = drawingPoints[index + 1];
    commands.push(`Q ${control.x} ${control.y} ${(control.x + next.x) / 2} ${(control.y + next.y) / 2}`);
  }

  const last = drawingPoints.at(-1);
  if (last) {
    commands.push(`L ${last.x} ${last.y}`);
  }

  return commands.join(' ');
}

export async function exportTopoPdf(project: TopoProject, photo: PhotoAsset) {
  const annotations = annotationsForPhoto(project.annotations, photo.id);
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
