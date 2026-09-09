import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  LINE_STYLE_OPTIONS,
  lineStyleLabel,
  type LineStyle,
} from '@/domain/lineStyles';
import { interStyle } from '@/ui/fonts';

export function LineStyleControl({
  currentStyle,
  expanded,
  onExpandedChange,
  onSelectStyle,
}: {
  currentStyle: LineStyle;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSelectStyle: (style: LineStyle) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const currentLabel = lineStyleLabel(currentStyle);

  function setExpanded(next: boolean) {
    if (onExpandedChange) {
      onExpandedChange(next);
      return;
    }
    setInternalExpanded(next);
  }

  if (isExpanded) {
    return (
      <View accessibilityLabel="Line style choices" style={styles.expanded}>
        {LINE_STYLE_OPTIONS.map((style) => {
          const isSelected = currentStyle === style;
          const label = lineStyleLabel(style);
          return (
            <Pressable
              accessibilityLabel={`${label} line style`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={style}
              onPress={() => {
                onSelectStyle(style);
                setExpanded(false);
              }}
              style={({ pressed }) => [
                styles.styleButton,
                isSelected && styles.selectedStyleButton,
                pressed && styles.pressed,
              ]}
            >
              <LineStyleIcon color={isSelected ? '#1B1B1F' : '#F8FAFC'} style={style} />
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`Line style: ${currentLabel}`}
      accessibilityRole="button"
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [styles.collapsed, pressed && styles.pressed]}
    >
      <LineStyleIcon color="#F8FAFC" style={currentStyle} />
      <Text style={styles.chevron}>^</Text>
    </Pressable>
  );
}

function LineStyleIcon({ color, style }: { color: string; style: LineStyle }) {
  if (style === 'solid') {
    return (
      <View style={styles.iconContainer}>
        <View style={[styles.solidLine, { backgroundColor: color }]} />
      </View>
    );
  }

  if (style === 'dashed') {
    return (
      <View style={styles.iconContainer}>
        <View style={styles.dashRow}>
          <View style={[styles.dashSegment, { backgroundColor: color }]} />
          <View style={[styles.dashSegment, { backgroundColor: color }]} />
          <View style={[styles.dashSegment, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.iconContainer}>
      <View style={styles.dotRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
    </View>
  );
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
  dashRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2.5,
  },
  dashSegment: {
    borderRadius: 1,
    height: 2.5,
    width: 5,
  },
  dot: {
    borderRadius: 1.5,
    height: 3,
    width: 3,
  },
  dotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
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
  iconContainer: {
    alignItems: 'center',
    height: 16,
    justifyContent: 'center',
    width: 22,
  },
  pressed: {
    opacity: 0.75,
  },
  selectedStyleButton: {
    backgroundColor: '#F2B58F',
  },
  solidLine: {
    borderRadius: 1.5,
    height: 2.5,
    width: 20,
  },
  styleButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
