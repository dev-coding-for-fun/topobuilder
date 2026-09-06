import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { TopoCard } from '@/ui/TopoCard';
import { TopoInfoSheet } from '@/ui/TopoInfoSheet';
import { RouteEditSheet } from '@/ui/RouteEditSheet';
import { UnmappedRoutesDrawer } from '@/ui/UnmappedRoutesDrawer';

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
  | { kind: 'route-edit'; route: Route }
  | { kind: 'link-route-to-topo'; sector: SectorWithTopos; topo: TopoWithRoutes };

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

  const [draggingRoute, setDraggingRoute] = useState<TabvarRoute | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTopoId, setHoveredTopoId] = useState<string | null>(null);
  const [screenOffset, setScreenOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [chipSize, setChipSize] = useState<{ width: number; height: number }>({ width: 140, height: 36 });

  const screenRef = useRef<View>(null);
  const draggingRouteRef = useRef<TabvarRoute | null>(null);
  const hoveredTopoIdRef = useRef<string | null>(null);
  const topoCardRefs = useRef<
    Map<string, { measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void }>
  >(new Map());
  const topoCardLayouts = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());

  useEffect(() => {
    draggingRouteRef.current = draggingRoute;
  }, [draggingRoute]);

  useEffect(() => {
    hoveredTopoIdRef.current = hoveredTopoId;
  }, [hoveredTopoId]);

  const updateScreenOffset = useCallback(() => {
    screenRef.current?.measureInWindow?.((x, y) => {
      if (typeof x === 'number' && typeof y === 'number') {
        setScreenOffset({ x: Math.max(0, x), y: Math.max(0, y) });
      }
    });
  }, []);

  const handleDragStart = useCallback(
    (route: TabvarRoute, pageX: number, pageY: number) => {
      draggingRouteRef.current = route;
      setDraggingRoute(route);
      setDragPosition({ x: pageX, y: pageY });
      hoveredTopoIdRef.current = null;
      setHoveredTopoId(null);
      updateScreenOffset();

      topoCardRefs.current.forEach((el, id) => {
        if (typeof el?.measureInWindow === 'function') {
          el.measureInWindow((x, y, width, height) => {
            topoCardLayouts.current.set(id, { x, y, width, height });
          });
        }
      });
    },
    [updateScreenOffset],
  );

  const handleDragMove = useCallback((pageX: number, pageY: number) => {
    setDragPosition({ x: pageX, y: pageY });
    let matchedTopoId: string | null = null;
    for (const [id, rect] of topoCardLayouts.current.entries()) {
      const isFingerInside =
        rect.width > 0 &&
        rect.height > 0 &&
        pageX >= rect.x &&
        pageX <= rect.x + rect.width &&
        pageY >= rect.y &&
        pageY <= rect.y + rect.height;

      const isChipInside =
        rect.width > 0 &&
        rect.height > 0 &&
        pageX >= rect.x &&
        pageX <= rect.x + rect.width &&
        pageY - 40 >= rect.y &&
        pageY - 40 <= rect.y + rect.height;

      if (isFingerInside || isChipInside) {
        matchedTopoId = id;
        break;
      }
    }
    hoveredTopoIdRef.current = matchedTopoId;
    setHoveredTopoId(matchedTopoId);
  }, []);

  const handleDragEnd = useCallback(async () => {
    const route = draggingRouteRef.current;
    const targetTopoId = hoveredTopoIdRef.current;

    draggingRouteRef.current = null;
    hoveredTopoIdRef.current = null;
    setDraggingRoute(null);
    setHoveredTopoId(null);

    if (targetTopoId && route) {
      await linkTabvarRoute(targetTopoId, route.appId);
      await refresh();
    }
  }, [linkTabvarRoute, refresh]);

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

  function handleOpenLinkRouteForTopo(sector: SectorWithTopos, topo: TopoWithRoutes) {
    const unmapped = sector.unmappedRoutes ?? [];
    if (unmapped.length === 0) {
      return;
    }
    setSheet({ kind: 'link-route-to-topo', sector, topo });
  }

  async function handleCreateRouteForTopo(topo: TopoWithRoutes) {
    const newRoute = await createRoute(topo.id, { name: '' });
    await refresh();
    setSheet({ kind: 'route-edit', route: newRoute });
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
        <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.summary} testID="crag-detail:summary">
          {sectors.length} {sectors.length === 1 ? 'sector' : 'sectors'} · {topoCount}{' '}
          {topoCount === 1 ? 'topo' : 'topos'}
        </Text>

        {sectors.map((sector, index) => {
          const hasEligibleRoutes = (sector.unmappedRoutes?.length ?? 0) > 0;
          return (
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
                    canLinkRoute={hasEligibleRoutes}
                    isDropTarget={hoveredTopoId === topo.id}
                    onCreateRoute={() => void handleCreateRouteForTopo(topo)}
                    onEditRoute={(route) => handleEditRouteForTopo(route)}
                    onLinkRoute={
                      hasEligibleRoutes
                        ? () => handleOpenLinkRouteForTopo(sector, topo)
                        : undefined
                    }
                    onMenu={() => setSheet({ kind: 'topo-menu', sector, topo })}
                    onOpen={() =>
                      router.push(`/crags/${crag.id}/topos/${topo.id}/editor`)
                    }
                    onRegisterTarget={(id, target) => {
                      if (target) topoCardRefs.current.set(id, target);
                      else topoCardRefs.current.delete(id);
                    }}
                    onShare={() => setShareScope({ kind: 'topo', name: topo.name, topoId: topo.id })}
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
                onDragStart={handleDragStart}
                routes={sector.unmappedRoutes ?? []}
                sectorId={sector.id}
                topos={sector.topos}
              />
            </View>
          </View>
        );
      })}

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



      {/* ── Link route to topo from TopoCard ────────────── */}
      {sheet?.kind === 'link-route-to-topo' ? (
        <ActionSheet
          items={(sheet.sector.unmappedRoutes ?? []).map<ActionItem>((r) => ({
            id: r.appId,
            label: `${r.name}${r.gradeYds ? ` (${r.gradeYds})` : ''}`,
            icon: 'trail-sign-outline',
            onPress: async () => {
              if (sheet.kind === 'link-route-to-topo') {
                await linkTabvarRoute(sheet.topo.id, r.appId);
                await refresh();
                setSheet(undefined);
              }
            },
          }))}
          onClose={() => setSheet(undefined)}
          testID="crag-detail:link-route-picker"
          title={`Link route to “${sheet.topo.name}”`}
          visible
        />
      ) : null}

      <ShareSheet onClose={() => setShareScope(undefined)} scope={shareScope} />

      {/* ── Floating Drag Preview Chip ──── */}
      {draggingRoute ? (
        <View
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setChipSize({ width, height });
            }
          }}
          pointerEvents="none"
          style={[
            styles.dragPreview,
            hoveredTopoId ? styles.dragPreviewHovered : null,
            {
              left: Math.max(8, dragPosition.x - screenOffset.x - (chipSize.width > 0 ? chipSize.width : 140) / 2),
              top: Math.max(8, dragPosition.y - screenOffset.y - (chipSize.height > 0 ? chipSize.height : 36) - 16),
            },
          ]}
          testID="crag-detail:drag-preview"
        >
          <Ionicons
            color={hoveredTopoId ? '#16A34A' : '#2563EB'}
            name="trail-sign"
            size={16}
          />
          <Text numberOfLines={1} style={styles.dragPreviewText}>
            {draggingRoute.name}
          </Text>
          {hoveredTopoId ? (
            <View style={styles.dragPreviewDropBadge}>
              <Ionicons color="#16A34A" name="checkmark-circle" size={14} />
            </View>
          ) : null}
        </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    transform: [{ scale: 1.05 }],
    zIndex: 9999,
  },
  dragPreviewHovered: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
    transform: [{ scale: 1.08 }],
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
