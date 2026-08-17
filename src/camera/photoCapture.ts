import * as ImagePicker from 'expo-image-picker';

export async function requestPhotoLibraryPermission() {
  return true;
}

export async function pickPhotoFromLibrary() {
  const hasPermission = await requestPhotoLibraryPermission();
  if (!hasPermission) {
    return undefined;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return undefined;
  }

  return result.assets[0];
}

export async function requestCameraPermission() {
  return false;
}

export function canCaptureIssuePhotoWithCamera() {
  return false;
}

export async function pickIssuePhotoFromLibrary() {
  return pickPhotoWithOptions(0.8);
}

export async function takeIssuePhotoWithCamera() {
  return undefined;
}

async function pickPhotoWithOptions(quality: number) {
  const hasPermission = await requestPhotoLibraryPermission();
  if (!hasPermission) {
    throw new Error('Photo library permission is required to attach a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality,
  });

  if (result.canceled || !result.assets[0]) {
    return undefined;
  }

  return result.assets[0];
}
