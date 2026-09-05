import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConnectedCragSummary, CragSummary } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type LocalProps = {
  variant?: 'local';
  summary: CragSummary;
  onOpen: () => void;
  onShare?: () => void;
};

type ConnectedProps = {
  variant: 'connected';
  summary: ConnectedCragSummary;
  onOpen: () => void;
  onShare?: never;
};

export type CragCardProps = LocalProps | ConnectedProps;

export function CragCard(props: CragCardProps) {
  const isConnected = props.variant === 'connected';

  const testId = isConnected
    ? `crags:connected-card:${props.summary.tabvarCragId}`
    : `crags:card:${props.summary.id}`;
  const openTestId = `${testId}:open`;
  const badgeTestId = `${testId}:badge`;

  const accessibilityLabel = isConnected
    ? `${props.summary.name}, connected TABVAR crag`
    : `Open ${props.summary.name}`;

  const badgeText = isConnected ? 'TABVAR' : 'LOCAL';

  const metaText = isConnected
    ? `${props.summary.sectorCount} ${props.summary.sectorCount === 1 ? 'sector' : 'sectors'} · ${props.summary.routeCount} ${props.summary.routeCount === 1 ? 'route' : 'routes'}`
    : `${props.summary.sectorCount} ${props.summary.sectorCount === 1 ? 'sector' : 'sectors'} · ${props.summary.topoCount} ${props.summary.topoCount === 1 ? 'topo' : 'topos'}`;

  const updated = !isConnected ? formatRelative(props.summary.updatedAt) : undefined;
  const statusText = isConnected
    ? `${props.summary.topoCount} ${props.summary.topoCount === 1 ? 'topo' : 'topos'} in workspace`
    : updated
      ? `Updated ${updated}`
      : 'Local workspace';

  const statusIcon = isConnected ? 'layers-outline' : 'folder-outline';
  const statusColor = isConnected ? '#0284C7' : '#15803D';

  return (
    <View
      style={[
        styles.card,
        isConnected ? styles.cardConnected : styles.cardLocal,
      ]}
      testID={testId}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={props.onOpen}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
        testID={openTestId}
      >
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.titleContainer}>
              <Text numberOfLines={1} style={styles.title}>
                {props.summary.name}
              </Text>
              <View
                style={[
                  styles.badge,
                  isConnected ? styles.badgeConnected : styles.badgeLocal,
                ]}
                testID={badgeTestId}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isConnected ? styles.badgeTextConnected : styles.badgeTextLocal,
                  ]}
                >
                  {badgeText}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.meta}>{metaText}</Text>

          <View style={styles.statusRow}>
            <Ionicons color={statusColor} name={statusIcon} size={13} />
            <Text
              style={[
                styles.statusText,
                isConnected ? styles.statusTextConnected : styles.statusTextLocal,
              ]}
            >
              {statusText}
            </Text>
          </View>
        </View>

        {!props.onShare ? (
          <View style={styles.chevronWrap}>
            <Ionicons color="#64748B" name="chevron-forward" size={18} />
          </View>
        ) : null}
      </Pressable>

      {props.onShare ? (
        <Pressable
          accessibilityLabel={`Share ${props.summary.name}`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={props.onShare}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          testID={`crags:card:${props.summary.id}:share`}
        >
          <Ionicons color="#15803D" name="share-outline" size={19} />
        </Pressable>
      ) : null}
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
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeConnected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  badgeLocal: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.3,
    ...interStyle('700'),
  },
  badgeTextConnected: {
    color: '#0369A1',
  },
  badgeTextLocal: {
    color: '#15803D',
  },
  body: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  bodyPressed: {
    opacity: 0.7,
  },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingRight: 4,
  },
  cardConnected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  cardLocal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  chevronWrap: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    flex: 1,
    gap: 5,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 12,
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
    color: '#475569',
    fontSize: 13,
    ...interStyle('400'),
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    ...interStyle('700'),
  },
  statusTextConnected: {
    color: '#0284C7',
  },
  statusTextLocal: {
    color: '#15803D',
  },
  title: {
    color: '#0F172A',
    fontSize: 16,
    ...interStyle('700'),
  },
  titleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
