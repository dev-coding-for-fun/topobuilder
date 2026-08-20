import * as ImagePicker from 'expo-image-picker';

export async function requestPhotoLibraryPermission() {
  const result = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (result.granted) return true;
  return (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;
}

export async function pickPhotoFromLibrary() {
  const result = await launchLibrary({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (!result) return undefined;
  return result;
}

export async function requestCameraPermission() {
  const existing = await ImagePicker.getCameraPermissionsAsync();
  if (existing.granted) return true;
  return (await ImagePicker.requestCameraPermissionsAsync()).granted;
}

export function canCaptureIssuePhotoWithCamera() {
  return true;
}

const ISSUE_PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
};

export async function pickIssuePhotoFromLibrary() {
  const result = await launchLibrary(ISSUE_PHOTO_OPTIONS);
  if (result === undefined) return undefined;
  return result;
}

export async function takeIssuePhotoWithCamera() {
  try {
    const result = await ImagePicker.launchCameraAsync(ISSUE_PHOTO_OPTIONS);
    if (result.canceled || !result.assets[0]) {
      return undefined;
    }
    return result.assets[0];
  } catch (error) {
    throw permissionError(error, 'Camera permission is required to attach a photo.');
  }
}

async function launchLibrary(options: ImagePicker.ImagePickerOptions) {
  try {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) {
      return undefined;
    }
    return result.assets[0];
  } catch (error) {
    throw permissionError(error, 'Photo library permission is required to attach a photo.');
  }
}

function permissionError(error: unknown, message: string) {
  if (error instanceof Error && /permission|denied|rejected/i.test(error.message)) {
    return new Error(message);
  }
  return error;
}
