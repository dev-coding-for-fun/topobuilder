import { fireEvent, render, screen } from '@testing-library/react-native';

import { ANNOTATION_COLOUR_PALETTE } from '@/domain/annotationColours';

import { AnnotationColorControl } from './AnnotationColorControl';

describe('AnnotationColorControl', () => {
  it('expands swatches and applies a selected colour', () => {
    const onSelectColor = jest.fn();

    render(
      <AnnotationColorControl
        currentColor="#111827"
        onSelectColor={onSelectColor}
        swatches={ANNOTATION_COLOUR_PALETTE}
      />,
    );

    fireEvent.press(screen.getByLabelText('Annotation colour: Ink'));
    fireEvent.press(screen.getByLabelText('Red annotation colour'));

    expect(onSelectColor).toHaveBeenCalledWith('#DC2626');
    expect(screen.getByLabelText('Annotation colour: Ink')).toBeTruthy();
  });
});
