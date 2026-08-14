import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { issueColors } from '@/issues/colors';
import type { CreateIssueInput } from '@/issues/create';
import type { IssueRouteOption } from '@/storage/repos/tabvarIssuesRepo';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

const ISSUE_TYPES = [
  { label: 'Bolts (#)', value: 'Bolts' },
  { label: 'All Bolts', value: 'All Bolts' },
  { label: 'Anchor', value: 'Anchor' },
  { label: 'Rock', value: 'Rock' },
] as const;

const SUB_ISSUES_BY_TYPE: Record<string, string[]> = {
  Anchor: [
    'Loose nut',
    'Loose bolt',
    'Loose glue-in',
    'Rusted',
    'Outdated',
    'Worn',
    'Missing (bolt and hanger)',
    'Missing (hanger)',
    'Other',
  ],
  Bolts: [
    'Loose nut',
    'Loose bolt',
    'Loose glue-in',
    'Rusted',
    'Outdated',
    'Worn',
    'Missing (bolt and hanger)',
    'Missing (hanger)',
    'Other',
  ],
  'All Bolts': [
    'Loose nut',
    'Loose bolt',
    'Loose glue-in',
    'Rusted',
    'Outdated',
    'Worn',
    'Missing (bolt and hanger)',
    'Missing (hanger)',
    'Other',
  ],
  Rock: ['Loose block', 'Loose flake', 'Other'],
};

type Props = {
  visible: boolean;
  routes: IssueRouteOption[];
  cragId?: number;
  cragName?: string;
  routesLoading?: boolean;
  routesError?: string;
  onCancel: () => void;
  onConfirm: (input: CreateIssueInput) => void | Promise<void>;
  testID?: string;
};

