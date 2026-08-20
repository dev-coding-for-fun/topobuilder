import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  canCaptureIssuePhotoWithCamera,
  pickIssuePhotoFromLibrary,
  takeIssuePhotoWithCamera,
} from '@/camera/photoCapture';
import { issuePhotoFromPickerAsset, type IssuePhotoUpload } from '@/issues/attachments';
import { issueColors } from '@/issues/colors';
import { interStyle } from '@/ui/fonts';

export type IssueAttachmentPreview = {
  key: string;
  uri: string;
  name: string;
  mimeType?: string;
  testID: string;
  onPress?: () => void;
  onRemove?: () => void;
};

type Props = {
  busy?: boolean;
  photos: IssueAttachmentPreview[];
  testID: string;
  onAddPhoto: (photo: IssuePhotoUpload) => void | Promise<void>;
  onError: (message: string) => void;
};

export function IssueAttachmentsField({ busy = false, photos, testID, onAddPhoto, onError }: Props) {
  const [picking, setPicking] = useState(false);
  const disabled = busy || picking;

  async function addPhoto(source: 'camera' | 'gallery') {
    if (disabled) return;
    setPicking(true);
    try {
      const asset =
        source === 'camera' ? await takeIssuePhotoWithCamera() : await pickIssuePhotoFromLibrary();
      if (!asset) return;
      await onAddPhoto(issuePhotoFromPickerAsset(asset));
    } catch (addError) {
      onError(addError instanceof Error ? addError.message : 'Could not add this photo.');
    } finally {
      setPicking(false);
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Attachments</Text>
      <View style={styles.attachmentGrid}>
        {photos.map((photo, index) => (
          <View key={photo.key} style={styles.attachmentCell}>
            {photo.onPress ? (
              <Pressable
                accessibilityLabel={`Open attachment ${index + 1}`}
                accessibilityRole="button"
                onPress={photo.onPress}
                style={({ pressed }) => [styles.attachmentTile, pressed && styles.attachmentPressed]}
                testID={photo.testID}
              >
                <AttachmentPreviewImage photo={photo} />
              </Pressable>
            ) : (
              <View style={styles.attachmentTile} testID={photo.testID}>
                <AttachmentPreviewImage photo={photo} />
              </View>
            )}
            {photo.onRemove ? (
              <Pressable
                accessibilityLabel={`Remove attachment ${index + 1}`}
                accessibilityRole="button"
                onPress={photo.onRemove}
                style={({ pressed }) => [styles.removeButton, pressed && styles.attachmentPressed]}
                testID={`${photo.testID}:remove`}
              >
                <Ionicons color={issueColors.ink} name="close" size={16} />
              </Pressable>
            ) : null}
          </View>
        ))}
        <View style={styles.attachmentCell}>
          <AddAttachmentTile
            busy={disabled}
            testID={`${testID}:add-attachment`}
            onCamera={() => {
              void addPhoto('camera');
            }}
            onGallery={() => {
              void addPhoto('gallery');
            }}
          />
        </View>
      </View>
    </View>
  );
}

function AttachmentPreviewImage({ photo }: { photo: IssueAttachmentPreview }) {
  if (photo.mimeType && !photo.mimeType.startsWith('image/')) {
    return (
      <View style={styles.attachmentFallback}>
          <Ionicons color={issueColors.muted} name="document-outline" size={19} />
      </View>
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel={photo.name}
      contentFit="cover"
      recyclingKey={photo.uri}
      source={{ uri: photo.uri }}
      style={styles.attachmentImage}
      testID={`${photo.testID}:image`}
    />
  );
}

function AddAttachmentTile({
  busy,
  onCamera,
  onGallery,
  testID,
}: {
  busy: boolean;
  onCamera: () => void;
  onGallery: () => void;
  testID: string;
}) {
  const showCamera = canCaptureIssuePhotoWithCamera();

  return (
    <View style={[styles.attachmentTile, busy && styles.attachmentBusy]} testID={testID}>
      {showCamera ? (
        <Pressable
          accessibilityLabel="Take photo"
          accessibilityRole="button"
          disabled={busy}
          onPress={onCamera}
          style={({ pressed }) => [styles.addHalf, pressed && styles.attachmentPressed]}
          testID={`${testID}:camera`}
        >
          <Ionicons color={issueColors.muted} name="camera-outline" size={19} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel="Choose from gallery"
        accessibilityRole="button"
        disabled={busy}
        onPress={onGallery}
        style={({ pressed }) => [
          styles.addHalf,
          showCamera ? styles.addHalfBottom : styles.addHalfFill,
          pressed && styles.attachmentPressed,
        ]}
        testID={`${testID}:gallery`}
      >
        <Ionicons color={issueColors.muted} name="images-outline" size={19} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addHalf: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  addHalfBottom: {
    borderTopColor: issueColors.fillBorder,
    borderTopWidth: 1,
  },
  addHalfFill: {
    flex: 1,
  },
  attachmentBusy: {
    opacity: 0.55,
  },
  attachmentCell: {
    aspectRatio: 1,
    padding: 3,
    width: '29%',
  },
  attachmentFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },
  attachmentImage: {
    height: '100%',
    width: '100%',
  },
  attachmentPressed: {
    opacity: 0.7,
  },
  attachmentTile: {
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  field: {
    gap: 8,
  },
  label: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: issueColors.card,
    borderColor: issueColors.fillBorder,
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 26,
  },
});
