import { fireEvent, render, screen } from '@testing-library/react-native';

import { StampSizeControl } from './StampSizeControl';

describe('StampSizeControl', () => {
  it('expands size choices and applies a selected size', () => {
    const onSelectSize = jest.fn();

    render(<StampSizeControl currentSize="medium" onSelectSize={onSelectSize} />);

    fireEvent.press(screen.getByLabelText('Stamp size: Medium'));
    fireEvent.press(screen.getByLabelText('Large stamp size'));

    expect(onSelectSize).toHaveBeenCalledWith('large');
  });
});
