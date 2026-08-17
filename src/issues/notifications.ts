import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function showIssueUploadNotification(count: number): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  await ensureNotificationPermission();
  return Notifications.scheduleNotificationAsync({
    content: {
      body: `Uploading ${count} issue${count === 1 ? '' : 's'} and any pending photos.`,
      title: 'Uploading issues',
    },
    trigger: null,
  });
}

export async function dismissIssueUploadNotification(identifier?: string): Promise<void> {
  if (!identifier || Platform.OS === 'web') return;
  await Notifications.dismissNotificationAsync(identifier).catch(() => undefined);
}

async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return;
  await Notifications.requestPermissionsAsync();
}
