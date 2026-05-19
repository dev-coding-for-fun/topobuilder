import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RouteMarkerNumber } from '@/domain/routeMarkerNumbers';

export function RouteMarkerNumberControl({
  accessibilityLabel,
  onChangeValue,
  onDecrement,
  onEditingChange,
  onIncrement,
  value,
}: {
  accessibilityLabel: string;
  onChangeValue: (value: RouteMarkerNumber) => void;
  onDecrement: () => void;
  onEditingChange?: (editing: boolean) => void;
  onIncrement: () => void;
  value: RouteMarkerNumber;
}) {
  const displayValue = value === null ? '' : String(value);

  function handleChangeText(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      onChangeValue(null);
      return;
    }

    if (!/^\d{1,2}$/.test(trimmed)) {
      return;
    }

    const next = Number(trimmed);
    if (next >= 1 && next <= 99) {
      onChangeValue(next);
    }
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={styles.control}>
      <Pressable
        accessibilityLabel={`${accessibilityLabel}: decrement`}
        accessibilityRole="button"
        onPress={onDecrement}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepText}>-</Text>
      </Pressable>
      <TextInput
        accessibilityLabel={`${accessibilityLabel}: value`}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={handleChangeText}
        onBlur={() => onEditingChange?.(false)}
        onFocus={() => onEditingChange?.(true)}
        selectTextOnFocus
        style={styles.input}
        value={displayValue}
      />
      <Pressable
        accessibilityLabel={`${accessibilityLabel}: increment`}
        accessibilityRole="button"
        onPress={onIncrement}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  input: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    height: 24,
    minWidth: 28,
    padding: 0,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  stepButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  stepText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
});
