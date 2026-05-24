import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LINE_WEIGHT_OPTIONS, type LineWeight } from '@/domain/lineWeights';
import { interStyle } from '@/ui/fonts';

export function LineWeightControl({
  currentWeight,
  expanded,
  onExpandedChange,
  onSelectWeight,
  visibleLabel = 'Weight',
}: {
  currentWeight: LineWeight;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSelectWeight: (weight: LineWeight) => void;
  visibleLabel?: string;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const currentLabel = lineWeightLabel(currentWeight);

  function setExpanded(next: boolean) {
    if (onExpandedChange) {
      onExpandedChange(next);
      return;
    }
    setInternalExpanded(next);
  }

  if (isExpanded) {
    return (
      <View accessibilityLabel="Line weight choices" style={styles.expanded}>
        {LINE_WEIGHT_OPTIONS.map((weight) => {
          const isSelected = currentWeight === weight;
          const label = lineWeightLabel(weight);
          return (
            <Pressable
              accessibilityLabel={`${label} line weight`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={weight}
              onPress={() => {
                onSelectWeight(weight);
                setExpanded(false);
              }}
              style={({ pressed }) => [
                styles.weightButton,
                isSelected && styles.selectedWeightButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.weightButtonText, isSelected && styles.selectedWeightButtonText]}>
                {label[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`Line weight: ${currentLabel}`}
      accessibilityRole="button"
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [styles.collapsed, pressed && styles.pressed]}
    >
      <Text style={styles.currentWeight}>{currentLabel[0]}</Text>
      <Text style={styles.collapsedLabel}>{visibleLabel}</Text>
      <Text style={styles.chevron}>^</Text>
    </Pressable>
  );
}

function lineWeightLabel(weight: LineWeight) {
  switch (weight) {
    case 'small':
      return 'Small';
    case 'medium':
      return 'Medium';
    case 'large':
      return 'Large';
  }
}

const styles = StyleSheet.create({
  chevron: {
    color: '#F8FAFC',
    fontSize: 13,
    ...interStyle('800'),
    lineHeight: 14,
  },
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
  currentWeight: {
    color: '#F8FAFC',
    fontSize: 14,
    ...interStyle('900'),
    minWidth: 14,
    textAlign: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  selectedWeightButton: {
    backgroundColor: '#F2B58F',
  },
  selectedWeightButtonText: {
    color: '#1B1B1F',
  },
  weightButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  weightButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    ...interStyle('900'),
  },
});
