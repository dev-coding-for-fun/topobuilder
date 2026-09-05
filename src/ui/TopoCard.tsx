import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Route, TabvarRoute, TopoWithRoutes } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type Props = {
  topo: TopoWithRoutes;
  onOpen: () => void;
  onShare: () => void;
  onMenu: () => void;
  onLinkRoute?: () => void;
};

type UnifiedRoute =
  | { kind: 'local'; route: Route; sortOrder: number }
  | { kind: 'tabvar'; route: TabvarRoute; sortOrder: number };

function formatSummary(localRoutes: Route[], tabvarRoutes: TabvarRoute[]): string {
  const localCount = localRoutes.length;
  const tabvarCount = tabvarRoutes.length;
  const total = localCount + tabvarCount;
  if (total === 0) {
    return 'No routes yet';
  }
  if (total === 1 && localCount === 1) {
    const r = localRoutes[0];
    const grade = r.grade ? `${r.grade} · ` : '';
    return `${grade}${r.name || 'Route 1'}`;
  }
  if (total === 1 && tabvarCount === 1) {
    const r = tabvarRoutes[0];
    const grade = r.gradeYds ? `${r.gradeYds} · ` : '';
    return `${grade}${r.name}`;
  }
  if (localCount > 0 && tabvarCount > 0) {
    return `${total} routes (${tabvarCount} TABVAR · ${localCount} local)`;
  }
  if (tabvarCount > 0) {
    return `${tabvarCount} ${tabvarCount === 1 ? 'TABVAR route' : 'TABVAR routes'}`;
  }
  return `${localCount} ${localCount === 1 ? 'local route' : 'local routes'}`;
}

