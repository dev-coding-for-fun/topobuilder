import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/ui/BottomSheet';
import { interStyle } from '@/ui/fonts';

export type ActionItem = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  items: ActionItem[];
  onClose: () => void;
  testID?: string;
};

export function ActionSheet({ visible, title, items, onClose, testID }: Props) {
  return (
    <BottomSheet onClose={onClose} scrollable={false} testID={testID} title={title} visible={visible}>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.id}
            onPress={() => {
              onClose();
              setTimeout(item.onPress, 60);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            testID={`${testID ?? 'action-sheet'}:${item.id}`}
          >
            {item.icon ? (
              <Ionicons
                color={item.destructive ? '#B91C1C' : '#374151'}
                name={item.icon}
                size={20}
                style={styles.rowIcon}
              />
            ) : null}
            <Text style={[styles.rowLabel, item.destructive && styles.rowLabelDestructive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  rowIcon: {
    marginRight: 12,
    width: 24,
  },
  rowLabel: {
    color: '#111827',
    fontSize: 16,
    ...interStyle('700'),
  },
  rowLabelDestructive: {
    color: '#B91C1C',
  },
  rowPressed: {
    opacity: 0.6,
  },
});
