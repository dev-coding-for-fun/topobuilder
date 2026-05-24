import * as ImagePicker from 'expo-image-picker';
import { VisionCamera } from 'react-native-vision-camera';

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
  return VisionCamera.requestCameraPermission();
}
