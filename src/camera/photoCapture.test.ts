jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

import * as ImagePicker from 'expo-image-picker';

import {
  pickIssuePhotoFromLibrary,
  pickPhotoFromLibrary,
  takeIssuePhotoWithCamera,
} from './photoCapture';

const asset = {
  uri: 'file:///photo.jpg',
  width: 800,
  height: 600,
};

describe('photoCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [asset],
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [asset],
    });
  });

  it('opens the library picker without a prior permission prompt', async () => {
    await expect(pickPhotoFromLibrary()).resolves.toEqual(asset);

    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 1,
    });
  });

  it('opens the issue library picker without a prior permission prompt', async () => {
    await expect(pickIssuePhotoFromLibrary()).resolves.toEqual(asset);

    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.8,
    });
  });

  it('opens the issue camera without a prior permission prompt', async () => {
    await expect(takeIssuePhotoWithCamera()).resolves.toEqual(asset);

    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      quality: 0.8,
    });
  });

  it('maps camera permission failures to a user-facing error', async () => {
    (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValue(
      new Error('User rejected permissions'),
    );

    await expect(takeIssuePhotoWithCamera()).rejects.toThrow(
      'Camera permission is required to attach a photo.',
    );
  });
});
