import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { issueColors } from '@/issues/colors';
import { interStyle } from '@/ui/fonts';

type Props = {
  body: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  testID?: string;
  title?: string;
};

export function IssueEmptyState({ body, icon, loading, testID, title }: Props) {
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.badge}>
        {loading ? (
          <ActivityIndicator color={issueColors.muted} />
        ) : (
          <Ionicons color={issueColors.muted} name={icon ?? 'ellipse-outline'} size={26} />
        )}
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: issueColors.card,
    borderColor: issueColors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 4,
    width: 56,
  },
  body: {
    color: issueColors.muted,
    fontSize: 14.5,
    lineHeight: 21,
    maxWidth: 300,
    textAlign: 'center',
  },
  title: {
    color: issueColors.ink,
    fontSize: 17,
    textAlign: 'center',
    ...interStyle('800'),
  },
  wrap: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
});
