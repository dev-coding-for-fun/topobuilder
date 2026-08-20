import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { issueColors } from '@/issues/colors';
import { BottomSheet } from '@/ui/BottomSheet';
import { interStyle } from '@/ui/fonts';

export type IssueSelectOption = {
  label: string;
  value: string;
};

type Props = {
  accessibilityLabel: string;
  disabled?: boolean;
  disabledMessage?: string;
  helper?: string;
  label: string;
  onChange: (value: string) => void;
  options: IssueSelectOption[];
  placeholder: string;
  testID: string;
  value?: string;
};

export function IssueSelectField({
  accessibilityLabel,
  disabled = false,
  disabledMessage,
  helper,
  label,
  onChange,
  options,
  placeholder,
  testID,
  value,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const selected = options.find((option) => option.value === value);
  const display = selected?.label ?? value;

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setPickerVisible(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {disabled ? (
        <Text style={styles.helper}>{disabledMessage}</Text>
      ) : (
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}
          testID={testID}
        >
          <Text numberOfLines={1} style={[styles.selectorTitle, !display && styles.placeholder]}>
            {display || placeholder}
          </Text>
          <Ionicons color={issueColors.faint} name="chevron-down" size={18} />
        </Pressable>
      )}
      <BottomSheet
        onClose={() => setPickerVisible(false)}
        scrollable={options.length > 6}
        testID={`${testID}:picker`}
        title={label}
        visible={pickerVisible && !disabled}
      >
        <View style={styles.options}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={({ pressed }) => [styles.option, pressed && styles.selectorPressed]}
                testID={`${testID}:${option.value}`}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                {isSelected ? (
                  <Ionicons color={issueColors.ink} name="checkmark" size={18} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  helper: {
    color: issueColors.faint,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  option: {
    alignItems: 'center',
    borderBottomColor: issueColors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  optionLabel: {
    color: issueColors.ink,
    flex: 1,
    fontSize: 15,
    ...interStyle('700'),
  },
  options: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  placeholder: {
    color: issueColors.faint,
  },
  selector: {
    alignItems: 'center',
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectorPressed: {
    opacity: 0.65,
  },
  selectorTitle: {
    color: issueColors.ink,
    flex: 1,
    fontSize: 15,
    ...interStyle('700'),
  },
});
