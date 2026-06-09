import { getItem, setItem } from './keyValueStore';

const EXPORT_DISCLAIMER_SETTINGS_KEY = 'export.disclaimerSettings';

export const DEFAULT_EXPORT_DISCLAIMER_TEXT =
  'CLIMB AT YOUR OWN RISK. NEITHER THE PERSON WHO PLACED THE BOLTS NOR THE PERSONS OR ORGANIZATIONS WHO HAVE POSTED THIS ROUTE INFORMATION TAKE RESPONSIBILITY FOR THE SAFETY OF THIS CLIMBING ROUTE. ASSESS THE RISKS BEFORE ATTEMPTING ANY CLIMB';

export type ExportDisclaimerSettings = {
  enabled: boolean;
  text: string;
};

export const DEFAULT_EXPORT_DISCLAIMER_SETTINGS: ExportDisclaimerSettings = {
  enabled: true,
  text: DEFAULT_EXPORT_DISCLAIMER_TEXT,
};

export async function loadExportDisclaimerSettings(): Promise<ExportDisclaimerSettings> {
  const raw = await getItem(EXPORT_DISCLAIMER_SETTINGS_KEY);
  if (!raw) return DEFAULT_EXPORT_DISCLAIMER_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<ExportDisclaimerSettings>;
    return normalizeExportDisclaimerSettings(parsed);
  } catch {
    return DEFAULT_EXPORT_DISCLAIMER_SETTINGS;
  }
}

export async function saveExportDisclaimerSettings(settings: ExportDisclaimerSettings): Promise<void> {
  await setItem(EXPORT_DISCLAIMER_SETTINGS_KEY, JSON.stringify(normalizeExportDisclaimerSettings(settings)));
}

function normalizeExportDisclaimerSettings(
  settings: Partial<ExportDisclaimerSettings>,
): ExportDisclaimerSettings {
  return {
    enabled:
      typeof settings.enabled === 'boolean'
        ? settings.enabled
        : DEFAULT_EXPORT_DISCLAIMER_SETTINGS.enabled,
    text: typeof settings.text === 'string' ? settings.text : DEFAULT_EXPORT_DISCLAIMER_SETTINGS.text,
  };
}
