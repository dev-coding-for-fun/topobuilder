import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { CragDetail, Route, SectorWithTopos, TabvarRoute, TopoWithRoutes } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';
import { ActionSheet, type ActionItem } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { interStyle } from '@/ui/fonts';
import { NameEntrySheet } from '@/ui/NameEntrySheet';
import { Screen } from '@/ui/Screen';
import { SectorHeader } from '@/ui/SectorHeader';
import { ShareSheet, type ShareScope } from '@/ui/ShareSheet';
import { TopoCard, type TopoTargetMeasurable, type UnifiedRoute } from '@/ui/TopoCard';
import { TopoInfoSheet } from '@/ui/TopoInfoSheet';
import { RouteEditSheet } from '@/ui/RouteEditSheet';
import { UnmappedRoutesDrawer } from '@/ui/UnmappedRoutesDrawer';

type ActiveDrag =
  | { kind: 'unmapped'; route: TabvarRoute; name: string }
  | { kind: 'topo-route'; topoId: string; item: UnifiedRoute; index: number; name: string };

type Sheet =
  | { kind: 'crag-menu' }
  | { kind: 'rename-crag' }
  | { kind: 'delete-crag' }
  | { kind: 'add-sector' }
  | { kind: 'sector-menu'; sector: SectorWithTopos }
  | { kind: 'rename-sector'; sector: SectorWithTopos }
  | { kind: 'delete-sector'; sector: SectorWithTopos }
  | { kind: 'topo-menu'; sector: SectorWithTopos; topo: TopoWithRoutes }
  | { kind: 'rename-topo'; topo: TopoWithRoutes }
  | { kind: 'delete-topo'; topo: TopoWithRoutes }
  | { kind: 'pick-sector-for-topo' }
  | { kind: 'topo-info'; topoId: string }
  | { kind: 'route-edit'; route: Route };

