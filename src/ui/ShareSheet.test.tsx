import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GuidebookExportBundle } from '@/domain/types';
import { exportGuidebookPdf } from '@/export/pdf';
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useTopoStore as jest.Mock).mockReturnValue({ loadGuidebookExport });
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
});
