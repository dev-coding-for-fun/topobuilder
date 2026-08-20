import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing without a message', () => {
    render(<Toast onDismiss={jest.fn()} />);
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('dismisses on press and after the timeout', () => {
    const onDismiss = jest.fn();
    render(<Toast message="Couldn't reach TABVAR." onDismiss={onDismiss} />);

    expect(screen.getByTestId('toast')).toBeTruthy();
    fireEvent.press(screen.getByTestId('toast'));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
