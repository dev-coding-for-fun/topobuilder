import { fireEvent, render, screen } from '@testing-library/react-native';

import { LineWeightControl } from './LineWeightControl';

describe('LineWeightControl', () => {
  it('shows the current line weight and selects another option', () => {
    const onSelectWeight = jest.fn();

    render(<LineWeightControl currentWeight="medium" onSelectWeight={onSelectWeight} />);

    fireEvent.press(screen.getByLabelText('Line weight: Medium'));
    fireEvent.press(screen.getByLabelText('Large line weight'));

    expect(onSelectWeight).toHaveBeenCalledWith('large');
  });
});
