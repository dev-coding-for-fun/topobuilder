import { render, screen } from '@testing-library/react-native';

import type { TopoWithRoutes } from '@/domain/types';

import { TopoRow } from './TopoRow';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const baseTopo: TopoWithRoutes = {
  id: 'topo-1',
  sectorId: 'sector-1',
  name: 'Main Wall',
  photoUri: undefined,
  photoWidth: undefined,
  photoHeight: undefined,
  tabvarDirty: true,
  sortOrder: 0,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
  routes: [],
};

function renderRow(topo: TopoWithRoutes) {
  render(<TopoRow onMenu={jest.fn()} onOpen={jest.fn()} onShare={jest.fn()} topo={topo} />);
}

describe('TopoRow', () => {
  it('renders a photo thumbnail when the topo has a photo', () => {
    renderRow({ ...baseTopo, photoUri: 'file://topo-photo.jpg' });

    expect(screen.getByTestId('crag-detail:topo:topo-1:thumb-image').props.source).toEqual({
      uri: 'file://topo-photo.jpg',
    });
  });

  it('keeps the placeholder thumbnail when the topo has no photo', () => {
    renderRow(baseTopo);

    expect(screen.queryByTestId('crag-detail:topo:topo-1:thumb-image')).toBeNull();
    expect(screen.getByTestId('crag-detail:topo:topo-1:thumb')).toBeTruthy();
  });
});
