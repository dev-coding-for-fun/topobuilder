import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  testID?: string;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  destructive = true,
  onCancel,
  onConfirm,
  testID,
}: Props) {
  return (
    <BottomSheet onClose={onCancel} scrollable={false} testID={testID} title={title} visible={visible}>
      <View style={styles.body}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onCancel} variant="secondary" />
          <Button
            label={confirmLabel}
            onPress={() => {
              void onConfirm();
            }}
            testID={`${testID ?? 'confirm-sheet'}:confirm`}
            variant={destructive ? 'danger' : 'primary'}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  body: {
    gap: 14,
    paddingBottom: 8,
    paddingTop: 4,
  },
  message: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    ...interStyle('400'),
  },
});