export function TopoCard({ topo, onOpen, onShare, onMenu, onLinkRoute }: Props) {
  const localRoutes = topo.routes ?? [];
  const tabvarRoutes = topo.tabvarRoutes ?? [];

  const combinedRoutes: UnifiedRoute[] = [
    ...localRoutes.map((r, i) => ({
      kind: 'local' as const,
      route: r,
      sortOrder: r.sortOrder ?? i,
    })),
    ...tabvarRoutes.map((r, i) => ({
      kind: 'tabvar' as const,
      route: r,
      sortOrder: r.sortOrder ?? i + 100,
    })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const summary = formatSummary(localRoutes, tabvarRoutes);

  return (
    <View style={styles.card} testID={`crag-detail:topo:${topo.id}`}>
      {/* ── Banner / Photo ──────────────────────────────────────────────── */}
      <Pressable
        accessibilityLabel={`Open editor for ${topo.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.bannerPressable, pressed && styles.bannerPressed]}
        testID={`crag-detail:topo:${topo.id}:open`}
      >
        {topo.photoUri ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            recyclingKey={topo.photoUri}
            source={{ uri: topo.photoUri }}
            style={styles.bannerImage}
            testID={`crag-detail:topo:${topo.id}:thumb-image`}
          />
        ) : (
          <View style={styles.bannerPlaceholder} testID={`crag-detail:topo:${topo.id}:banner-placeholder`}>
            <Ionicons color="#94A3B8" name="camera-outline" size={32} />
            <Text style={styles.bannerPlaceholderText}>Tap to add photo and draw routes</Text>
          </View>
        )}
      </Pressable>

      {/* ── Header Metadata ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.title} testID={`crag-detail:topo:${topo.id}:title`}>
            {topo.name}
          </Text>
          <Text numberOfLines={1} style={styles.meta} testID={`crag-detail:topo:${topo.id}:meta`}>
            {summary}
          </Text>
        </View>
        <View style={styles.headerActions}>
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
      </View>

      {/* ── Nested Route List ───────────────────────────────────────────── */}
      <View style={styles.routesContainer} testID={`crag-detail:topo:${topo.id}:routes-list`}>
        {combinedRoutes.length > 0 ? (
          combinedRoutes.map((item, index) => {
            const isLocal = item.kind === 'local';
            const name = isLocal ? item.route.name || `Route ${index + 1}` : item.route.name;
            const grade = isLocal ? item.route.grade : item.route.gradeYds;
            const routeId = isLocal ? item.route.id : item.route.appId;
            const badgeTestId = isLocal
              ? `crag-detail:topo:${topo.id}:route:${item.route.id}:badge`
              : `crag-detail:topo:${topo.id}:tabvar-route:${item.route.appId}:badge`;

            return (
              <View
                key={`${item.kind}-${routeId}`}
                style={[styles.routeRow, index > 0 && styles.routeRowBorder]}
                testID={`crag-detail:topo:${topo.id}:route-row:${routeId}`}
              >
                <View style={styles.routeMarker}>
                  {isLocal && item.route.color ? (
                    <View style={[styles.colorDot, { backgroundColor: item.route.color }]} />
                  ) : null}
                  <Text style={styles.markerIndex}>{index + 1}</Text>
                </View>

                <View style={styles.routeNameContainer}>
                  <Text numberOfLines={1} style={styles.routeName}>
                    {name}
                  </Text>
                  {grade ? <Text style={styles.routeGrade}>{grade}</Text> : null}
                </View>

                <View
                  style={[styles.badge, isLocal ? styles.localBadge : styles.tabvarBadge]}
                  testID={badgeTestId}
                >
                  <Text style={[styles.badgeText, isLocal ? styles.localBadgeText : styles.tabvarBadgeText]}>
                    {isLocal ? 'Local' : 'TABVAR'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyRoutesText}>No routes mapped on this topo yet.</Text>
        )}
      </View>

      {/* ── Link Route Action ────────────────────────────────────────────── */}
      {onLinkRoute ? (
        <View style={styles.cardFooter}>
          <Pressable
            accessibilityLabel={`Link route to ${topo.name}`}
            accessibilityRole="button"
            onPress={onLinkRoute}
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
            testID={`crag-detail:topo:${topo.id}:link-route`}
          >
            <Ionicons color="#2563EB" name="add-circle-outline" size={16} />
            <Text style={styles.linkButtonText}>Link Route</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    ...interStyle('700'),
    letterSpacing: 0.2,
  },
  bannerImage: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: 150,
    width: '100%',
  },
  bannerPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 6,
    height: 110,
    justifyContent: 'center',
    width: '100%',
  },
  bannerPlaceholderText: {
    color: '#64748B',
    fontSize: 12,
    ...interStyle('400'),
  },
  bannerPressed: {
    opacity: 0.88,
  },
  bannerPressable: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardFooter: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  colorDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  emptyRoutesText: {
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 4,
    ...interStyle('400'),
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  linkButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  linkButtonPressed: {
    opacity: 0.6,
  },
  linkButtonText: {
    color: '#2563EB',
    fontSize: 13,
    ...interStyle('700'),
  },
  localBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  localBadgeText: {
    color: '#92400E',
  },
  markerIndex: {
    color: '#64748B',
    fontSize: 12,
    minWidth: 14,
    textAlign: 'center',
    ...interStyle('700'),
  },
  meta: {
    color: '#64748B',
    fontSize: 13,
    ...interStyle('400'),
  },
  pressed: {
    opacity: 0.6,
  },
  routeName: {
    color: '#0F172A',
    fontSize: 14,
    ...interStyle('700'),
  },
  routeNameContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeGrade: {
    color: '#475569',
    fontSize: 13,
    ...interStyle('400'),
  },
  routeMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minWidth: 20,
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 7,
  },
  routeRowBorder: {
    borderTopColor: '#F8FAFC',
    borderTopWidth: 1,
  },
  routesContainer: {
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  tabvarBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  tabvarBadgeText: {
    color: '#1D4ED8',
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    ...interStyle('700'),
  },
});
