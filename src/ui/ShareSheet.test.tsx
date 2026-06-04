import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GuidebookExportBundle } from '@/domain/types';
import { exportGuidebookPdf } from '@/export/pdf';
import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { useTopoStore } from '@/state/TopoStore';

import { ShareSheet, type ShareScope } from './ShareSheet';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    KeyboardAwareScrollView: ({ children }: { children: unknown }) => React.createElement(View, null, children),
  };
});

jest.mock('@/export/pdf', () => ({
  exportGuidebookPdf: jest.fn(async () => 'file://guidebook.pdf'),
}));

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  loadTabvarSession: jest.fn(),
}));

jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const bundle: GuidebookExportBundle = {
  scope: 'crag',
  crag: {
    id: 'crag-1',
    name: 'Guide Crag',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sectors: [],
  },
};

const scopes: ShareScope[] = [
  { kind: 'crag', cragId: 'crag-1', name: 'Guide Crag' },
  { kind: 'sector', sectorId: 'sector-1', name: 'Main Wall' },
  { kind: 'topo', topoId: 'topo-1', name: 'Left Slab' },
];

describe('ShareSheet', () => {
  const loadGuidebookExport = jest.fn(async () => bundle);
  const submitToTabvar = jest.fn(async () => ({ id: 'submission-1', status: 'pending' }));

  beforeEach(() => {
    jest.clearAllMocks();
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);
    (useTopoStore as jest.Mock).mockReturnValue({ loadGuidebookExport, submitToTabvar });
  });

  it.each(scopes)('offers PDF export for $kind scopes', async (scope) => {
    render(<ShareSheet onClose={jest.fn()} scope={scope} />);

    await waitFor(() => expect(screen.getByText('Guidebook-style PDF')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-pdf'));

    await waitFor(() => expect(exportGuidebookPdf).toHaveBeenCalledWith(bundle));
    expect(screen.getByText('Saved: file://guidebook.pdf')).toBeTruthy();
  });

  it('surfaces runtime export errors without dismissing the sheet', async () => {
    (exportGuidebookPdf as jest.Mock).mockRejectedValueOnce(new Error('Print failed'));

    render(<ShareSheet onClose={jest.fn()} scope={scopes[0]} />);
    await waitFor(() => expect(screen.getByText('Guidebook-style PDF')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-pdf'));

    await waitFor(() => expect(screen.getByTestId('share:export-error').props.children).toBe('Print failed'));
    expect(screen.getByTestId('share-placeholder:sheet')).toBeTruthy();
  });

  it('disables Tabvar submission when Tabvar is not connected', async () => {
    render(<ShareSheet onClose={jest.fn()} scope={scopes[0]} />);

    await waitFor(() => expect(screen.getByText('Connect in Settings to submit')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:submit-tabvar'));

    expect(submitToTabvar).not.toHaveBeenCalled();
  });

  it('submits the current share scope to Tabvar when connected', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValueOnce({
      accessToken: 'tabvar-token',
      connectedAt: '2026-01-01T00:00:00.000Z',
      tabvarUserId: 'user-1',
    });

    render(<ShareSheet onClose={jest.fn()} scope={scopes[1]} />);

    await waitFor(() => expect(screen.getByText('Submit to Tabvar')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:submit-tabvar'));

    await waitFor(() => {
      expect(submitToTabvar).toHaveBeenCalledWith({ kind: 'sector', sectorId: 'sector-1' });
    });
    expect(screen.getByTestId('share:submit-tabvar-result').props.children).toBe(
      'Submitted to Tabvar (submission-1).',
    );
  });

  it('surfaces Tabvar submission errors without dismissing the sheet', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValueOnce({
      accessToken: 'tabvar-token',
      connectedAt: '2026-01-01T00:00:00.000Z',
      tabvarUserId: 'user-1',
    });
    submitToTabvar.mockRejectedValueOnce(new Error('Tabvar failed'));

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);

    await waitFor(() => expect(screen.getByText('Submit to Tabvar')).toBeTruthy());
    fireEvent.press(screen.getByTestId('share:submit-tabvar'));

    await waitFor(() =>
      expect(screen.getByTestId('share:submit-tabvar-error').props.children).toBe('Tabvar failed'),
    );
    expect(screen.getByTestId('share-placeholder:sheet')).toBeTruthy();
  });
});
