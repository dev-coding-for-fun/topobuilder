import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Route, TabvarRoute, TopoWithRoutes } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

export const ROUTE_ROW_HEIGHT = 44;

export type TopoTargetMeasurable = {
  measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void;
  getSlotIndex: (pageY: number, isReorder: boolean) => number;
};

export type UnifiedRoute =
  | { kind: 'local'; route: Route; sortOrder: number }
  | { kind: 'tabvar'; route: TabvarRoute; sortOrder: number };

type Props = {
  topo: TopoWithRoutes;
  onOpen: () => void;
  onShare: () => void;
  onMenu: () => void;
  onCreateRoute?: () => void;
  onEditRoute?: (route: Route) => void;
  onUnlinkRoute?: (route: TabvarRoute) => void;
  isDropTarget?: boolean;
  hoverSlotIndex?: number;
  dragItem?:
    | { kind: 'unmapped'; name: string; grade?: string }
    | {
        kind: 'topo-route';
        topoId: string;
        index: number;
        name: string;
        grade?: string;
        routeKind?: 'local' | 'tabvar';
      }
    | null;
  onRouteDragStart?: (
    topoId: string,
    item: UnifiedRoute,
    index: number,
    pageX: number,
    pageY: number,
  ) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
  onRegisterTarget?: (topoId: string, target: TopoTargetMeasurable | null) => void;
  ref?: React.Ref<View>;
};

function measureNode(
  node: any,
  cb: (x: number, y: number, width: number, height: number) => void,
) {
  if (!node) {
    cb(0, 0, 0, 0);
    return;
  }
  if (typeof node.getBoundingClientRect === 'function') {
    const rect = node.getBoundingClientRect();
    cb(rect.left, rect.top, rect.width, rect.height);
    return;
  }
  if (typeof node.measureInWindow === 'function') {
    node.measureInWindow((x: number, y: number, w: number, h: number) => {
      cb(x, y, w, h);
    });
    return;
  }
  cb(0, 0, 0, 0);
}

