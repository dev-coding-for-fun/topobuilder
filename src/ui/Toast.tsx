import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { interStyle } from '@/ui/fonts';

const DEFAULT_DURATION_MS = 4000;

type Props = {
  message?: string;
  onDismiss: () => void;
  durationMs?: number;
  testID?: string;
};

export function Toast({
  message,
  onDismiss,
  durationMs = DEFAULT_DURATION_MS,
  testID = 'toast',
}: Props) {
  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs, message, onDismiss]);

  if (!message) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Pressable
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        onPress={onDismiss}
        style={styles.toast}
        testID={testID}
      >
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
    top: 52,
    zIndex: 100,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    ...interStyle('700'),
  },
  toast: {
    backgroundColor: '#111827',
    borderRadius: 12,
    elevation: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
});
