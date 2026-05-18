import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ToolPalette } from './ToolPalette';

describe('ToolPalette', () => {
  it('selects editor tools', () => {
    const onSelectTool = jest.fn();

    render(<ToolPalette selectedTool="bolt" onSelectTool={onSelectTool} />);
    fireEvent.press(screen.getByLabelText('Anchor with rappel'));

    expect(onSelectTool).toHaveBeenCalledWith('rappel');
  });

  it('tints stamp submenu icons with current stamp colours', () => {
    render(
      <ToolPalette
        onSelectTool={jest.fn()}
        selectedTool="bolt"
        stampColors={{
          belay: '#06B6D4',
          bolt: '#EC4899',
          rappel: '#2563EB',
          start: '#84CC16',
        }}
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('rappel-submenu-icon').props.style).backgroundColor).toBe(
      '#2563EB',
    );
    expect(StyleSheet.flatten(screen.getByTestId('belay-submenu-icon').props.style).backgroundColor).toBe(
      '#06B6D4',
    );
    expect(StyleSheet.flatten(screen.getByTestId('start-submenu-icon').props.style).backgroundColor).toBe(
      '#84CC16',
    );
  });
});
