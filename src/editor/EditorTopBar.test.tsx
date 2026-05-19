import { fireEvent, render, screen } from '@testing-library/react-native';

import { EditorTopBar } from './EditorTopBar';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('EditorTopBar', () => {
  const baseProps = {
    onBack: jest.fn(),
    onRedo: jest.fn(),
    onUndo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the removed checkmark save action', () => {
    render(<EditorTopBar {...baseProps} />);

    expect(screen.queryByLabelText('Save')).toBeNull();
    expect(screen.queryByLabelText('Delete selected annotation')).toBeNull();
  });

  it('renders contextual delete when an annotation is selected', () => {
    const onDelete = jest.fn();
    render(<EditorTopBar {...baseProps} canDelete onDelete={onDelete} />);

    fireEvent.press(screen.getByLabelText('Delete selected annotation'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Save')).toBeNull();
  });
});
