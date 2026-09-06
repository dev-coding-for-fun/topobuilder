import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { forwardRef, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Route, TabvarRoute, TopoWithRoutes } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

export type TopoTargetMeasurable = {
  measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void;
};

type Props = {
  topo: TopoWithRoutes;
  onOpen: () => void;
  onShare: () => void;
  onMenu: () => void;
  onLinkRoute?: () => void;
  canLinkRoute?: boolean;
  onCreateRoute?: () => void;
  onEditRoute?: (route: Route) => void;
  onUnlinkRoute?: (route: TabvarRoute) => void;
  isDropTarget?: boolean;
  onRegisterTarget?: (topoId: string, target: TopoTargetMeasurable | null) => void;
  ref?: React.Ref<View>;
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

function TopoCardInner(
  props: Props,
  forwardedRef: React.ForwardedRef<View>,
) {
  const {
    topo,
    onOpen,
    onShare,
    onMenu,
    onLinkRoute,
    canLinkRoute = true,
    onCreateRoute,
    onEditRoute,
    onUnlinkRoute,
    isDropTarget,
    onRegisterTarget,
  } = props;
  const activeRef = forwardedRef || props.ref;
  const rootRef = useRef<View>(null);

  useEffect(() => {
    const target: TopoTargetMeasurable = {
      measureInWindow: (cb) => {
        const node = rootRef.current;
        let called = false;
        if (node && typeof (node as any).measureInWindow === 'function') {
          try {
            (node as any).measureInWindow((x: number, y: number, w: number, h: number) => {
              called = true;
              cb(x, y, w, h);
            });
          } catch {
            // fallback below
          }
        }
        if (!called) {
          cb(0, 100, 300, 200);
        }
      },
    };
    onRegisterTarget?.(topo.id, target);
    return () => {
      onRegisterTarget?.(topo.id, null);
    };
  }, [topo.id, onRegisterTarget]);

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
    <View
      ref={(node) => {
        (rootRef as any).current = node;
        if (typeof activeRef === 'function') activeRef(node);
        else if (activeRef && typeof activeRef === 'object' && 'current' in activeRef) {
          (activeRef as any).current = node;
        }
      }}
      style={[styles.card, isDropTarget && styles.cardDropTarget]}
      testID={`crag-detail:topo:${topo.id}`}
    >
      {isDropTarget ? (
        <View
          style={styles.dropBadge}
          testID={`crag-detail:topo:${topo.id}:drop-target`}
        >
          <Ionicons color="#2563EB" name="add-circle" size={15} />
          <Text style={styles.dropBadgeText}>Drop to link route</Text>
        </View>
      ) : null}

      {/* ── Topo Header (Thumbnail on the far left) ────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={`Open editor for ${topo.name}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.thumbnailPressable, pressed && styles.pressed]}
          testID={`crag-detail:topo:${topo.id}:open`}
        >
          {topo.photoUri ? (
            <Image
              accessibilityIgnoresInvertColors
              contentFit="cover"
              recyclingKey={topo.photoUri}
              source={{ uri: topo.photoUri }}
              style={styles.thumbnailImage}
              testID={`crag-detail:topo:${topo.id}:thumb-image`}
            />
          ) : (
            <View
              style={styles.thumbnailPlaceholder}
              testID={`crag-detail:topo:${topo.id}:banner-placeholder`}
            >
              <Ionicons color="#94A3B8" name="camera-outline" size={22} />
              <Text style={styles.thumbnailPlaceholderText}>Add photo</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          accessibilityLabel={`Open editor for ${topo.name}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.headerCopy, pressed && styles.pressed]}
        >
          <Text numberOfLines={1} style={styles.title} testID={`crag-detail:topo:${topo.id}:title`}>
            {topo.name}
          </Text>
          <Text numberOfLines={2} style={styles.meta} testID={`crag-detail:topo:${topo.id}:meta`}>
            {summary}
          </Text>
        </Pressable>

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

            const isEditableLocal = isLocal && Boolean(onEditRoute);
            const RowComponent = isEditableLocal ? Pressable : View;
            const rowProps = isEditableLocal
              ? {
                  accessibilityLabel: `Edit route ${name}`,
                  accessibilityRole: 'button' as const,
                  onPress: () => onEditRoute?.(item.route),
                  style: ({ pressed }: { pressed: boolean }) => [
                    styles.routeRow,
                    index > 0 && styles.routeRowBorder,
                    pressed && styles.pressed,
                  ],
                }
              : {
                  style: [styles.routeRow, index > 0 && styles.routeRowBorder],
                };

            return (
              <RowComponent
                key={`${item.kind}-${routeId}`}
                testID={`crag-detail:topo:${topo.id}:route-row:${routeId}`}
                {...rowProps}
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

                {!isLocal && onUnlinkRoute ? (
                  <Pressable
                    accessibilityLabel={`Unlink ${name} from ${topo.name}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onUnlinkRoute(item.route)}
                    style={({ pressed }) => [styles.unlinkButton, pressed && styles.pressed]}
                    testID={`crag-detail:topo:${topo.id}:tabvar-route:${item.route.appId}:unlink`}
                  >
                    <Ionicons color="#64748B" name="unlink-outline" size={16} />
                  </Pressable>
                ) : null}

                {isEditableLocal ? (
                  <Ionicons color="#94A3B8" name="chevron-forward" size={14} />
                ) : null}
              </RowComponent>
            );
          })
        ) : (
          <Text style={styles.emptyRoutesText}>No routes mapped on this topo yet.</Text>
        )}
      </View>

      {/* ── Route Actions (Create & Link) ────────────────────────────────── */}
      {onCreateRoute || (onLinkRoute && canLinkRoute) ? (
        <View style={styles.cardFooter}>
          {onCreateRoute ? (
            <Pressable
              accessibilityLabel={`Create route in ${topo.name}`}
              accessibilityRole="button"
              onPress={onCreateRoute}
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
              testID={`crag-detail:topo:${topo.id}:create-route`}
            >
              <Ionicons color="#2563EB" name="add-circle-outline" size={16} />
              <Text style={styles.linkButtonText}>Add Route</Text>
            </Pressable>
          ) : null}

          {onLinkRoute && canLinkRoute ? (
            <Pressable
              accessibilityLabel={`Link route to ${topo.name}`}
              accessibilityRole="button"
              onPress={onLinkRoute}
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
              testID={`crag-detail:topo:${topo.id}:link-route`}
            >
              <Ionicons color="#2563EB" name="link-outline" size={16} />
              <Text style={styles.linkButtonText}>Link Route</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const TopoCard = forwardRef(TopoCardInner);

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
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardDropTarget: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  cardFooter: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  colorDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dropBadge: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderBottomColor: '#BFDBFE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dropBadgeText: {
    color: '#1E40AF',
    fontSize: 12,
    ...interStyle('700'),
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
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
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
    lineHeight: 17,
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
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
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
  thumbnailImage: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 64,
    width: 64,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 2,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  thumbnailPlaceholderText: {
    color: '#94A3B8',
    fontSize: 9,
    ...interStyle('700'),
  },
  thumbnailPressable: {
    borderRadius: 12,
    height: 64,
    overflow: 'hidden',
    width: 64,
  },
  title: {
    color: '#0F172A',
    fontSize: 16,
    ...interStyle('700'),
  },
  unlinkButton: {
    alignItems: 'center',
    borderRadius: 6,
    height: 28,
    justifyContent: 'center',
    marginLeft: 2,
    paddingHorizontal: 4,
    width: 28,
  },
});