export function IssueCreateSheet({
  visible,
  routes,
  cragId,
  cragName,
  routesLoading = false,
  routesError,
  onCancel,
  onConfirm,
  testID = 'issues:create-sheet',
}: Props) {
  const [route, setRoute] = useState<IssueRouteOption>();
  const [issueType, setIssueType] = useState<string>();
  const [subIssueType, setSubIssueType] = useState<string>();
  const [description, setDescription] = useState('');
  const [boltsAffected, setBoltsAffected] = useState('');
  const [routePickerVisible, setRoutePickerVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (visible) {
      setRoute(undefined);
      setIssueType(undefined);
      setSubIssueType(undefined);
      setDescription('');
      setBoltsAffected('');
      setRoutePickerVisible(false);
      setBusy(false);
      setError(undefined);
    }
  }, [visible]);

  const subIssues = issueType ? SUB_ISSUES_BY_TYPE[issueType] ?? [] : [];

  async function handleConfirm() {
    if (busy) return;
    if (!route) {
      setError('Choose a route to report an issue on.');
      return;
    }
    if (!issueType) {
      setError('Choose what is affected by the issue.');
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      await onConfirm({
        boltsAffected: issueType === 'Bolts' ? boltsAffected : undefined,
        description,
        issueType,
        routeId: route.id,
        subIssueType,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Could not submit this issue.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BottomSheet onClose={onCancel} testID={testID} title="New issue" visible={visible}>
        <View style={styles.content}>
          <View style={styles.field}>
            <Text style={styles.label}>Route</Text>
            <Pressable
              accessibilityLabel="Choose route"
              accessibilityRole="button"
              disabled={routesLoading || routes.length === 0}
              onPress={() => setRoutePickerVisible(true)}
              style={({ pressed }) => [
                styles.selector,
                (routesLoading || routes.length === 0) && styles.selectorDisabled,
                pressed && styles.selectorPressed,
              ]}
              testID={`${testID}:route`}
            >
              <View style={styles.selectorBody}>
                <Text
                  numberOfLines={1}
                  style={[styles.selectorTitle, !route && styles.placeholder]}
                >
                  {route ? route.name : routesLoading ? 'Loading routes…' : 'Choose a route'}
                </Text>
                {route ? (
                  <Text numberOfLines={1} style={styles.selectorMeta}>
                    {formatRouteMeta(route)}
                  </Text>
                ) : routes.length === 0 && !routesLoading ? (
                  <Text style={styles.selectorMeta}>
                    {routesError ?? 'No synced routes available'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.selectorChevron}>›</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>What is affected?</Text>
            <Text style={styles.helper}>
              For multi-pitch routes, detail affected pitch(es) in the notes.
            </Text>
            <View style={styles.choices}>
              {ISSUE_TYPES.map((item) => {
                const selected = issueType === item.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={item.value}
                    onPress={() => {
                      setIssueType(item.value);
                      setSubIssueType(undefined);
                      setError(undefined);
                    }}
                    style={[styles.choice, selected && styles.choiceSelected]}
                    testID={`${testID}:type:${item.value}`}
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Issue type</Text>
            <View style={styles.choices}>
              {subIssues.length === 0 ? (
                <Text style={styles.helper}>Choose what is affected first.</Text>
              ) : (
                subIssues.map((item) => {
                  const selected = subIssueType === item;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={item}
                      onPress={() => setSubIssueType(selected ? undefined : item)}
                      style={[styles.choice, selected && styles.choiceSelected]}
                      testID={`${testID}:subtype:${item}`}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          {issueType === 'Bolts' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Bolts affected</Text>
              <TextInput
                accessibilityLabel="Bolts affected"
                autoCapitalize="none"
                onChangeText={setBoltsAffected}
                placeholder="e.g. 1, 2, 3"
                placeholderTextColor={issueColors.faint}
                style={styles.input}
                testID={`${testID}:bolts`}
                value={boltsAffected}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              accessibilityLabel="Issue notes"
              multiline
              onChangeText={setDescription}
              placeholder="Add any additional details about the issue"
              placeholderTextColor={issueColors.faint}
              style={[styles.input, styles.multiline]}
              testID={`${testID}:description`}
              textAlignVertical="top"
              value={description}
            />
          </View>

          {error ? (
            <Text style={styles.error} testID={`${testID}:error`}>
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button label="Cancel" onPress={onCancel} variant="secondary" />
            </View>
            <View style={styles.action}>
              <Button
                disabled={busy || !route || !issueType}
                label={busy ? 'Submitting…' : 'Submit issue'}
                onPress={() => {
                  void handleConfirm();
                }}
                testID={`${testID}:submit`}
              />
            </View>
          </View>
        </View>
      </BottomSheet>

      <RoutePickerSheet
        cragId={cragId}
        cragName={cragName}
        onClose={() => setRoutePickerVisible(false)}
        onSelect={(selectedRoute) => {
          setRoute(selectedRoute);
          setRoutePickerVisible(false);
          setError(undefined);
        }}
        routes={routes}
        testID={`${testID}:route-picker`}
        visible={routePickerVisible}
      />
    </>
  );
}

function RoutePickerSheet({
  visible,
  routes,
  cragId,
  cragName,
  onClose,
  onSelect,
  testID,
}: {
  visible: boolean;
  routes: IssueRouteOption[];
  cragId?: number;
  cragName?: string;
  onClose: () => void;
  onSelect: (route: IssueRouteOption) => void;
  testID: string;
}) {
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [selectedCragId, setSelectedCragId] = useState<number>();
  const [selectedSector, setSelectedSector] = useState<string>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const scopedRoutes = useMemo(
    () => (cragId === undefined ? routes : routes.filter((route) => route.cragId === cragId)),
    [cragId, routes],
  );

  const crags = useMemo(() => {
    const groups = new Map<number, { name: string; routeCount: number }>();
    for (const route of scopedRoutes) {
      const current = groups.get(route.cragId);
      if (current) {
        current.routeCount += 1;
      } else {
        groups.set(route.cragId, { name: route.cragName, routeCount: 1 });
      }
    }
    return [...groups.entries()]
      .map(([id, group]) => ({ id, ...group }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedRoutes]);

  const selectedCrag = crags.find((crag) => crag.id === selectedCragId);
  const sectors = useMemo(() => {
    if (selectedCragId === undefined) return [];
    const groups = new Map<string, { name: string; routeCount: number }>();
    for (const route of scopedRoutes) {
      if (route.cragId !== selectedCragId) continue;
      const name = route.sectorName ?? 'Other routes';
      const current = groups.get(name);
      if (current) {
        current.routeCount += 1;
      } else {
        groups.set(name, { name, routeCount: 1 });
      }
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedRoutes, selectedCragId]);

  const browseRoutes = useMemo(
    () =>
      scopedRoutes.filter(
        (route) =>
          route.cragId === selectedCragId &&
          (route.sectorName ?? 'Other routes') === selectedSector,
      ),
    [scopedRoutes, selectedCragId, selectedSector],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return [];
    return scopedRoutes.filter((route) =>
      [route.name, route.cragName, route.sectorName, route.gradeYds]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(debouncedSearch)),
    );
  }, [debouncedSearch, scopedRoutes]);

  useEffect(() => {
    if (!visible) return;
    setMode('browse');
    setSelectedCragId(cragId);
    setSelectedSector(undefined);
    setSearch('');
    setDebouncedSearch('');
  }, [cragId, visible]);

  useEffect(() => {
    if (!normalizedSearch) {
      setDebouncedSearch('');
      return;
    }
    const timeout = setTimeout(() => setDebouncedSearch(normalizedSearch), 300);
    return () => clearTimeout(timeout);
  }, [normalizedSearch]);

  function switchMode(nextMode: 'browse' | 'search') {
    setMode(nextMode);
    setSelectedCragId(cragId);
    setSelectedSector(undefined);
    setSearch('');
    setDebouncedSearch('');
  }

  return (
    <BottomSheet onClose={onClose} testID={testID} title="Choose a route" visible={visible}>
      <View style={styles.routePicker}>
        <View style={styles.modeSwitch}>
          <Pressable
            accessibilityRole="button"
            onPress={() => switchMode('browse')}
            style={[styles.modeButton, mode === 'browse' && styles.modeButtonSelected]}
            testID={`${testID}:mode:browse`}
          >
            <Text style={[styles.modeText, mode === 'browse' && styles.modeTextSelected]}>
              Browse
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => switchMode('search')}
            style={[styles.modeButton, mode === 'search' && styles.modeButtonSelected]}
            testID={`${testID}:mode:search`}
          >
            <Text style={[styles.modeText, mode === 'search' && styles.modeTextSelected]}>
              Search
            </Text>
          </Pressable>
        </View>

        {mode === 'browse' ? (
          <BrowseRoutes
            browseRoutes={browseRoutes}
            crags={crags}
            onSelect={onSelect}
            onSelectCrag={(cragId) => {
              setSelectedCragId(cragId);
              setSelectedSector(undefined);
            }}
            onSelectSector={setSelectedSector}
            onBack={() => {
              if (selectedSector !== undefined) {
                setSelectedSector(undefined);
              } else {
                setSelectedCragId(undefined);
              }
            }}
            selectedCrag={selectedCrag}
            selectedCragId={selectedCragId}
            selectedSector={selectedSector}
            sectors={sectors}
            testID={testID}
          />
        ) : (
          <>
            <TextInput
              accessibilityLabel="Search routes"
              autoCapitalize="none"
              onChangeText={setSearch}
              placeholder="Search routes…"
              placeholderTextColor={issueColors.faint}
              style={styles.input}
              testID={`${testID}:search`}
              value={search}
            />
            {cragName ? (
              <Text style={styles.searchScope}>Searching within {cragName}</Text>
            ) : null}
            {!normalizedSearch ? (
              <Text style={styles.emptyRoutes}>Start typing to search routes.</Text>
            ) : debouncedSearch !== normalizedSearch ? (
              <Text style={styles.emptyRoutes}>Searching routes…</Text>
            ) : searchResults.length === 0 ? (
              <Text style={styles.emptyRoutes}>No matching routes.</Text>
            ) : (
              searchResults.map((route) => (
                <RoutePickerRow
                  key={route.id}
                  onPress={() => onSelect(route)}
                  route={route}
                  testID={`${testID}:route:${route.id}`}
                />
              ))
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

function BrowseRoutes({
  browseRoutes,
  crags,
  onBack,
  onSelect,
  onSelectCrag,
  onSelectSector,
  selectedCrag,
  selectedCragId,
  selectedSector,
  sectors,
  testID,
}: {
  browseRoutes: IssueRouteOption[];
  crags: { id: number; name: string; routeCount: number }[];
  onBack: () => void;
  onSelect: (route: IssueRouteOption) => void;
  onSelectCrag: (cragId: number) => void;
  onSelectSector: (sector: string) => void;
  selectedCrag?: { id: number; name: string; routeCount: number };
  selectedCragId?: number;
  selectedSector?: string;
  sectors: { name: string; routeCount: number }[];
  testID: string;
}) {
  if (selectedCragId === undefined) {
    return (
      <View style={styles.pickerSection}>
        <Text style={styles.pickerHeading}>Choose a crag</Text>
        {crags.length === 0 ? (
          <Text style={styles.emptyRoutes}>No synced routes available.</Text>
        ) : (
          crags.map((crag) => (
            <Pressable
              accessibilityLabel={`Choose ${crag.name}`}
              accessibilityRole="button"
              key={crag.id}
              onPress={() => onSelectCrag(crag.id)}
              style={({ pressed }) => [styles.routeRow, pressed && styles.selectorPressed]}
              testID={`${testID}:crag:${crag.id}`}
            >
              <View style={styles.selectorBody}>
                <Text style={styles.routeName}>{crag.name}</Text>
                <Text style={styles.selectorMeta}>{formatCount(crag.routeCount, 'route')}</Text>
              </View>
              <Text style={styles.selectorChevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
    );
  }

  if (selectedSector === undefined) {
    return (
      <View style={styles.pickerSection}>
        <PickerBackRow label={selectedCrag?.name ?? 'Crag'} onBack={onBack} testID={testID} />
        <Text style={styles.pickerHeading}>Choose a sector</Text>
        {sectors.map((sector) => (
          <Pressable
            accessibilityLabel={`Choose ${sector.name}`}
            accessibilityRole="button"
            key={sector.name}
            onPress={() => onSelectSector(sector.name)}
            style={({ pressed }) => [styles.routeRow, pressed && styles.selectorPressed]}
            testID={`${testID}:sector:${selectedCragId}:${sector.name}`}
          >
            <View style={styles.selectorBody}>
              <Text style={styles.routeName}>{sector.name}</Text>
              <Text style={styles.selectorMeta}>{formatCount(sector.routeCount, 'route')}</Text>
            </View>
            <Text style={styles.selectorChevron}>›</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.pickerSection}>
      <PickerBackRow
        label={`${selectedCrag?.name ?? 'Crag'} · ${selectedSector}`}
        onBack={onBack}
        testID={testID}
      />
      <Text style={styles.pickerHeading}>Choose a route</Text>
      {browseRoutes.map((route) => (
        <RoutePickerRow
          key={route.id}
          onPress={() => onSelect(route)}
          route={route}
          testID={`${testID}:route:${route.id}`}
        />
      ))}
    </View>
  );
}

function PickerBackRow({
  label,
  onBack,
  testID,
}: {
  label: string;
  onBack: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={onBack}
      style={({ pressed }) => [styles.backRow, pressed && styles.selectorPressed]}
      testID={`${testID}:back`}
    >
      <Text style={styles.backChevron}>‹</Text>
      <Text numberOfLines={1} style={styles.backLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function RoutePickerRow({
  onPress,
  route,
  testID,
}: {
  onPress: () => void;
  route: IssueRouteOption;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Select ${route.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.routeRow, pressed && styles.selectorPressed]}
      testID={testID}
    >
      <View style={styles.selectorBody}>
        <Text style={styles.routeName}>{route.name}</Text>
        <Text style={styles.selectorMeta}>{formatRouteMeta(route)}</Text>
      </View>
      <Text style={styles.selectorChevron}>›</Text>
    </Pressable>
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function formatRouteMeta(route: IssueRouteOption): string {
  return [route.cragName, route.sectorName, route.gradeYds].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  choice: {
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceSelected: {
    backgroundColor: issueColors.ink,
    borderColor: issueColors.ink,
  },
  choiceText: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  content: {
    gap: 18,
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyRoutes: {
    color: issueColors.muted,
    fontSize: 14,
    paddingVertical: 20,
    textAlign: 'center',
  },
  error: {
    color: issueColors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  field: {
    gap: 8,
  },
  helper: {
    color: issueColors.faint,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 12,
    borderWidth: 1,
    color: issueColors.ink,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backChevron: {
    color: issueColors.muted,
    fontSize: 28,
    lineHeight: 28,
  },
  backLabel: {
    color: issueColors.muted,
    flex: 1,
    fontSize: 13,
    ...interStyle('700'),
  },
  backRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
  },
  label: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  multiline: {
    minHeight: 96,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  modeButtonSelected: {
    backgroundColor: issueColors.card,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  modeSwitch: {
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  modeText: {
    color: issueColors.muted,
    fontSize: 13,
    ...interStyle('700'),
  },
  modeTextSelected: {
    color: issueColors.ink,
  },
  pickerHeading: {
    color: issueColors.body,
    fontSize: 13,
    ...interStyle('700'),
  },
  pickerSection: {
    gap: 8,
  },
  placeholder: {
    color: issueColors.faint,
  },
  routeName: {
    color: issueColors.ink,
    fontSize: 15,
    ...interStyle('700'),
  },
  routePicker: {
    gap: 8,
    paddingBottom: 12,
    paddingTop: 4,
  },
  routeRow: {
    alignItems: 'center',
    borderBottomColor: issueColors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  searchScope: {
    color: issueColors.muted,
    fontSize: 13,
    ...interStyle('700'),
  },
  selector: {
    alignItems: 'center',
    backgroundColor: issueColors.fill,
    borderColor: issueColors.fillBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectorBody: {
    flex: 1,
    gap: 2,
  },
  selectorChevron: {
    color: issueColors.faint,
    fontSize: 28,
    lineHeight: 28,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorMeta: {
    color: issueColors.faint,
    fontSize: 12.5,
  },
  selectorPressed: {
    opacity: 0.65,
  },
  selectorTitle: {
    color: issueColors.ink,
    fontSize: 15,
    ...interStyle('700'),
  },
});
