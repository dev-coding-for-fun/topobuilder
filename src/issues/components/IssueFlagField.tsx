import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { issueColors } from '@/issues/colors';
import { interStyle } from '@/ui/fonts';

type Props = {
  error?: string;
  flagged: boolean;
  message: string;
  onFlaggedChange: (flagged: boolean) => void;
  onMessageChange: (message: string) => void;
  testID?: string;
};

export function IssueFlagField({
  error,
  flagged,
  message,
  onFlaggedChange,
  onMessageChange,
  testID = 'issues:detail',
}: Props) {
  const messageRef = useRef<TextInput>(null);
  const wasFlaggedRef = useRef(flagged);

  useEffect(() => {
    if (flagged && !wasFlaggedRef.current) {
      messageRef.current?.focus();
    }
    wasFlaggedRef.current = flagged;
  }, [flagged]);

  return (
    <View style={styles.field}>
      <View style={styles.toggleRow}>
        <Pressable
          accessible={false}
          onPress={() => onFlaggedChange(!flagged)}
          style={({ pressed }) => [styles.toggleCopy, pressed && styles.togglePressed]}
        >
          <Ionicons
            color={flagged ? issueColors.flag : issueColors.faint}
            name={flagged ? 'flag' : 'flag-outline'}
            size={16}
          />
          <Text style={styles.label}>Flag this issue</Text>
        </Pressable>
        <Switch
          accessibilityLabel="Flag this issue"
          onValueChange={onFlaggedChange}
          testID={`${testID}:flag`}
          thumbColor={issueColors.card}
          trackColor={{ false: issueColors.fillBorder, true: issueColors.flagTrack }}
          value={flagged}
        />
      </View>

      {flagged ? (
        <TextInput
          accessibilityLabel="Flag message"
          multiline
          onChangeText={onMessageChange}
          placeholder="Required - why is this unsafe to climb?"
          placeholderTextColor={issueColors.faint}
          ref={messageRef}
          style={[styles.input, error ? styles.inputError : null]}
          testID={`${testID}:flagged`}
          textAlignVertical="top"
          value={message}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: issueColors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    gap: 8,
  },
  input: {
    backgroundColor: issueColors.flagBg,
    borderColor: issueColors.flagBorder,
    borderRadius: 12,
    borderWidth: 1,
    color: issueColors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputError: {
    borderColor: issueColors.dangerBorder,
  },
  label: {
    color: issueColors.body,
    flex: 1,
    fontSize: 13,
    ...interStyle('700'),
  },
  toggleCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  togglePressed: {
    opacity: 0.7,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 32,
  },
});