export default function CragDetailScreen() {
  const { cragId } = useLocalSearchParams<{ cragId: string }>();
  const {
    isReady,
    loadCragDetail,
    renameCrag,
    deleteCrag,
    createSector,
    renameSector,
    deleteSector,
    createTopo,
    renameTopo,
    deleteTopo,
    createRoute,
    linkTabvarRoute,
    unlinkTabvarRoute,
    reorderTopoRoutes,
  } = useTopoStore();

  const [detail, setDetail] = useState<CragDetail>();
  const [sheet, setSheet] = useState<Sheet>();
  const [shareScope, setShareScope] = useState<ShareScope>();

  const refresh = useCallback(async () => {
    if (!cragId || !isReady) return;
    setDetail(await loadCragDetail(cragId));
  }, [cragId, isReady, loadCragDetail]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [hoveredTopoId, setHoveredTopoId] = useState<string | null>(null);
  const [hoverSlotIndex, setHoverSlotIndex] = useState<number | undefined>(undefined);

  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const isDraggingSV = useSharedValue(0);
  const screenOffsetX = useSharedValue(0);
  const screenOffsetY = useSharedValue(0);
  const chipWidth = useSharedValue(140);
  const chipHeight = useSharedValue(36);

  const animatedChipStyle = useAnimatedStyle(() => {
    'worklet';
    const left = dragTranslateX.value - screenOffsetX.value - chipWidth.value / 2;
    const top = dragTranslateY.value - screenOffsetY.value - chipHeight.value - 16;
    return {
      transform: [
        { translateX: Math.max(8, left) },
        { translateY: Math.max(8, top) },
        { scale: interpolate(isDraggingSV.value, [0, 1], [0.95, 1.05]) },
      ],
      opacity: isDraggingSV.value,
    };
  });

  const screenRef = useRef<View>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const hoveredTopoIdRef = useRef<string | null>(null);
  const hoverSlotIndexRef = useRef<number | undefined>(undefined);
  const topoCardRefs = useRef<Map<string, TopoTargetMeasurable>>(new Map());
  const topoCardLayouts = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const detailRef = useRef<CragDetail | undefined>(detail);

  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  useEffect(() => {
    activeDragRef.current = activeDrag;
  }, [activeDrag]);

  useEffect(() => {
    hoveredTopoIdRef.current = hoveredTopoId;
  }, [hoveredTopoId]);

  useEffect(() => {
    hoverSlotIndexRef.current = hoverSlotIndex;
  }, [hoverSlotIndex]);

  const updateScreenOffset = useCallback(() => {
    screenRef.current?.measureInWindow?.((x, y) => {
      if (typeof x === 'number' && typeof y === 'number') {
        screenOffsetX.value = Math.max(0, x);
        screenOffsetY.value = Math.max(0, y);
      }
    });
  }, [screenOffsetX, screenOffsetY]);

  const handleUnmappedDragStart = useCallback(
    (route: TabvarRoute, pageX: number, pageY: number) => {
      const drag: ActiveDrag = {
        kind: 'unmapped',
        route,
        name: route.name,
      };
      activeDragRef.current = drag;
      setActiveDrag(drag);

      dragTranslateX.value = pageX;
      dragTranslateY.value = pageY;
      isDraggingSV.value = withSpring(1);

      hoveredTopoIdRef.current = null;
      setHoveredTopoId(null);
      hoverSlotIndexRef.current = undefined;
      setHoverSlotIndex(undefined);
      updateScreenOffset();

      topoCardRefs.current.forEach((el, id) => {
        if (typeof el?.measureInWindow === 'function') {
          el.measureInWindow((x, y, width, height) => {
            topoCardLayouts.current.set(id, { x, y, width, height });
          });
        }
      });
    },
    [updateScreenOffset, dragTranslateX, dragTranslateY, isDraggingSV],
  );

  const handleTopoRouteDragStart = useCallback(
    (topoId: string, item: UnifiedRoute, index: number, pageX: number, pageY: number) => {
      const isLocal = item.kind === 'local';
      const name = isLocal ? item.route.name || `Route ${index + 1}` : item.route.name;
      const drag: ActiveDrag = {
        kind: 'topo-route',
        topoId,
        item,
        index,
        name,
      };
      activeDragRef.current = drag;
      setActiveDrag(drag);

      dragTranslateX.value = pageX;
      dragTranslateY.value = pageY;
      isDraggingSV.value = withSpring(1);

      hoveredTopoIdRef.current = topoId;
      setHoveredTopoId(topoId);
      hoverSlotIndexRef.current = index;
      setHoverSlotIndex(index);
      updateScreenOffset();

      topoCardRefs.current.forEach((el, id) => {
        if (typeof el?.measureInWindow === 'function') {
          el.measureInWindow((x, y, width, height) => {
            topoCardLayouts.current.set(id, { x, y, width, height });
          });
        }
      });
    },
    [updateScreenOffset, dragTranslateX, dragTranslateY, isDraggingSV],
  );

  const handleDragMove = useCallback((pageX: number, pageY: number) => {
    dragTranslateX.value = pageX;
    dragTranslateY.value = pageY;

    const drag = activeDragRef.current;
    if (!drag) return;

    let matchedTopoId: string | null = null;
    let slotIndex: number | undefined = undefined;

    if (drag.kind === 'topo-route') {
      const rect = topoCardLayouts.current.get(drag.topoId);
      const marginX = 80;
      const marginY = 60;
      const isInside =
        rect &&
        rect.width > 0 &&
        rect.height > 0 &&
        pageX >= rect.x - marginX &&
        pageX <= rect.x + rect.width + marginX &&
        pageY >= rect.y - marginY &&
        pageY <= rect.y + rect.height + marginY;

      if (isInside || !rect) {
        matchedTopoId = drag.topoId;
        const target = topoCardRefs.current.get(drag.topoId);
        if (target && typeof target.getSlotIndex === 'function') {
          slotIndex = target.getSlotIndex(pageY, true);
        }
      }
    } else {
      for (const [id, rect] of topoCardLayouts.current.entries()) {
        const isFingerInside =
          rect.width > 0 &&
          rect.height > 0 &&
          pageX >= rect.x - 10 &&
          pageX <= rect.x + rect.width + 10 &&
          pageY >= rect.y &&
          pageY <= rect.y + rect.height;

        const isChipInside =
          rect.width > 0 &&
          rect.height > 0 &&
          pageX >= rect.x - 10 &&
          pageX <= rect.x + rect.width + 10 &&
          pageY - 40 >= rect.y &&
          pageY - 40 <= rect.y + rect.height;

        if (isFingerInside || isChipInside) {
          matchedTopoId = id;
          const target = topoCardRefs.current.get(id);
          if (target && typeof target.getSlotIndex === 'function') {
            slotIndex = target.getSlotIndex(pageY, false);
          }
          break;
        }
      }
    }

    const isSameTopoReorder =
      drag.kind === 'topo-route' && matchedTopoId === drag.topoId;

    if (
      matchedTopoId !== hoveredTopoIdRef.current ||
      slotIndex !== hoverSlotIndexRef.current
    ) {
      hoveredTopoIdRef.current = matchedTopoId;
      hoverSlotIndexRef.current = slotIndex;

      // TopoCard manages in-card displacement entirely on the UI thread via
      // Reanimated SharedValues. Avoid full-screen React re-renders while dragging inside the card.
      if (!isSameTopoReorder) {
        setHoveredTopoId(matchedTopoId);
        setHoverSlotIndex(slotIndex);
      }
    }
  }, [dragTranslateX, dragTranslateY]);

  const handleDragEnd = useCallback(async () => {
    isDraggingSV.value = withTiming(0, { duration: 150 });
    const drag = activeDragRef.current;
    const targetTopoId = hoveredTopoIdRef.current;
    const targetSlotIndex = hoverSlotIndexRef.current;

    activeDragRef.current = null;
    hoveredTopoIdRef.current = null;
    hoverSlotIndexRef.current = undefined;

    if (!drag || !targetTopoId) {
      setActiveDrag(null);
      setHoveredTopoId(null);
      setHoverSlotIndex(undefined);
      return;
    }

    if (drag.kind === 'topo-route' && targetTopoId === drag.topoId) {
      const currentDetail = detailRef.current;
      let sourceTopo: TopoWithRoutes | undefined;
      for (const s of currentDetail?.sectors ?? []) {
        const found = s.topos.find((t) => t.id === targetTopoId);
        if (found) {
          sourceTopo = found;
          break;
        }
      }
      if (!sourceTopo) {
        setActiveDrag(null);
        setHoveredTopoId(null);
        setHoverSlotIndex(undefined);
        return;
      }

      const local = sourceTopo.routes ?? [];
      const tabvar = sourceTopo.tabvarRoutes ?? [];
      const combined: UnifiedRoute[] = [
        ...local.map((r, i) => ({ kind: 'local' as const, route: r, sortOrder: r.sortOrder ?? i })),
        ...tabvar.map((r, i) => ({ kind: 'tabvar' as const, route: r, sortOrder: r.sortOrder ?? i })),
      ].sort((a, b) => a.sortOrder - b.sortOrder);

      const fromIndex = drag.index;
      const toIndex = typeof targetSlotIndex === 'number' ? targetSlotIndex : fromIndex;

      if (fromIndex !== toIndex && fromIndex >= 0 && fromIndex < combined.length) {
        const reordered = [...combined];
        const [moved] = reordered.splice(fromIndex, 1);
        if (moved) {
          reordered.splice(toIndex, 0, moved);

          // Optimistically update React state immediately on the drop frame
          if (currentDetail) {
            const updatedSectors = currentDetail.sectors.map((s) => ({
              ...s,
              topos: s.topos.map((t) => {
                if (t.id !== targetTopoId) return t;
                const newLocal: Route[] = [];
                const newTabvar: TabvarRoute[] = [];
                reordered.forEach((item, i) => {
                  if (item.kind === 'local') {
                    newLocal.push({ ...item.route, sortOrder: i });
                  } else {
                    newTabvar.push({ ...item.route, sortOrder: i });
                  }
                });
                return {
                  ...t,
                  routes: newLocal,
                  tabvarRoutes: newTabvar,
                };
              }),
            }));
            setDetail({ ...currentDetail, sectors: updatedSectors });
          }

          setActiveDrag(null);
          setHoveredTopoId(null);
          setHoverSlotIndex(undefined);

          const orderedRoutes = reordered.map((r) =>
            r.kind === 'local'
              ? { kind: 'local' as const, id: r.route.id }
              : { kind: 'tabvar' as const, appId: r.route.appId },
          );
          await reorderTopoRoutes(targetTopoId, orderedRoutes);
          await refresh();
          return;
        }
      }
      setActiveDrag(null);
      setHoveredTopoId(null);
      setHoverSlotIndex(undefined);
    } else if (drag.kind === 'unmapped') {
      const currentDetail = detailRef.current;
      if (currentDetail) {
        const updatedSectors = currentDetail.sectors.map((s) => ({
          ...s,
          topos: s.topos.map((t) => {
            if (t.id !== targetTopoId) return t;
            const existingLocal = t.routes ?? [];
            const existingTabvar = t.tabvarRoutes ?? [];
            const combined: UnifiedRoute[] = [
              ...existingLocal.map((r, i) => ({ kind: 'local' as const, route: r, sortOrder: r.sortOrder ?? i })),
              ...existingTabvar.map((r, i) => ({ kind: 'tabvar' as const, route: r, sortOrder: r.sortOrder ?? i })),
            ].sort((a, b) => a.sortOrder - b.sortOrder);

            const insertIndex = typeof targetSlotIndex === 'number' ? targetSlotIndex : combined.length;
            combined.splice(insertIndex, 0, {
              kind: 'tabvar',
              route: { ...drag.route, sortOrder: insertIndex },
              sortOrder: insertIndex,
            });

            const newLocal: Route[] = [];
            const newTabvar: TabvarRoute[] = [];
            combined.forEach((item, i) => {
              if (item.kind === 'local') {
                newLocal.push({ ...item.route, sortOrder: i });
              } else {
                newTabvar.push({ ...item.route, sortOrder: i });
              }
            });
            return {
              ...t,
              routes: newLocal,
              tabvarRoutes: newTabvar,
            };
          }),
        }));
        setDetail({ ...currentDetail, sectors: updatedSectors });
      }

      setActiveDrag(null);
      setHoveredTopoId(null);
      setHoverSlotIndex(undefined);

      await linkTabvarRoute(targetTopoId, drag.route.appId, targetSlotIndex);
      await refresh();
    }
  }, [linkTabvarRoute, reorderTopoRoutes, refresh]);

  if (!detail) {
    return (
      <Screen style={styles.center} testID="crag-detail:loading">
        <Stack.Screen options={{ title: '' }} />
        <Text>Loading…</Text>
      </Screen>
    );
  }

  const { crag, sectors } = detail;
  const topoCount = sectors.reduce((sum, s) => sum + s.topos.length, 0);

  async function handleAddTopo(sector: SectorWithTopos) {
    const topo = await createTopo(sector.id);
    await refresh();
    router.push(`/crags/${crag.id}/topos/${topo.id}/editor`);
  }

  async function handleAddTopoForRoute(sector: SectorWithTopos, route: TabvarRoute) {
    const topo = await createTopo(sector.id, route.name);
    await linkTabvarRoute(topo.id, route.appId);
    await refresh();
    router.push(`/crags/${crag.id}/topos/${topo.id}/editor`);
  }

  async function handleCreateRouteForTopo(topo: TopoWithRoutes) {
    const newRoute = await createRoute(topo.id, { name: '' });
    await refresh();
    setSheet({ kind: 'route-edit', route: newRoute });
  }

  async function handleUnlinkRouteFromTopo(topo: TopoWithRoutes, route: TabvarRoute) {
    await unlinkTabvarRoute(topo.id, route.appId);
    await refresh();
  }

  function handleEditRouteForTopo(route: Route) {
    setSheet({ kind: 'route-edit', route });
  }

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="crag-detail:screen">
      <Stack.Screen
        options={{
          title: crag.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel={`Share ${crag.name}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setShareScope({ kind: 'crag', cragId: crag.id, name: crag.name })}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
                testID="crag-detail:header:share"
              >
                <Ionicons color="#111827" name="share-outline" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Crag options"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSheet({ kind: 'crag-menu' })}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
                testID="crag-detail:header:menu"
              >
                <Ionicons color="#111827" name="ellipsis-horizontal" size={22} />
              </Pressable>
            </View>
          ),
        }}
      />

      <View onLayout={updateScreenOffset} ref={screenRef} style={styles.screenContent}>
        <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={!activeDrag}>
        <Text style={styles.summary} testID="crag-detail:summary">
          {sectors.length} {sectors.length === 1 ? 'sector' : 'sectors'} · {topoCount}{' '}
          {topoCount === 1 ? 'topo' : 'topos'}
        </Text>

        {sectors.map((sector, index) => (
            <View
              key={sector.id}
              style={[styles.sectorBlock, index > 0 && styles.sectorBlockSpaced]}
              testID={`crag-detail:sector-container:${sector.id}`}
            >
              <SectorHeader
                name={sector.name}
                onMenu={() => setSheet({ kind: 'sector-menu', sector })}
                onShare={() => setShareScope({ kind: 'sector', name: sector.name, sectorId: sector.id })}
                sectorId={sector.id}
                topoCount={sector.topos.length}
              />
              <View style={styles.toposGroup}>
                {sector.topos.map((topo) => (
                  <TopoCard
                    key={topo.id}
                    dragItem={activeDrag}
                    hoverSlotIndex={hoveredTopoId === topo.id ? hoverSlotIndex : undefined}
                    isDropTarget={hoveredTopoId === topo.id}
                    onCreateRoute={() => void handleCreateRouteForTopo(topo)}
                    onDragEnd={handleDragEnd}
                    onDragMove={handleDragMove}
                    onEditRoute={(route) => handleEditRouteForTopo(route)}
                    onMenu={() => setSheet({ kind: 'topo-menu', sector, topo })}
                    onOpen={() =>
                      router.push(`/crags/${crag.id}/topos/${topo.id}/editor`)
                    }
                    onRegisterTarget={(id, target) => {
                      if (target) topoCardRefs.current.set(id, target);
                      else topoCardRefs.current.delete(id);
                    }}
                    onRouteDragStart={handleTopoRouteDragStart}
                    onShare={() => setShareScope({ kind: 'topo', name: topo.name, topoId: topo.id })}
                    onUnlinkRoute={(route) => void handleUnlinkRouteFromTopo(topo, route)}
                    topo={topo}
                  />
                ))}
              <Button
                label="+ Add topo"
                onPress={() => {
                  void handleAddTopo(sector);
                }}
                testID={`crag-detail:sector:${sector.id}:add-topo`}
                variant="secondary"
              />
              <UnmappedRoutesDrawer
                onAddTopoForRoute={(route) => {
                  void handleAddTopoForRoute(sector, route);
                }}
                onDragEnd={handleDragEnd}
                onDragMove={handleDragMove}
                onDragStart={handleUnmappedDragStart}
                routes={sector.unmappedRoutes ?? []}
                sectorId={sector.id}
                topos={sector.topos}
              />
            </View>
          </View>
        ))}

        <View style={styles.addSectorWrap}>
          <Button
            label="+ Add sector"
            onPress={() => setSheet({ kind: 'add-sector' })}
            testID="crag-detail:add-sector"
            variant="secondary"
          />
        </View>
      </ScrollView>

      {/* ── Crag menu ───────────────────────────── */}
      <ActionSheet
        items={[
          {
            id: 'rename',
            label: 'Rename crag',
            icon: 'create-outline',
            onPress: () => setSheet({ kind: 'rename-crag' }),
          },
          {
            id: 'delete',
            label: 'Delete crag',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setSheet({ kind: 'delete-crag' }),
          },
        ]}
        onClose={() => setSheet(undefined)}
        testID="crag-detail:crag-menu"
        title={crag.name}
        visible={sheet?.kind === 'crag-menu'}
      />

      <NameEntrySheet
        confirmLabel="Save"
        defaultValue={crag.name}
        onCancel={() => setSheet(undefined)}
        onConfirm={async (name) => {
          await renameCrag(crag.id, name);
          await refresh();
          setSheet(undefined);
        }}
        testID="crag-detail:rename-crag"
        title="Rename crag"
        visible={sheet?.kind === 'rename-crag'}
      />

      <ConfirmSheet
        confirmLabel="Delete crag"
        message={`Delete “${crag.name}” and everything inside it? This cannot be undone.`}
        onCancel={() => setSheet(undefined)}
        onConfirm={async () => {
          await deleteCrag(crag.id);
          setSheet(undefined);
          router.replace('/');
        }}
        testID="crag-detail:delete-crag"
        title="Delete crag?"
        visible={sheet?.kind === 'delete-crag'}
      />

      {/* ── Add sector ──────────────────────────── */}
      <NameEntrySheet
        confirmLabel="Add sector"
        onCancel={() => setSheet(undefined)}
        onConfirm={async (name) => {
          await createSector(crag.id, name);
          await refresh();
          setSheet(undefined);
        }}
        placeholder="e.g. Yellow Wall"
        testID="crag-detail:add-sector-sheet"
        title="New sector"
        visible={sheet?.kind === 'add-sector'}
      />

      {/* ── Sector menu / rename / delete ───────── */}
      <SectorMenuSheets
        deleteSector={deleteSector}
        onClose={() => setSheet(undefined)}
        refresh={refresh}
        renameSector={renameSector}
        sheet={sheet}
        setSheet={setSheet}
      />

      {/* ── Topo menu / rename / delete / info ──── */}
      <TopoMenuSheets
        deleteTopo={deleteTopo}
        onClose={() => setSheet(undefined)}
        refresh={refresh}
        renameTopo={renameTopo}
        sheet={sheet}
        setSheet={setSheet}
      />

      {/* ── New topo: pick a sector when there are >1 ── */}
      <ActionSheet
        items={sectors.map<ActionItem>((sector) => ({
          id: sector.id,
          label: sector.name,
          icon: 'layers-outline',
          onPress: () => {
            void handleAddTopo(sector);
          },
        }))}
        onClose={() => setSheet(undefined)}
        testID="crag-detail:pick-sector"
        title="Add topo to which sector?"
        visible={sheet?.kind === 'pick-sector-for-topo'}
      />

      <TopoInfoSheet
        onAfterChange={() => {
          void refresh();
        }}
        onClose={() => setSheet(undefined)}
        topoId={sheet?.kind === 'topo-info' ? sheet.topoId : undefined}
      />

      <RouteEditSheet
        onAfterChange={() => {
          void refresh();
        }}
        onClose={() => setSheet(undefined)}
        route={sheet?.kind === 'route-edit' ? sheet.route : undefined}
      />




      <ShareSheet onClose={() => setShareScope(undefined)} scope={shareScope} />

      {/* ── Floating Drag Preview Chip ──── */}
      {activeDrag && activeDrag.kind === 'unmapped' ? (
        <Animated.View
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              chipWidth.value = width;
              chipHeight.value = height;
            }
          }}
          pointerEvents="none"
          style={[
            styles.dragPreview,
            hoveredTopoId ? styles.dragPreviewHovered : null,
            animatedChipStyle,
          ]}
          testID="crag-detail:drag-preview"
        >
          <Ionicons
            color={hoveredTopoId ? '#16A34A' : '#2563EB'}
            name="trail-sign"
            size={16}
          />
          <Text numberOfLines={1} style={styles.dragPreviewText}>
            {activeDrag.name}
          </Text>
          {hoveredTopoId ? (
            <View style={styles.dragPreviewDropBadge}>
              <Ionicons color="#16A34A" name="checkmark-circle" size={14} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
      </View>
    </Screen>
  );
}

// ── Helper sub-components for the long sheet wiring ──────────────────────

function SectorMenuSheets({
  sheet,
  setSheet,
  onClose,
  renameSector,
  deleteSector,
  refresh,
}: {
  sheet: Sheet | undefined;
  setSheet: (s: Sheet | undefined) => void;
  onClose: () => void;
  renameSector: (id: string, name: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const sector =
    sheet?.kind === 'sector-menu' ||
    sheet?.kind === 'rename-sector' ||
    sheet?.kind === 'delete-sector'
      ? sheet.sector
      : undefined;

  return (
    <>
      <ActionSheet
        items={[
          {
            id: 'rename',
            label: 'Rename sector',
            icon: 'create-outline',
            onPress: () => sector && setSheet({ kind: 'rename-sector', sector }),
          },
          {
            id: 'delete',
            label: 'Delete sector',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => sector && setSheet({ kind: 'delete-sector', sector }),
          },
        ]}
        onClose={onClose}
        testID="crag-detail:sector-menu"
        title={sector?.name}
        visible={sheet?.kind === 'sector-menu'}
      />

      <NameEntrySheet
        confirmLabel="Save"
        defaultValue={sector?.name ?? ''}
        onCancel={onClose}
        onConfirm={async (name) => {
          if (!sector) return;
          await renameSector(sector.id, name);
          await refresh();
          onClose();
        }}
        testID="crag-detail:rename-sector"
        title="Rename sector"
        visible={sheet?.kind === 'rename-sector'}
      />

      <ConfirmSheet
        confirmLabel="Delete sector"
        message={
          sector
            ? `Delete “${sector.name}” and its ${sector.topos.length} ${
                sector.topos.length === 1 ? 'topo' : 'topos'
              }? This cannot be undone.`
            : ''
        }
        onCancel={onClose}
        onConfirm={async () => {
          if (!sector) return;
          try {
            await deleteSector(sector.id);
            await refresh();
            onClose();
          } catch (error) {
            // last-sector refusal — surface as alert-like message
            console.warn(error);
            onClose();
          }
        }}
        testID="crag-detail:delete-sector"
        title="Delete sector?"
        visible={sheet?.kind === 'delete-sector'}
      />
    </>
  );
}

function TopoMenuSheets({
  sheet,
  setSheet,
  onClose,
  renameTopo,
  deleteTopo,
  refresh,
}: {
  sheet: Sheet | undefined;
  setSheet: (s: Sheet | undefined) => void;
  onClose: () => void;
  renameTopo: (id: string, name: string) => Promise<void>;
  deleteTopo: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const topo =
    sheet?.kind === 'topo-menu' || sheet?.kind === 'rename-topo' || sheet?.kind === 'delete-topo'
      ? sheet.topo
      : undefined;

  return (
    <>
      <ActionSheet
        items={[
          {
            id: 'edit-info',
            label: 'Edit topo info',
            icon: 'document-text-outline',
            onPress: () => topo && setSheet({ kind: 'topo-info', topoId: topo.id }),
          },
          {
            id: 'rename',
            label: 'Rename topo',
            icon: 'create-outline',
            onPress: () => topo && setSheet({ kind: 'rename-topo', topo }),
          },
          {
            id: 'delete',
            label: 'Delete topo',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => topo && setSheet({ kind: 'delete-topo', topo }),
          },
        ]}
        onClose={onClose}
        testID="crag-detail:topo-menu"
        title={topo?.name}
        visible={sheet?.kind === 'topo-menu'}
      />

      <NameEntrySheet
        confirmLabel="Save"
        defaultValue={topo?.name ?? ''}
        onCancel={onClose}
        onConfirm={async (name) => {
          if (!topo) return;
          await renameTopo(topo.id, name);
          await refresh();
          onClose();
        }}
        testID="crag-detail:rename-topo"
        title="Rename topo"
        visible={sheet?.kind === 'rename-topo'}
      />

      <ConfirmSheet
        confirmLabel="Delete topo"
        message={(() => {
          if (!topo) return '';
          const localCount = topo.routes.length;
          const tabvarCount = topo.tabvarRoutes?.length ?? 0;
          if (localCount > 0) {
            return `Delete “${topo.name}”? This topo has ${localCount} custom ${
              localCount === 1 ? 'route' : 'routes'
            } created on it that will be permanently deleted.${
              tabvarCount > 0
                ? ` (${tabvarCount} connected TABVAR ${
                    tabvarCount === 1 ? 'route' : 'routes'
                  } will remain in this sector as unmapped routes).`
                : ''
            }`;
          }
          return `Delete “${topo.name}”? ${
            tabvarCount > 0
              ? `(${tabvarCount} connected TABVAR ${
                  tabvarCount === 1 ? 'route' : 'routes'
                } will remain in this sector as unmapped routes).`
              : 'This cannot be undone.'
          }`;
        })()}
        onCancel={onClose}
        onConfirm={async () => {
          if (!topo) return;
          await deleteTopo(topo.id);
          await refresh();
          onClose();
        }}
        testID="crag-detail:delete-topo"
        title="Delete topo?"
        visible={sheet?.kind === 'delete-topo'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  addSectorWrap: {
    marginTop: 20,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 12,
    flexDirection: 'row',
    gap: 6,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    pointerEvents: 'none',
    position: 'absolute',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    top: 0,
    zIndex: 9999,
  },
  dragPreviewHovered: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  dragPreviewDropBadge: {
    marginLeft: 2,
  },
  dragPreviewText: {
    color: '#0F172A',
    fontSize: 13,
    maxWidth: 160,
    ...interStyle('700'),
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: 36,
  },
  iconPressed: {
    opacity: 0.6,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 48,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  sectorBlock: {
    gap: 8,
  },
  sectorBlockSpaced: {
    marginTop: 12,
  },
  summary: {
    color: '#64748B',
    fontSize: 13,
    paddingBottom: 2,
    ...interStyle('700'),
  },
  toposGroup: {
    gap: 8,
    paddingTop: 8,
  },
});
