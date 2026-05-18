import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STAMP_SIZE_OPTIONS, type StampSize } from '@/domain/stampSizes';

export function StampSizeControl({
  currentSize,
  expanded,
  onExpandedChange,
  onSelectSize,
}: {
  currentSize: StampSize;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSelectSize: (size: StampSize) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const currentLabel = stampSizeLabel(currentSize);

  function setExpanded(next: boolean) {
    if (onExpandedChange) {
      onExpandedChange(next);
      return;
    }
    setInternalExpanded(next);
  }

  if (isExpanded) {
    return (
      <View accessibilityLabel="Stamp size choices" style={styles.expanded}>
        {STAMP_SIZE_OPTIONS.map((size) => {
          const isSelected = currentSize === size;
          const label = stampSizeLabel(size);
          return (
            <Pressable
              accessibilityLabel={`${label} stamp size`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={size}
              onPress={() => {
                onSelectSize(size);
                setExpanded(false);
              }}
              style={({ pressed }) => [
                styles.sizeButton,
                isSelected && styles.selectedSizeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.sizeButtonText, isSelected && styles.selectedSizeButtonText]}>
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
      accessibilityLabel={`Stamp size: ${currentLabel}`}
      accessibilityRole="button"
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [styles.collapsed, pressed && styles.pressed]}
    >
      <Text style={styles.currentSize}>{currentLabel[0]}</Text>
      <Text style={styles.collapsedLabel}>Stamp size</Text>
      <Text style={styles.chevron}>^</Text>
    </Pressable>
  );
}

function stampSizeLabel(size: StampSize) {
  switch (size) {
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
    fontWeight: '800',
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
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collapsedLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  currentSize: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
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
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  selectedSizeButton: {
    backgroundColor: '#F2B58F',
  },
  selectedSizeButtonText: {
    color: '#1B1B1F',
  },
  sizeButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sizeButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
  },
});
