import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { issueColors } from '@/issues/colors';
import { getDatabase, runMigrations } from '@/storage/database';
import {
  listIssueSyncLogs,
  type IssueSyncLogEntry,
  type IssueSyncLogStatus,
} from '@/storage/repos/issueOutboxRepo';
import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

const TRIGGER_LABELS: Record<string, string> = {
  background: 'Background',
  initial: 'Initial sync',
  interactive: 'Save',
  manual: 'Refresh',
  reconnect: 'Reconnect',
};

export default function IssueSyncLogScreen() {
  const [entries, setEntries] = useState<IssueSyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [expandedId, setExpandedId] = useState<string>();

  const reload = useCallback(async () => {
    setError(undefined);
    try {
      const db = await getDatabase();
      await runMigrations(db);
      setEntries(await listIssueSyncLogs(db));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the sync log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void reload();
    }, [reload]),
  );

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="settings:sync-log-screen">
      <Stack.Screen options={{ title: 'Issue sync log' }} />
      <FlatList
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty} testID="settings:sync-log:empty">
              <Text style={styles.emptyTitle}>No sync attempts yet</Text>
              <Text style={styles.emptyBody}>
                Saves, pull-to-refresh, and background uploads will appear here.
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          error ? (
            <Text style={styles.error} testID="settings:sync-log:error">
              {error}
            </Text>
          ) : (
            <Text style={styles.intro}>
              Recent TABVAR issue uploads. Failed items stay queued until a later sync succeeds.
            </Text>
          )
        }
        contentContainerStyle={styles.list}
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void reload();
            }}
            refreshing={loading}
          />
        }
        renderItem={({ item }) => (
          <SyncLogRow
            entry={item}
            expanded={expandedId === item.id}
            onPress={() => setExpandedId((current) => (current === item.id ? undefined : item.id))}
          />
        )}
      />
    </Screen>
  );
}

function SyncLogRow({
  entry,
  expanded,
  onPress,
}: {
  entry: IssueSyncLogEntry;
  expanded: boolean;
  onPress: () => void;
}) {
  const errors = errorLines(entry.details);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={`settings:sync-log:entry:${entry.id}`}
    >
      <View style={styles.cardHeader}>
        <StatusBadge status={entry.status} />
        <Text style={styles.trigger}>{triggerLabel(entry.triggerKind)}</Text>
        <Text style={styles.time}>{formatDateTime(entry.startedAt)}</Text>
      </View>
      <Text style={styles.summary}>{entry.summary}</Text>
      {errors.map((line) => (
        <Text key={line} style={styles.detailError}>
          {line}
        </Text>
      ))}
      {expanded ? (
        <Text selectable style={styles.details} testID={`settings:sync-log:details:${entry.id}`}>
          {JSON.stringify(entry.details, null, 2)}
        </Text>
      ) : (
        <Text style={styles.expandHint}>{entry.details.length > 0 ? 'Tap for details' : 'No item details'}</Text>
      )}
    </Pressable>
  );
}

function StatusBadge({ status }: { status: IssueSyncLogStatus }) {
  return (
    <View
      style={[
        styles.badge,
        status === 'ok' && styles.badgeOk,
        status === 'partial' && styles.badgePartial,
        status === 'error' && styles.badgeError,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          status === 'ok' && styles.badgeTextOk,
          status === 'partial' && styles.badgeTextPartial,
          status === 'error' && styles.badgeTextError,
        ]}
      >
        {status === 'ok' ? 'OK' : status === 'partial' ? 'Partial' : 'Error'}
      </Text>
    </View>
  );
}

function triggerLabel(kind: string) {
  return TRIGGER_LABELS[kind] ?? kind;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function errorLines(details: unknown[]) {
  const lines: string[] = [];
  for (const detail of details) {
    if (!detail || typeof detail !== 'object') continue;
    const row = detail as { error?: unknown; issueId?: unknown; op?: unknown };
    if (typeof row.error !== 'string') continue;
    const op = typeof row.op === 'string' ? row.op : 'item';
    const issueId = typeof row.issueId === 'number' ? ` #${row.issueId}` : '';
    lines.push(`${op}${issueId}: ${row.error}`);
  }
  return lines;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeError: {
    backgroundColor: issueColors.dangerBg,
  },
  badgeOk: {
    backgroundColor: issueColors.doneBg,
  },
  badgePartial: {
    backgroundColor: issueColors.openBg,
  },
  badgeText: {
    fontSize: 11,
    ...interStyle('700'),
  },
  badgeTextError: {
    color: issueColors.danger,
  },
  badgeTextOk: {
    color: issueColors.doneFg,
  },
  badgeTextPartial: {
    color: issueColors.openFg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailError: {
    color: issueColors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  details: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 48,
  },
  emptyBody: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    ...interStyle('700'),
  },
  error: {
    color: issueColors.danger,
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: 8,
  },
  expandHint: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  intro: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 4,
  },
  list: {
    gap: 10,
    paddingBottom: 60,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  summary: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
  },
  time: {
    color: '#6B7280',
    flexShrink: 1,
    fontSize: 12,
    marginLeft: 'auto',
  },
  trigger: {
    color: '#374151',
    fontSize: 13,
    ...interStyle('700'),
  },
});
