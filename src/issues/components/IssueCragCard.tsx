import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IssueCragSummary } from '@/storage/repos/tabvarIssuesRepo';
import { interStyle } from '@/ui/fonts';

type Props = {
  summary: IssueCragSummary;
  onOpen: () => void;
};

export function IssueCragCard({ summary, onOpen }: Props) {
  const updated = formatRelative(summary.newestUpdatedAt);
  const flagged = summary.flaggedCount > 0 ? ` · ${summary.flaggedCount} flagged` : '';

  return (
    <Pressable
      accessibilityLabel={`Open issues for ${summary.name}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`issues:crag-card:${summary.cragId}`}
    >
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {summary.name}
        </Text>
        <Text style={styles.meta}>
          {summary.issueCount} {summary.issueCount === 1 ? 'issue' : 'issues'}
          {flagged}
        </Text>
        {updated ? <Text style={styles.subMeta}>Updated {updated}</Text> : null}
      </View>
      <Ionicons color="#6B7280" name="chevron-forward" size={20} />
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
    gap: 4,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardPressed: {
    opacity: 0.7,
  },
  meta: {
    color: '#4B5563',
    fontSize: 14,
  },
  subMeta: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  title: {
    color: '#111827',
    fontSize: 17,
    ...interStyle('800'),
  },
});
