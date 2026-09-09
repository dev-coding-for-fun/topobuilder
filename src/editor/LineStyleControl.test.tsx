import { fireEvent, render, screen } from '@testing-library/react-native';

import { LineStyleControl } from './LineStyleControl';

describe('LineStyleControl', () => {
  it('shows the current line style without text label and selects another option', () => {
    const onSelectStyle = jest.fn();

    render(<LineStyleControl currentStyle="solid" onSelectStyle={onSelectStyle} />);

    // Collapsed trigger has accessibility label but no visible text label
    const trigger = screen.getByLabelText('Line style: Solid');
    expect(trigger).toBeTruthy();
    expect(screen.queryByText('Style')).toBeNull();
    expect(screen.queryByText('Line style')).toBeNull();

    // Tap to expand
    fireEvent.press(trigger);

    // Choices are visible
    expect(screen.getByLabelText('Solid line style')).toBeTruthy();
    expect(screen.getByLabelText('Dashed line style')).toBeTruthy();
    expect(screen.getByLabelText('Dots line style')).toBeTruthy();

    // Select dashed
    fireEvent.press(screen.getByLabelText('Dashed line style'));
    expect(onSelectStyle).toHaveBeenCalledWith('dashed');
  });

  it('respects controlled expanded state and calls onExpandedChange', () => {
    const onExpandedChange = jest.fn();
    const onSelectStyle = jest.fn();

    const { rerender } = render(
      <LineStyleControl
        currentStyle="dotted"
        expanded={false}
        onExpandedChange={onExpandedChange}
        onSelectStyle={onSelectStyle}
      />,
    );

    fireEvent.press(screen.getByLabelText('Line style: Dots'));
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    rerender(
      <LineStyleControl
        currentStyle="dotted"
        expanded={true}
        onExpandedChange={onExpandedChange}
        onSelectStyle={onSelectStyle}
      />,
    );

    expect(screen.getByLabelText('Line style choices')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Solid line style'));
    expect(onSelectStyle).toHaveBeenCalledWith('solid');
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });
});
