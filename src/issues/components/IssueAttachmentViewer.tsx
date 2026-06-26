import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IssueAttachment } from '@/storage/repos/tabvarIssuesRepo';
import { interStyle } from '@/ui/fonts';

type Props = {
  attachment?: IssueAttachment;
  onClose: () => void;
};

export function IssueAttachmentViewer({ attachment, onClose }: Props) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} visible={Boolean(attachment)}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.title}>
            {attachment?.name ?? 'Attachment'}
          </Text>
          <Pressable
            accessibilityLabel="Close attachment"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
            testID="issues:attachment-viewer:close"
          >
            <Ionicons color="#FFFFFF" name="close" size={24} />
          </Pressable>
        </View>

        {attachment ? (
          <Image
            accessibilityLabel={attachment.name}
            resizeMode="contain"
            source={{ uri: attachment.url }}
            style={styles.image}
            testID="issues:attachment-viewer:image"
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  close: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closePressed: {
    opacity: 0.7,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  screen: {
    backgroundColor: '#020617',
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
    ...interStyle('800'),
  },
});
