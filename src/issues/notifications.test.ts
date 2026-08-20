jest.mock('expo-notifications', () => ({
  dismissNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { showIssueUploadNotification } from './notifications';

describe('showIssueUploadNotification', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    jest.clearAllMocks();
  });

  it('does not prompt for notification permission', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    await expect(showIssueUploadNotification(2)).resolves.toBeUndefined();

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules a notification when permission is already granted', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('note-1');

    await expect(showIssueUploadNotification(1)).resolves.toBe('note-1');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});
