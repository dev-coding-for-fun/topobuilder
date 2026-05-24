import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  useCameraDevice,
  usePhotoOutput,
} from 'react-native-vision-camera';

import { requestCameraPermission } from '@/camera/photoCapture';
import { useTopoStore } from '@/state/TopoStore';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';
import { Screen } from '@/ui/Screen';

export default function CameraScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { addPhotoFromUri } = useTopoStore();
  const camera = useRef<CameraRef>(null);
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    requestCameraPermission().then(setHasPermission);
  }, []);

  async function handleCapture() {
    if (!projectId || !photoOutput) {
      return;
    }

    setIsCapturing(true);
    try {
      const file = await photoOutput.capturePhotoToFile({}, {});
      const uri = file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`;
      const size = await getImageSize(uri);
      await addPhotoFromUri({ topoId: projectId, uri, ...size });
      router.back();
    } finally {
      setIsCapturing(false);
    }
  }

  if (!hasPermission) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.title}>Camera permission needed</Text>
        <Text style={styles.copy}>Grant camera access to capture a rock face photo.</Text>
        <Button label="Try again" onPress={() => requestCameraPermission().then(setHasPermission)} />
      </Screen>
    );
  }

  if (!device) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.title}>No back camera found</Text>
      </Screen>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <Camera
        device={device}
        isActive
        outputs={[photoOutput]}
        ref={camera}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.controls}>
        <Button label="Cancel" onPress={() => router.back()} variant="secondary" />
        <Button
          disabled={isCapturing}
          label={isCapturing ? 'Capturing...' : 'Capture'}
          onPress={handleCapture}
        />
      </View>
    </View>
  );
}

function getImageSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

const styles = StyleSheet.create({
  cameraScreen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  center: {
    alignItems: 'center',
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  controls: {
    bottom: 36,
    flexDirection: 'row',
    gap: 12,
    left: 18,
    position: 'absolute',
    right: 18,
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
