import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { Route, Topo } from '@/domain/types';
import { BottomSheet } from '@/ui/BottomSheet';
import { InlineRouteEditor } from '@/ui/InlineRouteEditor';
import { useTopoStore } from '@/state/TopoStore';
import { interStyle } from '@/ui/fonts';

type Props = {
  topoId: string | undefined;
  onClose: () => void;
  onAfterChange?: () => void;
};

/**
 * Topo info sheet. Reachable from the Crag detail screen's topo overflow
 * menu only (the editor never opens this — the editor is for drawing).
 */
export function TopoInfoSheet({ topoId, onClose, onAfterChange }: Props) {
  const { loadTopoInfo, renameTopo, updateTopoDescription, createRoute, updateRouteField, deleteRoute } =
    useTopoStore();
  const [topo, setTopo] = useState<Topo>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!topoId) {
      setTopo(undefined);
      setRoutes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const info = await loadTopoInfo(topoId);
      if (cancelled || !info) return;
      setTopo(info.topo);
      setRoutes(info.routes);
      setName(info.topo.name);
      setDescription(info.topo.description ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTopoInfo, topoId]);

  async function commitName() {
    if (!topo) return;
    const trimmed = name.trim() || 'Untitled topo';
    if (trimmed !== topo.name) {
      await renameTopo(topo.id, trimmed);
      setTopo({ ...topo, name: trimmed });
      onAfterChange?.();
    }
  }

  async function commitDescription() {
    if (!topo) return;
    const next = description.trim() ? description : undefined;
    if ((next ?? '') !== (topo.description ?? '')) {
      await updateTopoDescription(topo.id, next);
      setTopo({ ...topo, description: next });
      onAfterChange?.();
    }
  }

  async function handleAddRoute() {
    if (!topo) return;
    const r = await createRoute(topo.id, { name: '' });
    setRoutes((rs) => [...rs, r]);
    onAfterChange?.();
  }

  async function handleChangeRouteField(route: Route, fields: Partial<Route>) {
    const next = await updateRouteField(route, fields);
    setRoutes((rs) => rs.map((r) => (r.id === route.id ? next : r)));
    onAfterChange?.();
  }

  async function handleDeleteRoute(route: Route) {
    await deleteRoute(route.id);
    setRoutes((rs) => rs.filter((r) => r.id !== route.id));
    onAfterChange?.();
  }

  return (
    <BottomSheet
      onClose={async () => {
        await commitName();
        await commitDescription();
        onClose();
      }}
      testID="topo-info:sheet"
      title="Topo info"
      visible={Boolean(topoId)}
    >
      {topo ? (
        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              accessibilityLabel="Topo name"
              onBlur={() => {
                void commitName();
              }}
              onChangeText={setName}
              placeholder="Topo name"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              testID="topo-info:name"
              value={name}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              accessibilityLabel="Topo description"
              multiline
              onBlur={() => {
                void commitDescription();
              }}
              onChangeText={setDescription}
              placeholder="Approach notes, location, etc."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multiline]}
              testID="topo-info:description"
              value={description}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routes</Text>
            <InlineRouteEditor
              onAddRoute={() => {
                void handleAddRoute();
              }}
              onChangeRouteField={(route, fields) => {
                void handleChangeRouteField(route, fields);
              }}
              onDeleteRoute={(route) => {
                void handleDeleteRoute(route);
              }}
              routes={routes}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  field: {
    gap: 6,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    color: '#111827',
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    ...interStyle('700'),
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    ...interStyle('800'),
  },
});
