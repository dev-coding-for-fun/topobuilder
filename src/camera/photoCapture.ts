import * as ImagePicker from 'expo-image-picker';

export async function requestPhotoLibraryPermission() {
  return true;
}

export async function pickPhotoFromLibrary() {
  return pickPhotoWithOptions(1);
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
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality,
  });

  if (result.canceled || !result.assets[0]) {
    return undefined;
  }

  return result.assets[0];
}
