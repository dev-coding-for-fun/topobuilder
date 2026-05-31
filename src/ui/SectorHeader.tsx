import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { interStyle } from '@/ui/fonts';

type Props = {
  sectorId: string;
  name: string;
  topoCount: number;
  onShare: () => void;
  onMenu: () => void;
};

export function SectorHeader({ sectorId, name, topoCount, onShare, onMenu }: Props) {
  return (
    <View style={styles.row} testID={`crag-detail:sector:${sectorId}`}>
      <View style={styles.accent} />
      <View style={styles.titleWrap}>
        <Text numberOfLines={1} style={styles.title}>
          {name}
        </Text>
        <Text style={styles.count}>
          {topoCount} {topoCount === 1 ? 'topo' : 'topos'}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={`Share ${name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onShare}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        testID={`crag-detail:sector:${sectorId}:share`}
      >
        <Ionicons color="#374151" name="share-outline" size={18} />
      </Pressable>
      <Pressable
        accessibilityLabel={`More options for ${name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onMenu}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        testID={`crag-detail:sector:${sectorId}:menu`}
      >
        <Ionicons color="#374151" name="ellipsis-horizontal" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    backgroundColor: '#1F2937',
    borderRadius: 2,
    height: 22,
    marginRight: 10,
    width: 4,
  },
  count: {
    color: '#6B7280',
    fontSize: 13,
  },
  iconButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: '#CBD5E1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 2,
    paddingTop: 10,
  },
  title: {
    color: '#0F172A',
    fontSize: 19,
    ...interStyle('800'),
  },
  titleWrap: {
    flex: 1,
    gap: 1,
  },
});
