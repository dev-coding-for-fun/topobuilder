import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IssueListItem } from '@/storage/repos/tabvarIssuesRepo';
import { interStyle } from '@/ui/fonts';

type Props = {
  issue: IssueListItem;
  onOpen: () => void;
};

export function IssueRow({ issue, onOpen }: Props) {
  const subtitle = [issue.sectorName, issue.gradeYds].filter(Boolean).join(' · ');
  const typeLabel = [issue.issueType, issue.subIssueType].filter(Boolean).join(' · ');
  const detail = issue.flaggedMessage || issue.description;

  return (
    <Pressable
      accessibilityLabel={`Open issue ${typeLabel} on ${issue.routeName}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`issues:issue-row:${issue.id}`}
    >
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {issue.routeName}
          </Text>
          {issue.attachmentCount > 0 ? (
            <View style={styles.attachment} testID={`issues:issue-row:${issue.id}:attachments`}>
              <Ionicons color="#6B7280" name="image-outline" size={16} />
              <Text style={styles.attachmentText}>{issue.attachmentCount}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtle}>
            {subtitle}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={styles.meta}>
          {typeLabel} · {issue.status}
          {issue.boltsAffected ? ` · bolts ${issue.boltsAffected}` : ''}
        </Text>
        {detail ? (
          <Text numberOfLines={2} style={issue.flaggedMessage ? styles.flagged : styles.detail}>
            {detail}
          </Text>
        ) : null}
        <Text style={styles.subtle}>
          {issue.reportedBy ? `Reported by ${issue.reportedBy}` : 'Reported'} · {formatDate(issue.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const styles = StyleSheet.create({
  attachment: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  attachmentText: {
    color: '#6B7280',
    fontSize: 12,
    ...interStyle('700'),
  },
  body: {
    flex: 1,
    gap: 5,
  },
  detail: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  flagged: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: '#111827',
    fontSize: 14,
    ...interStyle('700'),
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.7,
  },
  subtle: {
    color: '#6B7280',
    fontSize: 12,
  },
  title: {
    color: '#111827',
    flex: 1,
    fontSize: 17,
    ...interStyle('800'),
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
