import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

export default function ExportScreen() {
  return (
    <Screen style={styles.center}>
      <Text style={styles.title}>Export is not available on web yet</Text>
      <Text style={styles.copy}>This browser MVP focuses on local import, editing, and persistence.</Text>
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
    fontWeight: '900',
    textAlign: 'center',
  },
});
