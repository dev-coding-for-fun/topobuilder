import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

type Props = {
  visible: boolean;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void | Promise<void>;
  helperText?: string;
  testID?: string;
};

export function NameEntrySheet({
  visible,
  title,
  defaultValue = '',
  placeholder,
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
  helperText,
  testID,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
      setBusy(false);
    }
  }, [defaultValue, visible]);

  async function handleConfirm() {
    if (busy || !value.trim()) return;
    setBusy(true);
    try {
      await onConfirm(value.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet onClose={onCancel} scrollable={false} testID={testID} title={title} visible={visible}>
      <View style={styles.body}>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          testID={`${testID ?? 'name-entry'}:input`}
          value={value}
        />
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        <View style={styles.actions}>
          <Button label="Cancel" onPress={onCancel} variant="secondary" />
          <Button
            disabled={busy || !value.trim()}
            label={busy ? 'Saving…' : confirmLabel}
            onPress={() => {
              void handleConfirm();
            }}
            testID={`${testID ?? 'name-entry'}:confirm`}
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
    gap: 12,
    paddingBottom: 8,
    paddingTop: 6,
  },
  helper: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    color: '#111827',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    ...interStyle('400'),
  },
});
