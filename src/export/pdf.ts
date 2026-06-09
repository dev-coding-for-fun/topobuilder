import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type {
  GuidebookExportBundle,
  GuidebookSector,
  GuidebookTopo,
  PhotoAsset,
  Route,
  TopoProject,
} from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';
import {
  DEFAULT_EXPORT_DISCLAIMER_SETTINGS,
  type ExportDisclaimerSettings,
  loadExportDisclaimerSettings,
} from '@/settings/exportDisclaimer';

const PDF_IMAGE_WIDTH = 900;

export type GuidebookExportOptions = {
  disclaimer?: ExportDisclaimerSettings;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function paragraphs(value: string | undefined) {
  if (!value?.trim()) return '';
  return value
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br />')}</p>`)
    .join('');
}

function routeTypeLabel(value: Route['routeType']) {
  switch (value) {
    case 'top-rope':
      return 'Top rope';
    case 'sport':
      return 'Sport';
    case 'trad':
      return 'Trad';
    case 'mixed':
      return 'Mixed';
    case 'boulder':
      return 'Boulder';
    case 'aid':
      return 'Aid';
    default:
      return undefined;
  }
}

function routeMeta(route: Route) {
  return [
    route.grade,
    routeTypeLabel(route.routeType),
    route.lengthM !== undefined ? `${route.lengthM}m` : undefined,
    route.boltCount !== undefined ? `${route.boltCount} bolts` : undefined,
  ].filter((value): value is string => Boolean(value));
}

function legacyProjectForTopo(topo: GuidebookTopo): TopoProject | undefined {
  if (!topo.photo) return undefined;
  return {
    id: topo.id,
    name: topo.name,
    description: topo.description,
    createdAt: topo.createdAt,
    updatedAt: topo.updatedAt,
    photos: [topo.photo],
    routes: topo.routes,
    annotations: topo.annotations,
  };
}

async function renderTopoImageHtml(topo: GuidebookTopo) {
  const project = legacyProjectForTopo(topo);
  if (!project || !topo.photo) {
    return '<p class="placeholder">No topo image attached.</p>';
  }
  const raster = await renderTopoRasterBase64(project, topo.photo, {
    targetWidth: Math.max(PDF_IMAGE_WIDTH, Math.min(topo.photo.width, 2400)),
  });
  const imageUri = `data:${raster.mimeType};base64,${raster.base64}`;
  return `<figure class="topo-image"><img src="${escapeHtml(imageUri)}" /></figure>`;
}

function routeListHtml(routes: Route[]) {
  if (routes.length === 0) {
    return '';
  }
  return `
    <ol class="routes">
      ${routes
        .map((route, index) => {
          const meta = routeMeta(route);
          return `
            <li>
              <div class="route-heading">
                <span class="route-name">${escapeHtml(route.name.trim() || `Route ${index + 1}`)}</span>
                ${meta.length > 0 ? `<span class="route-meta">${escapeHtml(meta.join(' | '))}</span>` : ''}
              </div>
              ${route.fa ? `<div class="route-fa">FA: ${escapeHtml(route.fa)}</div>` : ''}
              ${route.description ? `<div class="route-description">${paragraphs(route.description)}</div>` : ''}
            </li>
          `;
        })
        .join('')}
    </ol>
  `;
}

function disclaimerHtml(settings: ExportDisclaimerSettings | undefined) {
  const disclaimer = settings ?? DEFAULT_EXPORT_DISCLAIMER_SETTINGS;
  if (!disclaimer.enabled || !disclaimer.text.trim()) return '';

  return `
    <aside class="disclaimer-box">
      <div class="disclaimer-title">Climbing disclaimer</div>
      <div class="disclaimer-copy">${paragraphs(disclaimer.text)}</div>
    </aside>
  `;
}

async function topoSectionHtml(topo: GuidebookTopo) {
  return `
    <section class="topo-section">
      <h3>${escapeHtml(topo.name)}</h3>
      ${paragraphs(topo.description)}
      ${await renderTopoImageHtml(topo)}
      ${routeListHtml(topo.routes)}
    </section>
  `;
}

async function sectorSectionHtml(sector: GuidebookSector) {
  const topoSections = await Promise.all(sector.topos.map((topo) => topoSectionHtml(topo)));
  return `
    <section class="sector-section">
      <h2>${escapeHtml(sector.name)}</h2>
      ${paragraphs(sector.description)}
      ${
        topoSections.length > 0
          ? topoSections.join('')
          : '<p class="placeholder">No topos listed in this sector.</p>'
      }
    </section>
  `;
}

function guidebookTitle(bundle: GuidebookExportBundle) {
  if (bundle.scope === 'topo') {
    const topo = bundle.crag.sectors[0]?.topos[0];
    return topo?.name ?? bundle.crag.name;
  }
  if (bundle.scope === 'sector') {
    const sector = bundle.crag.sectors[0];
    return sector?.name ?? bundle.crag.name;
  }
  return bundle.crag.name;
}

export async function buildGuidebookHtml(bundle: GuidebookExportBundle, options: GuidebookExportOptions = {}) {
  const sectorSections = await Promise.all(bundle.crag.sectors.map((sector) => sectorSectionHtml(sector)));
  const title = guidebookTitle(bundle);
  const context =
    bundle.scope === 'crag'
      ? ''
      : `<p class="context">${escapeHtml(bundle.crag.name)}${
          bundle.scope === 'topo' && bundle.crag.sectors[0]
            ? ` / ${escapeHtml(bundle.crag.sectors[0].name)}`
            : ''
        }</p>`;
  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 32px; }
          body { color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.45; margin: 32px; }
          h1 { font-size: 32px; line-height: 1.1; margin: 0 0 8px; }
          h2 { border-bottom: 1px solid #D1D5DB; font-size: 24px; margin: 32px 0 10px; padding-bottom: 6px; }
          h3 { font-size: 19px; margin: 22px 0 8px; }
          p { margin: 0 0 10px; }
          .disclaimer-box { background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 12px; margin: 16px 0 20px; max-width: 900px; padding: 12px 14px; }
          .disclaimer-copy { color: #7C2D12; font-size: 13px; line-height: 1.45; }
          .disclaimer-copy p:last-child { margin-bottom: 0; }
          .disclaimer-title { color: #9A3412; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 5px; text-transform: uppercase; }
          .context, .placeholder, .route-meta, .route-fa { color: #6B7280; }
          .topo-image { margin: 12px 0 14px; max-width: 900px; }
          .topo-image img { display: block; height: auto; width: 100%; }
          .routes { margin: 8px 0 0; padding-left: 28px; }
          .routes li { margin-bottom: 12px; }
          .route-heading { align-items: baseline; display: flex; flex-wrap: wrap; gap: 8px; }
          .route-name { font-weight: 700; }
          .route-description p { margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${context}
        ${disclaimerHtml(options.disclaimer)}
        ${bundle.scope === 'crag' ? paragraphs(bundle.crag.description) : ''}
        ${
          sectorSections.length > 0
            ? sectorSections.join('')
            : '<p class="placeholder">No sectors listed in this crag.</p>'
        }
      </body>
    </html>
  `;
}

export async function exportGuidebookPdf(bundle: GuidebookExportBundle, options?: GuidebookExportOptions) {
  const resolvedOptions = options ?? { disclaimer: await loadExportDisclaimerSettings() };
  const html = await buildGuidebookHtml(bundle, resolvedOptions);
  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
  return result.uri;
}

export async function exportTopoPdf(project: TopoProject, photo: PhotoAsset) {
  return exportGuidebookPdf({
    crag: {
      id: project.id,
      name: project.name,
      description: project.description,
      sortOrder: 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      sectors: [
        {
          id: `${project.id}:sector`,
          cragId: project.id,
          name: project.name,
          sortOrder: 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          topos: [
            {
              id: project.id,
              sectorId: `${project.id}:sector`,
              name: project.name,
              description: project.description,
              photoUri: photo.uri,
              photoWidth: photo.width,
              photoHeight: photo.height,
              tabvarDirty: true,
              sortOrder: 0,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              annotations: project.annotations,
              photo,
              routes: project.routes,
            },
          ],
        },
      ],
    },
    scope: 'topo',
    selectedSectorId: `${project.id}:sector`,
    selectedTopoId: project.id,
  });
}
