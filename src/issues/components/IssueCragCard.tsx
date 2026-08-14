import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { issueCardShadow, issueColors } from '@/issues/colors';
import type { IssueCragSummary } from '@/storage/repos/tabvarIssuesRepo';
import { interStyle } from '@/ui/fonts';

type Props = {
  summary: IssueCragSummary;
  onOpen: () => void;
};

export function IssueCragCard({ summary, onOpen }: Props) {
  const updated = formatRelative(summary.newestUpdatedAt);

  return (
    <Pressable
      accessibilityLabel={`Open issues for ${summary.name}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`issues:crag-card:${summary.cragId}`}
    >
      <View style={styles.count}>
        <Text style={styles.countText}>{summary.issueCount}</Text>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {summary.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {summary.issueCount === 1 ? 'issue' : 'issues'}
          {summary.flaggedCount > 0 ? (
            <Text style={styles.flagged}>{` · ${summary.flaggedCount} flagged`}</Text>
          ) : null}
          {updated ? ` · updated ${updated}` : ''}
        </Text>
      </View>

      <Ionicons color={issueColors.faint} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function formatRelative(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return undefined;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 3,
  },
  card: {
    alignItems: 'center',
    backgroundColor: issueColors.card,
    borderColor: issueColors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...issueCardShadow,
  },
  cardPressed: {
    opacity: 0.7,
  },
  count: {
    alignItems: 'center',
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    minWidth: 40,
    paddingHorizontal: 6,
  },
  countText: {
    color: issueColors.ink,
    fontSize: 16,
    ...interStyle('800'),
  },
  flagged: {
    color: issueColors.flag,
  },
  meta: {
    color: issueColors.muted,
    fontSize: 13,
  },
  title: {
    color: issueColors.ink,
    fontSize: 16,
    ...interStyle('800'),
  },
});
