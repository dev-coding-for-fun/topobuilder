import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConnectedCragSummary } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type Props = {
  item: ConnectedCragSummary;
  onPress: () => void;
};

export function ConnectedCragCard({ item, onPress }: Props) {
  const isInWorkspace = Boolean(item.workspaceCragId);

  return (
    <View style={styles.card} testID={`crags:connected-card:${item.tabvarCragId}`}>
      <View style={styles.accentBar} />
      <Pressable
        accessibilityLabel={`${item.name}, connected TABVAR crag`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
        testID={`crags:connected-card:${item.tabvarCragId}:open`}
      >
        <View style={styles.topRow}>
          <View style={styles.titleContainer}>
            <Text numberOfLines={1} style={styles.title}>
              {item.name}
            </Text>
            <View style={styles.badge} testID={`crags:connected-card:${item.tabvarCragId}:badge`}>
              <Text style={styles.badgeText}>TABVAR</Text>
            </View>
          </View>
        </View>

        <Text style={styles.meta}>
          {item.sectorCount} {item.sectorCount === 1 ? 'sector' : 'sectors'} · {item.routeCount}{' '}
          {item.routeCount === 1 ? 'route' : 'routes'}
        </Text>

        <View style={styles.bottomRow}>
          {isInWorkspace ? (
            <View style={styles.workspaceStatus}>
              <Ionicons color="#0284C7" name="checkmark-circle-outline" size={14} />
              <Text style={styles.workspaceText}>
                {item.topoCount} {item.topoCount === 1 ? 'topo' : 'topos'} in workspace
              </Text>
            </View>
          ) : (
            <View style={styles.adoptPrompt}>
              <Ionicons color="#0369A1" name="add-circle-outline" size={14} />
              <Text style={styles.adoptPromptText}>Tap to add to workspace</Text>
            </View>
          )}

          <Ionicons
            color="#64748B"
            name={isInWorkspace ? 'chevron-forward' : 'arrow-forward-outline'}
            size={18}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  accentBar: {
    backgroundColor: '#0284C7',
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 16,
    width: 5,
  },
  adoptPrompt: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  adoptPromptText: {
    color: '#0369A1',
    fontSize: 12,
    ...interStyle('700'),
  },
  badge: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#0369A1',
    fontSize: 10,
    letterSpacing: 0.3,
    ...interStyle('700'),
  },
  body: {
    flex: 1,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bodyPressed: {
    opacity: 0.7,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    ...interStyle('400'),
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
  workspaceStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  workspaceText: {
    color: '#0284C7',
    fontSize: 12,
    ...interStyle('700'),
  },
});
