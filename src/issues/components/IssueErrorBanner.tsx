import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { issueColors } from '@/issues/colors';

type Props = {
  message?: string;
  testID?: string;
};

export function IssueErrorBanner({ message, testID }: Props) {
  if (!message) return null;

  return (
    <View style={styles.banner} testID={testID}>
      <Ionicons color={issueColors.danger} name="alert-circle" size={16} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: issueColors.dangerBg,
    borderColor: issueColors.dangerBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 18,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: {
    paddingTop: 1,
  },
  text: {
    color: issueColors.danger,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
