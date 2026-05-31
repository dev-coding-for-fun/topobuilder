import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CragSummary } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type Props = {
  summary: CragSummary;
  onOpen: () => void;
  onShare: () => void;
};

export function CragCard({ summary, onOpen, onShare }: Props) {
  const updated = formatRelative(summary.updatedAt);
  return (
    <View style={styles.card} testID={`crags:card:${summary.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${summary.name}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
        testID={`crags:card:${summary.id}:open`}
      >
        <Text numberOfLines={1} style={styles.title}>
          {summary.name}
        </Text>
        <Text style={styles.meta}>
          {summary.sectorCount} {summary.sectorCount === 1 ? 'sector' : 'sectors'} ·{' '}
          {summary.topoCount} {summary.topoCount === 1 ? 'topo' : 'topos'}
        </Text>
        {updated ? <Text style={styles.subMeta}>Updated {updated}</Text> : null}
      </Pressable>

      <Pressable
        accessibilityLabel={`Share ${summary.name}`}
        accessibilityRole="button"
        hitSlop={10}
        onPress={onShare}
        style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        testID={`crags:card:${summary.id}:share`}
      >
        <Ionicons color="#374151" name="share-outline" size={20} />
      </Pressable>
    </View>
  );
}

function formatRelative(iso: string): string | undefined {
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
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bodyPressed: {
    opacity: 0.7,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    paddingRight: 4,
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconButtonPressed: {
    opacity: 0.6,
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
