import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Route, RouteType } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';
import { BottomSheet } from '@/ui/BottomSheet';
import { interStyle } from '@/ui/fonts';

const ROUTE_TYPES: Array<{ value: RouteType; label: string }> = [
  { value: 'sport', label: 'Sport' },
  { value: 'trad', label: 'Trad' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'boulder', label: 'Boulder' },
  { value: 'aid', label: 'Aid' },
  { value: 'top-rope', label: 'TR' },
];

type Props = {
  route: Route | undefined;
  onClose: () => void;
  onAfterChange?: () => void;
};

export function RouteEditSheet({ route, onClose, onAfterChange }: Props) {
  const { updateRouteField, deleteRoute } = useTopoStore();

  const currentRouteRef = useRef<Route | undefined>(route);
  const pendingCommitRef = useRef<Promise<void> | null>(null);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [boltCount, setBoltCount] = useState('');
  const [lengthM, setLengthM] = useState('');
  const [routeType, setRouteType] = useState<RouteType | undefined>(undefined);
  const [fa, setFa] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    currentRouteRef.current = route;
    if (!route) {
      setName('');
      setGrade('');
      setBoltCount('');
      setLengthM('');
      setRouteType(undefined);
      setFa('');
      setDescription('');
      return;
    }
    setName(route.name || '');
    setGrade(route.grade ?? '');
    setBoltCount(route.boltCount !== undefined ? String(route.boltCount) : '');
    setLengthM(route.lengthM !== undefined ? String(route.lengthM) : '');
    setRouteType(route.routeType);
    setFa(route.fa ?? '');
    setDescription(route.description ?? '');
  }, [route]);

  async function commitField(fields: Partial<Route>) {
    if (!currentRouteRef.current) return;
    const current = currentRouteRef.current;
    let hasChanges = false;
    for (const [key, value] of Object.entries(fields)) {
      if ((current as Record<string, unknown>)[key] !== value) {
        hasChanges = true;
        break;
      }
    }
    if (!hasChanges) return;

    const prev = pendingCommitRef.current ?? Promise.resolve();
    const nextCommit = prev
      .then(async () => {
        if (!currentRouteRef.current) return;
        const updated = await updateRouteField(currentRouteRef.current, fields);
        currentRouteRef.current = updated ?? { ...currentRouteRef.current, ...fields };
        onAfterChange?.();
      })
      .catch((err) => {
        console.warn('Failed to save route field', err);
      });
    pendingCommitRef.current = nextCommit;
    await nextCommit;
  }

  async function handleClose() {
    if (currentRouteRef.current) {
      await commitField({
        name: name.trim(),
        grade: grade.trim() || undefined,
        boltCount: boltCount.trim() === '' ? undefined : Number(boltCount) || undefined,
        lengthM: lengthM.trim() === '' ? undefined : Number(lengthM) || undefined,
        routeType,
        fa: fa.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (pendingCommitRef.current) {
        await pendingCommitRef.current;
      }
    }
    onClose();
  }

  async function handleDelete() {
    if (!currentRouteRef.current) return;
    const routeToDelete = currentRouteRef.current;
    if (pendingCommitRef.current) {
      await pendingCommitRef.current;
    }
    await deleteRoute(routeToDelete.id);
    onAfterChange?.();
    onClose();
  }

  return (
    <BottomSheet
      onClose={handleClose}
      testID="route-edit:sheet"
      title={route ? (route.name ? `Edit “${route.name}”` : 'New Route') : 'Edit Route'}
      visible={Boolean(route)}
    >
      {route ? (
        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={styles.label}>Route name</Text>
            <TextInput
              accessibilityLabel="Route name"
              autoFocus={!route.name}
              onBlur={() => {
                void commitField({ name: name.trim() });
              }}
              onChangeText={setName}
              placeholder="e.g. Warmup Slab"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              testID="route-edit:name"
              value={name}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flexBasis: 90, flexGrow: 1 }]}>
              <Text style={styles.label}>Grade</Text>
              <TextInput
                accessibilityLabel="Grade"
                onBlur={() => {
                  void commitField({ grade: grade.trim() || undefined });
                }}
                onChangeText={setGrade}
                placeholder="5.10c"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                testID="route-edit:grade"
                value={grade}
              />
            </View>

            <View style={[styles.field, { flexBasis: 70, flexGrow: 1 }]}>
              <Text style={styles.label}>Bolts</Text>
              <TextInput
                accessibilityLabel="Bolts"
                keyboardType="numeric"
                onBlur={() => {
                  void commitField({
                    boltCount: boltCount.trim() === '' ? undefined : Number(boltCount) || undefined,
                  });
                }}
                onChangeText={setBoltCount}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                testID="route-edit:bolts"
                value={boltCount}
              />
            </View>

            <View style={[styles.field, { flexBasis: 90, flexGrow: 1 }]}>
              <Text style={styles.label}>Length (m)</Text>
              <TextInput
                accessibilityLabel="Length"
                keyboardType="numeric"
                onBlur={() => {
                  void commitField({
                    lengthM: lengthM.trim() === '' ? undefined : Number(lengthM) || undefined,
                  });
                }}
                onChangeText={setLengthM}
                placeholder="25"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                testID="route-edit:length"
                value={lengthM}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typePicker}>
              {ROUTE_TYPES.map((t) => {
                const active = routeType === t.value;
                return (
                  <Pressable
                    accessibilityLabel={`Type: ${t.label}`}
                    accessibilityRole="button"
                    key={t.value}
                    onPress={() => {
                      const next = active ? undefined : t.value;
                      setRouteType(next);
                      void commitField({ routeType: next });
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.chipPressed,
                    ]}
                    testID={`route-edit:type:${t.value}`}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>First ascent</Text>
            <TextInput
              accessibilityLabel="First ascent"
              onBlur={() => {
                void commitField({ fa: fa.trim() || undefined });
              }}
              onChangeText={setFa}
              placeholder="John Martin"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              testID="route-edit:fa"
              value={fa}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              accessibilityLabel="Description"
              multiline
              onBlur={() => {
                void commitField({ description: description.trim() || undefined });
              }}
              onChangeText={setDescription}
              placeholder="Route notes, cruxes, gear recommendations..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multiline]}
              testID="route-edit:description"
              value={description}
            />
          </View>

          <View style={styles.deleteSection}>
            <Pressable
              accessibilityLabel="Delete route"
              accessibilityRole="button"
              onPress={() => void handleDelete()}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
              testID="route-edit:delete"
            >
              <Ionicons color="#DC2626" name="trash-outline" size={16} />
              <Text style={styles.deleteButtonText}>Delete route</Text>
            </Pressable>
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
  chip: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  chipLabel: {
    color: '#374151',
    fontSize: 12,
    ...interStyle('700'),
  },
  chipLabelActive: {
    color: '#1D4ED8',
    ...interStyle('700'),
  },
  chipPressed: {
    opacity: 0.7,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  deleteButtonPressed: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 13,
    ...interStyle('700'),
  },
  deleteSection: {
    marginTop: 8,
  },
  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...interStyle('400'),
  },
  label: {
    color: '#374151',
    fontSize: 12,
    ...interStyle('700'),
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  typePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
