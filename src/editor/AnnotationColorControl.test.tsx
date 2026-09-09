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

  it('uses target-specific accessibility labels', () => {
    const onSelectColor = jest.fn();

    render(
      <AnnotationColorControl
        currentColor="#FACC15"
        onSelectColor={onSelectColor}
        swatches={ANNOTATION_COLOUR_PALETTE}
        targetLabel="Line colour"
      />,
    );

    fireEvent.press(screen.getByLabelText('Line colour: Yellow'));
    fireEvent.press(screen.getByLabelText('Blue line colour'));

    expect(onSelectColor).toHaveBeenCalledWith('#2563EB');
  });

  it('renders swatches in a 2-row grid of 5 swatches each when expanded', () => {
    render(
      <AnnotationColorControl
        currentColor="#111827"
        expanded
        onSelectColor={jest.fn()}
        swatches={ANNOTATION_COLOUR_PALETTE}
      />,
    );

    const choicesContainer = screen.getByLabelText('Annotation colour choices');
    expect(choicesContainer.props.children).toHaveLength(2);
    expect(choicesContainer.props.children[0].props.children).toHaveLength(5);
    expect(choicesContainer.props.children[1].props.children).toHaveLength(5);
  });
});
