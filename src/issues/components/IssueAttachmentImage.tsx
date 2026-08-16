import { Image, Platform, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  accessibilityIgnoresInvertColors?: boolean;
  accessibilityLabel?: string;
  imageStyle: StyleProp<ImageStyle>;
  resizeMode: 'contain' | 'cover';
  testID: string;
  uri: string;
};

export function IssueAttachmentImage({
  accessibilityIgnoresInvertColors,
  accessibilityLabel,
  imageStyle,
  resizeMode,
  testID,
  uri,
}: Props) {
  if (Platform.OS === 'web') {
    return (
      <img
        alt={accessibilityLabel ?? ''}
        crossOrigin="anonymous"
        data-testid={testID}
        src={uri}
        style={
          resizeMode === 'cover'
            ? { height: '100%', objectFit: 'cover', width: '100%' }
            : { flex: 1, objectFit: 'contain', width: '100%' }
        }
      />
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
      accessibilityLabel={accessibilityLabel}
      resizeMode={resizeMode}
      source={{ uri }}
      style={imageStyle}
      testID={testID}
    />
  );
}
