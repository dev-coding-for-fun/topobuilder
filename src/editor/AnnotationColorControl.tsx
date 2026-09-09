import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AnnotationColourSwatch } from '@/domain/annotationColours';
import { interStyle } from '@/ui/fonts';

const SWATCHES_PER_ROW = 5;

function chunkSwatches(items: AnnotationColourSwatch[], size: number): AnnotationColourSwatch[][] {
  const chunks: AnnotationColourSwatch[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function AnnotationColorControl({
  currentColor,
  expanded,
  onExpandedChange,
  onSelectColor,
  swatches,
  targetLabel = 'Annotation colour',
  visibleLabel = targetLabel,
}: {
  currentColor: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSelectColor: (color: string) => void;
  swatches: AnnotationColourSwatch[];
  targetLabel?: string;
  visibleLabel?: string;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const currentSwatch = swatches.find((swatch) => swatch.value.toUpperCase() === currentColor.toUpperCase());

  function setExpanded(next: boolean) {
    if (onExpandedChange) {
      onExpandedChange(next);
      return;
    }
    setInternalExpanded(next);
  }

  if (isExpanded) {
    const swatchRows = chunkSwatches(swatches, SWATCHES_PER_ROW);

    return (
      <View accessibilityLabel={`${targetLabel} choices`} style={styles.expanded}>
        {swatchRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((swatch) => {
              const isSelected = swatch.value.toUpperCase() === currentColor.toUpperCase();
              return (
                <Pressable
                  accessibilityLabel={`${swatch.label} ${targetLabel.toLowerCase()}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={swatch.id}
                  onPress={() => {
                    onSelectColor(swatch.value);
                    setExpanded(false);
                  }}
                  style={({ pressed }) => [
                    styles.swatchButton,
                    isSelected && styles.selectedSwatchButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: swatch.value },
                      swatch.value.toUpperCase() === '#F8FAFC' ? styles.lightSwatch : null,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${targetLabel}${currentSwatch ? `: ${currentSwatch.label}` : ''}`}
      accessibilityRole="button"
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [styles.collapsed, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.currentSwatch,
          { backgroundColor: currentColor },
          currentColor.toUpperCase() === '#F8FAFC' && styles.lightSwatch,
        ]}
      />
      <Text style={styles.collapsedLabel}>{visibleLabel}</Text>
      <Text style={styles.chevron}>^</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collapsedLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    ...interStyle('700'),
  },
  chevron: {
    color: '#F8FAFC',
    fontSize: 13,
    ...interStyle('800'),
    lineHeight: 14,
  },
  currentSwatch: {
    borderColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    width: 16,
  },
  expanded: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'column',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gridRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  lightSwatch: {
    borderColor: '#94A3B8',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  selectedSwatchButton: {
    backgroundColor: '#F2B58F',
  },
  swatch: {
    borderColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    width: 20,
  },
  swatchButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
