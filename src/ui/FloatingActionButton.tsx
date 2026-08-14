import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { interStyle } from '@/ui/fonts';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

export function FloatingActionButton({ label, onPress, disabled, testID }: Props) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Ionicons color="#FFFFFF" name="add" size={28} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 999,
    bottom: 28,
    elevation: 6,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    ...interStyle('700'),
  },
  pressed: {
    opacity: 0.85,
  },
});
