import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TopoWithRoutes } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type Props = {
  topo: TopoWithRoutes;
  onOpen: () => void;
  onShare: () => void;
  onMenu: () => void;
};

function summaryFor(topo: TopoWithRoutes): string {
  const count = topo.routes.length;
  if (count === 0) {
    return topo.photoUri ? 'No routes yet' : 'No photo · no routes yet';
  }
  if (count === 1) {
    const r = topo.routes[0];
    const grade = r.grade ? `${r.grade} · ` : '';
    return `${grade}${r.name || 'Route 1'}`;
  }
  const grades = topo.routes
    .map((r) => r.grade)
    .filter((g): g is string => Boolean(g));
  if (grades.length > 0) {
    const span = grades.length === 1 ? grades[0] : `${grades[0]} – ${grades[grades.length - 1]}`;
    return `${count} routes · ${span}`;
  }
  return `${count} routes`;
}

export function TopoRow({ topo, onOpen, onShare, onMenu }: Props) {
  return (
    <View style={styles.row} testID={`crag-detail:topo:${topo.id}`}>
      <Pressable
        accessibilityLabel={`Open ${topo.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
        testID={`crag-detail:topo:${topo.id}:open`}
      >
        <View style={styles.thumb} testID={`crag-detail:topo:${topo.id}:thumb`}>
          {topo.photoUri ? (
            <Image
              accessibilityIgnoresInvertColors
              contentFit="cover"
              recyclingKey={topo.photoUri}
              source={{ uri: topo.photoUri }}
              style={styles.thumbImage}
              testID={`crag-detail:topo:${topo.id}:thumb-image`}
            />
          ) : (
            <Ionicons color="#9CA3AF" name="image-outline" size={26} />
          )}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {topo.name}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {summaryFor(topo)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Share ${topo.name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onShare}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        testID={`crag-detail:topo:${topo.id}:share`}
      >
        <Ionicons color="#374151" name="share-outline" size={18} />
      </Pressable>
      <Pressable
        accessibilityLabel={`More options for ${topo.name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onMenu}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        testID={`crag-detail:topo:${topo.id}:menu`}
      >
        <Ionicons color="#374151" name="ellipsis-horizontal" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bodyPressed: {
    opacity: 0.7,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  meta: {
    color: '#6B7280',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
    flexDirection: 'row',
    paddingRight: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  title: {
    color: '#111827',
    fontSize: 16,
    ...interStyle('700'),
  },
});
