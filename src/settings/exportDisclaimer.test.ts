import {
  DEFAULT_EXPORT_DISCLAIMER_SETTINGS,
  DEFAULT_EXPORT_DISCLAIMER_TEXT,
  loadExportDisclaimerSettings,
  saveExportDisclaimerSettings,
} from './exportDisclaimer';
import { getItem, setItem } from './keyValueStore';

jest.mock('./keyValueStore', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('export disclaimer settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to an enabled disclaimer with safety copy', async () => {
    (getItem as jest.Mock).mockResolvedValueOnce(null);

    await expect(loadExportDisclaimerSettings()).resolves.toEqual(DEFAULT_EXPORT_DISCLAIMER_SETTINGS);
    expect(DEFAULT_EXPORT_DISCLAIMER_TEXT).toContain('CLIMB AT YOUR OWN RISK');
  });

  it('falls back to defaults when stored settings are invalid', async () => {
    (getItem as jest.Mock).mockResolvedValueOnce('{not-json');

    await expect(loadExportDisclaimerSettings()).resolves.toEqual(DEFAULT_EXPORT_DISCLAIMER_SETTINGS);
  });

  it('saves normalized settings', async () => {
    await saveExportDisclaimerSettings({ enabled: false, text: 'Custom notice' });

    expect(setItem).toHaveBeenCalledWith(
      'export.disclaimerSettings',
      JSON.stringify({ enabled: false, text: 'Custom notice' }),
    );
  });
});
