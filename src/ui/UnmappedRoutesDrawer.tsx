import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import type { TabvarRoute, TopoWithRoutes } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type Props = {
  sectorId: string;
  routes: TabvarRoute[];
  topos: TopoWithRoutes[];
  onAddTopoForRoute: (route: TabvarRoute) => void;
  onDragStart?: (route: TabvarRoute, pageX: number, pageY: number) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
};

export function UnmappedRoutesDrawer({
  sectorId,
  routes,
  onAddTopoForRoute,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={`crag-detail:sector:${sectorId}:unmapped-drawer`}>
      {/* ── Toggle Header ─────────────────────────────────────────────── */}
      <Pressable
        accessibilityLabel={`Toggle unmapped routes (${routes.length})`}
        accessibilityRole="button"
        onPress={() => setIsExpanded((prev) => !prev)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        testID={`crag-detail:sector:${sectorId}:unmapped-toggle`}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            color="#475569"
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
          />
          <Text style={styles.headerTitle}>
            Unmapped Routes ({routes.length})
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {isExpanded ? 'Tap to hide' : 'Tap to view & drag to map'}
        </Text>
      </Pressable>

      {/* ── Expanded Content ──────────────────────────────────────────── */}
      {isExpanded ? (
        <View style={styles.content}>
          <View style={styles.routesList}>
            {routes.map((route, index) => {
              const metaParts: string[] = [];
              if (route.gradeYds) metaParts.push(route.gradeYds);
              if (route.climbStyle) metaParts.push(route.climbStyle);
              if (route.boltCount) metaParts.push(`${route.boltCount} bolts`);
              const metaText = metaParts.join(' · ');

              return (
                <View
                  key={route.appId}
                  style={[styles.routeRow, index > 0 && styles.routeRowBorder]}
                  testID={`crag-detail:sector:${sectorId}:unmapped-route:${route.appId}`}
                >
                  <DraggableRouteHandle
                    onDragEnd={onDragEnd}
                    onDragMove={onDragMove}
                    onDragStart={onDragStart}
                    route={route}
                    sectorId={sectorId}
                  />

                  <View style={styles.routeInfo}>
                    <Text numberOfLines={1} style={styles.routeName}>
                      {route.name}
                    </Text>
                    {metaText ? (
                      <Text numberOfLines={1} style={styles.routeMeta}>
                        {metaText}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      accessibilityLabel={`Add new topo for ${route.name}`}
                      accessibilityRole="button"
                      onPress={() => onAddTopoForRoute(route)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.addTopoButton,
                        pressed && styles.pressed,
                      ]}
                      testID={`crag-detail:sector:${sectorId}:unmapped-route:${route.appId}:add-topo`}
                    >
                      <Ionicons color="#0369A1" name="camera-outline" size={14} />
                      <Text style={styles.addTopoButtonText}>+ Add Topo</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DraggableRouteHandle({
  route,
  sectorId,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  route: TabvarRoute;
  sectorId: string;
  onDragStart?: (route: TabvarRoute, pageX: number, pageY: number) => void;
  onDragMove?: (pageX: number, pageY: number) => void;
  onDragEnd?: () => void;
}) {
  const panGesture = Gesture.Pan()
    .minDistance(4)
    .onStart((e) => {
      if (onDragStart) {
        runOnJS(onDragStart)(route, e.absoluteX, e.absoluteY);
      }
    })
    .onUpdate((e) => {
      if (onDragMove) {
        runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
      }
    })
    .onEnd(() => {
      if (onDragEnd) {
        runOnJS(onDragEnd)();
      }
    })
    .onFinalize(() => {
      if (onDragEnd) {
        runOnJS(onDragEnd)();
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityLabel={`Drag ${route.name} onto a topo to link`}
        accessibilityRole="button"
        style={styles.dragHandle}
        testID={`crag-detail:sector:${sectorId}:unmapped-route:${route.appId}:drag-handle`}
      >
        <Ionicons color="#94A3B8" name="reorder-two-outline" size={20} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  addTopoButton: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
  },
  addTopoButtonText: {
    color: '#0369A1',
    fontSize: 12,
    ...interStyle('700'),
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  content: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dragHandle: {
    alignItems: 'center',
    cursor: 'grab',
    height: 32,
    justifyContent: 'center',
    width: 28,
  } as any,
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    ...interStyle('400'),
  },
  headerTitle: {
    color: '#334155',
    fontSize: 14,
    ...interStyle('700'),
  },
  pressed: {
    opacity: 0.6,
  },
  routeInfo: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 6,
  },
  routeMeta: {
    color: '#64748B',
    fontSize: 12,
    ...interStyle('400'),
  },
  routeName: {
    color: '#0F172A',
    fontSize: 14,
    ...interStyle('700'),
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  routeRowBorder: {
    borderTopColor: '#F8FAFC',
    borderTopWidth: 1,
  },
  routesList: {
    marginTop: 2,
  },
});
