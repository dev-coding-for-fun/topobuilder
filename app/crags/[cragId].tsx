import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CragDetail, SectorWithTopos, TopoWithRoutes } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';
import { ActionSheet, type ActionItem } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { interStyle } from '@/ui/fonts';
import { NameEntrySheet } from '@/ui/NameEntrySheet';
import { Screen } from '@/ui/Screen';
import { SectorHeader } from '@/ui/SectorHeader';
import { ShareSheet, type ShareScope } from '@/ui/ShareSheet';
import { TopoInfoSheet } from '@/ui/TopoInfoSheet';
import { TopoRow } from '@/ui/TopoRow';

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
  | { kind: 'topo-info'; topoId: string };

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

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="crag-detail:screen">
      <Stack.Screen
        options={{
          title: crag.name,
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Back to crags"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.replace('/')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
            >
              <Ionicons color="#111827" name="arrow-back" size={22} />
            </Pressable>
          ),
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

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.summary} testID="crag-detail:summary">
          {sectors.length} {sectors.length === 1 ? 'sector' : 'sectors'} · {topoCount}{' '}
          {topoCount === 1 ? 'topo' : 'topos'}
        </Text>

        {sectors.map((sector, index) => (
          <View
            key={sector.id}
            style={[styles.sectorBlock, index > 0 && styles.sectorBlockSpaced]}
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
                <TopoRow
                  key={topo.id}
                  onMenu={() => setSheet({ kind: 'topo-menu', sector, topo })}
                  onOpen={() =>
                    router.push(`/crags/${crag.id}/topos/${topo.id}/editor`)
                  }
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

      <ShareSheet onClose={() => setShareScope(undefined)} scope={shareScope} />
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
        message={
          topo
            ? `Delete “${topo.name}” and its ${topo.routes.length} ${
                topo.routes.length === 1 ? 'route' : 'routes'
              }? This cannot be undone.`
            : ''
        }
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
