import * as ImagePicker from 'expo-image-picker';

export async function requestPhotoLibraryPermission() {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
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
  const result = await ImagePicker.requestCameraPermissionsAsync();
  return result.granted;
}

export function canCaptureIssuePhotoWithCamera() {
  return true;
}

const ISSUE_PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
};

export async function pickIssuePhotoFromLibrary() {
  const hasPermission = await requestPhotoLibraryPermission();
  if (!hasPermission) {
    throw new Error('Photo library permission is required to attach a photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync(ISSUE_PHOTO_OPTIONS);
  if (result.canceled || !result.assets[0]) {
    return undefined;
  }

  return result.assets[0];
}

export async function takeIssuePhotoWithCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to attach a photo.');
  }

  const result = await ImagePicker.launchCameraAsync(ISSUE_PHOTO_OPTIONS);
  if (result.canceled || !result.assets[0]) {
    return undefined;
  }

  return result.assets[0];
}
