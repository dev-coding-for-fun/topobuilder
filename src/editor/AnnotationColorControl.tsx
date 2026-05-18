import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AnnotationColourSwatch } from '@/domain/annotationColours';

export function AnnotationColorControl({
  currentColor,
  onSelectColor,
  swatches,
  targetLabel = 'Annotation colour',
}: {
  currentColor: string;
  onSelectColor: (color: string) => void;
  swatches: AnnotationColourSwatch[];
  targetLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const currentSwatch = swatches.find((swatch) => swatch.value.toUpperCase() === currentColor.toUpperCase());

  if (expanded) {
    return (
      <View accessibilityLabel={`${targetLabel} choices`} style={styles.expanded}>
        {swatches.map((swatch) => {
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
                  swatch.value.toUpperCase() === '#F8FAFC' && styles.lightSwatch,
                ]}
              />
            </Pressable>
          );
        })}
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
      <Text style={styles.collapsedLabel}>{targetLabel}</Text>
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
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collapsedLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  chevron: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
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
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
