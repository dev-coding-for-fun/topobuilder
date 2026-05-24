import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';
import { Screen } from '@/ui/Screen';

export default function CameraScreen() {
  return (
    <Screen style={styles.center}>
      <Text style={styles.title}>Camera capture is mobile-only</Text>
      <Text style={styles.copy}>Use photo import on desktop/web builds.</Text>
      <Button label="Back to project" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  copy: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  title: {
    color: '#111827',
    fontSize: 24,
    ...interStyle('900'),
    textAlign: 'center',
  },
});
