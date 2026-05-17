import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToolPalette } from './ToolPalette';

describe('ToolPalette', () => {
  it('selects editor tools', () => {
    const onSelectTool = jest.fn();

    render(<ToolPalette selectedTool="bolt" onSelectTool={onSelectTool} />);
    fireEvent.press(screen.getByLabelText('Anchor with rappel'));

    expect(onSelectTool).toHaveBeenCalledWith('rappel');
  });
});
