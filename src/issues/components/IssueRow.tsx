import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { issueCardShadow, issueColors } from '@/issues/colors';
import { getIssueResolutionAction } from '@/issues/statusWorkflow';
import type { IssueListItem } from '@/storage/repos/tabvarIssuesRepo';
import { interStyle } from '@/ui/fonts';

type Props = {
  issue: IssueListItem;
  resolving?: boolean;
  onOpen: () => void;
  onResolve: () => void;
};

export function IssueRow({ issue, resolving, onOpen, onResolve }: Props) {
  const subtitle = [issue.sectorName, issue.gradeYds].filter(Boolean).join(' · ');
  const typeLabel = [issue.issueType, issue.subIssueType].filter(Boolean).join(' · ');
  const meta = [typeLabel, issue.boltsAffected ? `bolts ${issue.boltsAffected}` : '']
    .filter(Boolean)
    .join(' · ');
  const detail = issue.flaggedMessage || issue.description;
  const resolution = getIssueResolutionAction(issue.status);
  const resolved = issue.status === 'Completed';

  return (
    <View style={styles.card} testID={`issues:issue-row:${issue.id}`}>
      <Pressable
        accessibilityLabel={`Edit issue ${typeLabel} on ${issue.routeName}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.content, pressed && styles.cardPressed]}
        testID={`issues:issue-row:${issue.id}:open`}
      >
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {issue.routeName}
          </Text>
          <View style={[styles.status, resolved ? styles.statusDone : styles.statusOpen]}>
            <Text style={[styles.statusText, resolved ? styles.statusTextDone : styles.statusTextOpen]}>
              {issue.status}
            </Text>
          </View>
        </View>

        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}

        {meta ? (
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        ) : null}

        {detail ? (
          <View style={styles.detailRow}>
            {issue.flaggedMessage ? (
              <Ionicons color={issueColors.flag} name="flag" size={13} style={styles.flagIcon} />
            ) : null}
            <Text numberOfLines={2} style={styles.detail}>
              {detail}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.footerMeta}>
          {issue.attachmentCount > 0 ? (
            <View style={styles.attachment} testID={`issues:issue-row:${issue.id}:attachments`}>
              <Ionicons color={issueColors.faint} name="image-outline" size={14} />
              <Text style={styles.attachmentText}>{issue.attachmentCount}</Text>
            </View>
          ) : null}
          <Text numberOfLines={1} style={styles.footerText}>
            {issue.reportedBy ? `Reported by ${issue.reportedBy}` : 'Reported'} ·{' '}
            {formatDate(issue.updatedAt)}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={resolution.label}
          accessibilityRole="button"
          disabled={resolving}
          hitSlop={8}
          onPress={onResolve}
          style={({ pressed }) => [
            styles.action,
            resolving && styles.actionDisabled,
            pressed && !resolving && styles.actionPressed,
          ]}
          testID={`issues:issue-row:${issue.id}:status`}
        >
          <Ionicons
            color={issueColors.body}
            name={resolved ? 'arrow-undo-outline' : 'checkmark'}
            size={14}
          />
          <Text style={styles.actionLabel}>{resolution.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionLabel: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  actionPressed: {
    opacity: 0.6,
  },
  attachment: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  attachmentText: {
    color: issueColors.faint,
    fontSize: 12,
    ...interStyle('700'),
  },
  card: {
    backgroundColor: issueColors.card,
    borderColor: issueColors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...issueCardShadow,
  },
  cardPressed: {
    opacity: 0.7,
  },
  content: {
    gap: 3,
  },
  detail: {
    color: issueColors.body,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 3,
  },
  flagIcon: {
    paddingTop: 3,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: issueColors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
  },
  footerMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
  },
  footerText: {
    color: issueColors.faint,
    flexShrink: 1,
    fontSize: 12.5,
  },
  meta: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  status: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusDone: {
    backgroundColor: issueColors.doneBg,
  },
  statusOpen: {
    backgroundColor: issueColors.openBg,
  },
  statusText: {
    fontSize: 12,
    ...interStyle('700'),
  },
  statusTextDone: {
    color: issueColors.doneFg,
  },
  statusTextOpen: {
    color: issueColors.openFg,
  },
  subtitle: {
    color: issueColors.muted,
    fontSize: 13,
  },
  title: {
    color: issueColors.ink,
    flex: 1,
    fontSize: 16,
    ...interStyle('800'),
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
