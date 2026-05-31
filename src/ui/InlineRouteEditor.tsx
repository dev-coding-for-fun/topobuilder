import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Route, RouteType } from '@/domain/types';
import { Button } from '@/ui/Button';
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
  routes: Route[];
  onChangeRouteField: (route: Route, fields: Partial<Route>) => void;
  onAddRoute: () => void;
  onDeleteRoute: (route: Route) => void;
};

/**
 * Pattern A — inline route editor. Each route row exposes its fields directly
 * in the list rather than drilling down to a per-route screen. Optimised for
 * batch entry of many routes after a session.
 */
export function InlineRouteEditor({
  routes,
  onChangeRouteField,
  onAddRoute,
  onDeleteRoute,
}: Props) {
  return (
    <View style={styles.wrap} testID="topo-info:routes">
      {routes.length === 0 ? (
        <Text style={styles.empty}>No routes yet. Tap “Add route” to start.</Text>
      ) : null}
      {routes.map((route) => (
        <RouteEditorRow
          key={route.id}
          onChange={(fields) => onChangeRouteField(route, fields)}
          onDelete={() => onDeleteRoute(route)}
          route={route}
        />
      ))}
      <Button
        label="+ Add route"
        onPress={onAddRoute}
        testID="topo-info:add-route"
        variant="secondary"
      />
    </View>
  );
}

type RowProps = {
  route: Route;
  onChange: (fields: Partial<Route>) => void;
  onDelete: () => void;
};

function RouteEditorRow({ route, onChange, onDelete }: RowProps) {
  // Local state so typing into the inputs feels native; we sync up to the
  // store via onChange on blur.
  const [name, setName] = useState(route.name);
  const [grade, setGrade] = useState(route.grade ?? '');
  const [boltCount, setBoltCount] = useState(
    route.boltCount !== undefined ? String(route.boltCount) : '',
  );
  const [lengthM, setLengthM] = useState(
    route.lengthM !== undefined ? String(route.lengthM) : '',
  );
  const [fa, setFa] = useState(route.fa ?? '');
  const [description, setDescription] = useState(route.description ?? '');

  return (
    <View style={styles.card} testID={`topo-info:route:${route.id}`}>
      <View style={styles.headerRow}>
        <TextInput
          accessibilityLabel="Route name"
          onBlur={() => onChange({ name })}
          onChangeText={setName}
          placeholder="Route name"
          placeholderTextColor="#9CA3AF"
          style={[styles.input, styles.nameInput]}
          testID={`topo-info:route:${route.id}:name`}
          value={name}
        />
        <Pressable
          accessibilityLabel={`Delete route ${route.name || ''}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteIcon, pressed && styles.iconPressed]}
          testID={`topo-info:route:${route.id}:delete`}
        >
          <Ionicons color="#B91C1C" name="trash-outline" size={18} />
        </Pressable>
      </View>

      <View style={styles.fieldRow}>
        <Field label="Grade" flexBasis={90}>
          <TextInput
            accessibilityLabel="Grade"
            onBlur={() => onChange({ grade: grade || undefined })}
            onChangeText={setGrade}
            placeholder="5.10c"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            testID={`topo-info:route:${route.id}:grade`}
            value={grade}
          />
        </Field>
        <Field label="Bolts" flexBasis={70}>
          <TextInput
            accessibilityLabel="Bolts"
            keyboardType="numeric"
            onBlur={() =>
              onChange({
                boltCount: boltCount.trim() === '' ? undefined : Number(boltCount) || undefined,
              })
            }
            onChangeText={setBoltCount}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            testID={`topo-info:route:${route.id}:bolts`}
            value={boltCount}
          />
        </Field>
        <Field label="Length (m)" flexBasis={90}>
          <TextInput
            accessibilityLabel="Length"
            keyboardType="numeric"
            onBlur={() =>
              onChange({
                lengthM: lengthM.trim() === '' ? undefined : Number(lengthM) || undefined,
              })
            }
            onChangeText={setLengthM}
            placeholder="25"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            testID={`topo-info:route:${route.id}:length`}
            value={lengthM}
          />
        </Field>
      </View>

      <Field label="Type">
        <View style={styles.typePicker}>
          {ROUTE_TYPES.map((t) => {
            const active = route.routeType === t.value;
            return (
              <Pressable
                accessibilityLabel={`Type: ${t.label}`}
                accessibilityRole="button"
                key={t.value}
                onPress={() => onChange({ routeType: active ? undefined : t.value })}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
                testID={`topo-info:route:${route.id}:type:${t.value}`}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="First ascent">
        <TextInput
          accessibilityLabel="First ascent"
          onBlur={() => onChange({ fa: fa || undefined })}
          onChangeText={setFa}
          placeholder="John Martin"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          testID={`topo-info:route:${route.id}:fa`}
          value={fa}
        />
      </Field>

      <Field label="Description">
        <TextInput
          accessibilityLabel="Description"
          multiline
          onBlur={() => onChange({ description: description || undefined })}
          onChangeText={setDescription}
          placeholder="Notes, beta, gear…"
          placeholderTextColor="#9CA3AF"
          style={[styles.input, styles.multiline]}
          testID={`topo-info:route:${route.id}:description`}
          value={description}
        />
      </Field>
    </View>
  );
}

function Field({
  label,
  children,
  flexBasis,
}: {
  label: string;
  children: React.ReactNode;
  flexBasis?: number;
}) {
  return (
    <View style={[styles.field, flexBasis ? { flexBasis, flexGrow: 1 } : undefined]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  chipLabel: {
    color: '#374151',
    fontSize: 13,
    ...interStyle('700'),
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  chipPressed: {
    opacity: 0.7,
  },
  deleteIcon: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    ...interStyle('700'),
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconPressed: {
    opacity: 0.6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    ...interStyle('700'),
  },
  typePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wrap: {
    gap: 12,
  },
});