function AnimatedRouteRow({
  children,
  index,
  activeDragSourceIndex,
  activeHoverSlotIndex,
  isIncomingDrag,
  dragTranslationY,
}: {
  children: React.ReactNode;
  index: number;
  activeDragSourceIndex: SharedValue<number>;
  activeHoverSlotIndex: SharedValue<number>;
  isIncomingDrag: SharedValue<boolean>;
  dragTranslationY: SharedValue<number>;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = 0;
  }, [index, translateY]);

  useAnimatedReaction(
    () => {
      const source = activeDragSourceIndex.value;
      const hover = activeHoverSlotIndex.value;
      const incoming = isIncomingDrag.value;

      if (incoming) {
        if (hover >= 0 && index >= hover) {
          return ROUTE_ROW_HEIGHT;
        }
        return 0;
      }

      if (source >= 0 && hover >= 0 && source !== hover) {
        if (index === source) return 0;

        if (hover > source) {
          if (index > source && index <= hover) {
            return -ROUTE_ROW_HEIGHT;
          }
        } else {
          if (index >= hover && index < source) {
            return ROUTE_ROW_HEIGHT;
          }
        }
      }
      return 0;
    },
    (targetOffset, prevOffset) => {
      if (targetOffset !== prevOffset) {
        translateY.value = withTiming(targetOffset, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });
      }
    },
    [index],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = activeDragSourceIndex.value === index;
    if (isDragging) {
      return {
        transform: [
          { translateY: dragTranslationY.value },
          { scale: 1.025 },
        ],
        zIndex: 100,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
      };
    }
    return {
      transform: [
        { translateY: translateY.value },
        { scale: 1 },
      ],
      zIndex: 0,
      elevation: 0,
      shadowOpacity: 0,
      backgroundColor: 'transparent',
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

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

function RouteRowDragHandle({
  testID,
  accessibilityLabel,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  testID: string;
  accessibilityLabel: string;
  onDragStart?: (pageX: number, pageY: number) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
}) {
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(4)
        .onStart((e) => {
          onDragStartRef.current?.(e.absoluteX, e.absoluteY);
        })
        .onUpdate((e) => {
          onDragMoveRef.current?.(e.absoluteX, e.absoluteY);
        })
        .onFinalize(() => {
          onDragEndRef.current?.();
        }),
    [],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.dragHandle}
        testID={testID}
      >
        <Ionicons color="#94A3B8" name="reorder-two-outline" size={20} />
      </View>
    </GestureDetector>
  );
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
    onCreateRoute,
    onEditRoute,
    onUnlinkRoute,
    isDropTarget,
    hoverSlotIndex,
    dragItem,
    onRouteDragStart,
    onDragMove,
    onDragEnd,
    onRegisterTarget,
  } = props;
  const activeRef = forwardedRef || props.ref;
  const rootRef = useRef<View>(null);
  const routesContainerRef = useRef<View>(null);
  const cardWindowYRef = useRef<number>(100);
  const routesContainerWindowYRef = useRef<number | undefined>(undefined);
  const routesContainerLayoutRef = useRef<{ y: number; height: number }>({ y: 80, height: 0 });
  const rowLayoutsRef = useRef<{ y: number; height: number }[]>([]);
  const stableRowLayoutsRef = useRef<{ y: number; height: number }[]>([]);
  const dragStartYRef = useRef<number>(0);
  const dragSourceIndexRef = useRef<number>(-1);
  const dragTranslationY = useSharedValue(0);
  const activeDragSourceIndex = useSharedValue<number>(-1);
  const activeHoverSlotIndex = useSharedValue<number>(-1);
  const isIncomingDrag = useSharedValue<boolean>(false);

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
      sortOrder: r.sortOrder ?? i,
    })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const combinedRoutesRef = useRef(combinedRoutes);
  combinedRoutesRef.current = combinedRoutes;

  const snapshotRowLayouts = () => {
    stableRowLayoutsRef.current = rowLayoutsRef.current.slice();
  };

  const getSlotIndex = (pageY: number, isReorder: boolean): number => {
    const routes = combinedRoutesRef.current;
    const count = routes.length;
    if (count === 0) return 0;

    const containerY =
      routesContainerWindowYRef.current !== undefined
        ? routesContainerWindowYRef.current
        : cardWindowYRef.current + routesContainerLayoutRef.current.y;
    const relY = pageY - containerY;

    if (isReorder) {
      const sourceIndex =
        dragSourceIndexRef.current >= 0 && dragSourceIndexRef.current < count
          ? dragSourceIndexRef.current
          : 0;
      const initialTop = sourceIndex * ROUTE_ROW_HEIGHT;
      // Following Varun Kukade's Reanimated midpoint formula:
      const dragTranslationY =
        dragStartYRef.current > 0 ? pageY - dragStartYRef.current : relY - initialTop;
      const currentTop = initialTop + dragTranslationY;
      const rawSlot = Math.floor((currentTop + ROUTE_ROW_HEIGHT / 2) / ROUTE_ROW_HEIGHT);
      return Math.max(0, Math.min(count - 1, rawSlot));
    } else {
      // Incoming unmapped route:
      const rawSlot = Math.floor((relY + ROUTE_ROW_HEIGHT / 2) / ROUTE_ROW_HEIGHT);
      return Math.max(0, Math.min(count, rawSlot));
    }
  };

  useEffect(() => {
    const target: TopoTargetMeasurable = {
      measureInWindow: (cb) => {
        snapshotRowLayouts();
        const node = rootRef.current;
        let called = false;
        measureNode(node, (x, y, w, h) => {
          if (w > 0 || h > 0) {
            called = true;
            cardWindowYRef.current = y;
            cb(x, y, w, h);
          }
        });
        const containerNode = routesContainerRef.current;
        measureNode(containerNode, (_x, y, _w, h) => {
          if (h > 0) {
            routesContainerWindowYRef.current = y;
          }
        });
        if (!called) {
          cardWindowYRef.current = 100;
          cb(0, 100, 300, 200);
        }
      },
      getSlotIndex,
    };
    onRegisterTarget?.(topo.id, target);
    return () => {
      onRegisterTarget?.(topo.id, null);
    };
  }, [topo.id, onRegisterTarget]);

  const isIncomingOnThisTopo =
    Boolean(isDropTarget) &&
    dragItem?.kind === 'unmapped' &&
    combinedRoutes.length > 0;

  useEffect(() => {
    if (isIncomingOnThisTopo) {
      isIncomingDrag.value = true;
      activeHoverSlotIndex.value = typeof hoverSlotIndex === 'number' ? hoverSlotIndex : -1;
    } else if (!isDropTarget && isIncomingDrag.value) {
      isIncomingDrag.value = false;
      activeHoverSlotIndex.value = -1;
    }
  }, [isIncomingOnThisTopo, isDropTarget, hoverSlotIndex, isIncomingDrag, activeHoverSlotIndex]);


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
      style={styles.card}
      testID={`crag-detail:topo:${topo.id}`}
    >

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
              style={styles.thumbnailImage as any}
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
      <View
        ref={routesContainerRef}
        onLayout={(e) => {
          routesContainerLayoutRef.current = e.nativeEvent.layout;
        }}
        style={[
          styles.routesContainer,
          isDropTarget && styles.routesContainerDropTarget,
          isIncomingOnThisTopo && { paddingBottom: 10 + ROUTE_ROW_HEIGHT },
        ]}
        testID={
          isDropTarget
            ? `crag-detail:topo:${topo.id}:drop-target`
            : `crag-detail:topo:${topo.id}:routes-list`
        }
      >
        {combinedRoutes.length > 0 ? (
          <>
            {combinedRoutes.map((item, index) => {
              const isLocal = item.kind === 'local';
              const name = isLocal ? item.route.name || `Route ${index + 1}` : item.route.name;
              const grade = isLocal ? item.route.grade : item.route.gradeYds;
              const routeId = isLocal ? item.route.id : item.route.appId;

              let displayMarker = index + 1;
              if (typeof hoverSlotIndex === 'number' && isIncomingOnThisTopo) {
                if (index >= hoverSlotIndex) displayMarker = index + 2;
              }

              const isEditableLocal = isLocal && Boolean(onEditRoute);

              return (
                <AnimatedRouteRow
                  activeDragSourceIndex={activeDragSourceIndex}
                  activeHoverSlotIndex={activeHoverSlotIndex}
                  dragTranslationY={dragTranslationY}
                  index={index}
                  isIncomingDrag={isIncomingDrag}
                  key={`${item.kind}-${routeId}`}
                >
                  <View
                    onLayout={(e) => {
                      rowLayoutsRef.current[index] = e.nativeEvent.layout;
                    }}
                    style={[
                      styles.routeRow,
                      index > 0 && styles.routeRowBorder,
                    ]}
                  >
                    {onRouteDragStart ? (
                      <RouteRowDragHandle
                        accessibilityLabel={`Drag to reorder ${name}`}
                        onDragEnd={() => {
                          dragTranslationY.value = 0;
                          dragSourceIndexRef.current = -1;
                          activeDragSourceIndex.value = -1;
                          activeHoverSlotIndex.value = -1;
                          isIncomingDrag.value = false;
                          onDragEnd?.();
                        }}
                        onDragMove={(pageX, pageY) => {
                          dragTranslationY.value = pageY - dragStartYRef.current;
                          const slot = getSlotIndex(pageY, true);
                          if (slot !== activeHoverSlotIndex.value) {
                            activeHoverSlotIndex.value = slot;
                          }
                          onDragMove?.(pageX, pageY);
                        }}
                        onDragStart={(pageX, pageY) => {
                          dragStartYRef.current = pageY;
                          dragSourceIndexRef.current = index;
                          activeDragSourceIndex.value = index;
                          activeHoverSlotIndex.value = index;
                          isIncomingDrag.value = false;
                          dragTranslationY.value = 0;
                          snapshotRowLayouts();
                          onRouteDragStart(topo.id, item, index, pageX, pageY);
                        }}
                        testID={
                          isLocal
                            ? `crag-detail:topo:${topo.id}:route:${item.route.id}:drag-handle`
                            : `crag-detail:topo:${topo.id}:tabvar-route:${item.route.appId}:drag-handle`
                        }
                      />
                    ) : null}

                    <Pressable
                      accessibilityLabel={isEditableLocal ? `Edit route ${name}` : undefined}
                      accessibilityRole={isEditableLocal ? 'button' : undefined}
                      disabled={!isEditableLocal}
                      onPress={isEditableLocal ? () => onEditRoute?.(item.route) : undefined}
                      style={({ pressed }) => [
                        styles.routeMainContent,
                        isEditableLocal && pressed && styles.pressed,
                      ]}
                      testID={`crag-detail:topo:${topo.id}:route-row:${routeId}`}
                    >
                      <View style={styles.routeMarker}>
                        {isLocal && item.route.color ? (
                          <View style={[styles.colorDot, { backgroundColor: item.route.color }]} />
                        ) : null}
                        <Text style={styles.markerIndex}>{displayMarker}</Text>
                      </View>

                      <View style={styles.routeNameContainer}>
                        <Text numberOfLines={1} style={styles.routeName}>
                          {name}
                        </Text>
                        {grade ? <Text style={styles.routeGrade}>{grade}</Text> : null}
                      </View>

                      <View
                        style={[styles.badge, isLocal ? styles.localBadge : styles.tabvarBadge]}
                        testID={
                          isLocal
                            ? `crag-detail:topo:${topo.id}:route:${item.route.id}:badge`
                            : `crag-detail:topo:${topo.id}:tabvar-route:${item.route.appId}:badge`
                        }
                      >
                        <Text style={[styles.badgeText, isLocal ? styles.localBadgeText : styles.tabvarBadgeText]}>
                          {isLocal ? 'Local' : 'TABVAR'}
                        </Text>
                      </View>

                      {isEditableLocal ? (
                        <Ionicons color="#94A3B8" name="chevron-forward" size={14} />
                      ) : null}
                    </Pressable>

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
                  </View>
                </AnimatedRouteRow>
              );
            })}
          </>
        ) : (
          <Text style={styles.emptyRoutesText}>No routes mapped on this topo yet.</Text>
        )}
      </View>

      {/* ── Route Actions (Create) ──────────────────────────────────────── */}
      {onCreateRoute ? (
        <View style={styles.cardFooter}>
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
  cardFooter: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 0,
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
  dragHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none' } as any) : null),
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
  routeMainContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
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
    borderColor: '#F1F5F9',
    borderWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 13,
    paddingTop: 8,
  },
  routesContainerDropTarget: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
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
