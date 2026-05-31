import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TopoEditorBundle } from '@/domain/types';
import { exportTopoPdf } from '@/export/pdf';
import { useTopoStore } from '@/state/TopoStore';
import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

export type ShareScope =
  | { kind: 'crag'; name: string; cragId: string }
  | { kind: 'sector'; name: string; sectorId: string }
  | { kind: 'topo'; name: string; topoId: string };

type Props = {
  scope: ShareScope | undefined;
  onClose: () => void;
};

const KIND_COPY: Record<ShareScope['kind'], string> = {
  crag: 'crag',
  sector: 'sector',
  topo: 'topo',
};

const IS_WEB = Platform.OS === 'web';

export function ShareSheet({ scope, onClose }: Props) {
  const { loadTopoEditor } = useTopoStore();
  const [bundle, setBundle] = useState<TopoEditorBundle>();
  const [isExporting, setIsExporting] = useState(false);
  const [pdfUri, setPdfUri] = useState<string>();
  const [exportError, setExportError] = useState<string>();

  const topoId = scope?.kind === 'topo' ? scope.topoId : undefined;

  // Load the topo bundle so we know whether a PDF can be produced (and have the
  // data ready to render one). Reset transient export state whenever the scope
  // changes so a previous topo's result never bleeds into a new sheet.
  useEffect(() => {
    setBundle(undefined);
    setPdfUri(undefined);
    setExportError(undefined);
    setIsExporting(false);
    if (!topoId) return;
    let active = true;
    void loadTopoEditor(topoId).then((next) => {
      if (active) setBundle(next);
    });
    return () => {
      active = false;
    };
  }, [loadTopoEditor, topoId]);

  const photo =
    bundle?.topo.photoUri && bundle.topo.photoWidth && bundle.topo.photoHeight
      ? {
          id: bundle.topo.id,
          topoId: bundle.topo.id,
          uri: bundle.topo.photoUri,
          width: bundle.topo.photoWidth,
          height: bundle.topo.photoHeight,
          createdAt: bundle.topo.createdAt,
        }
      : undefined;

  const isTopoScope = scope?.kind === 'topo';
  const pdfEnabled = isTopoScope && !IS_WEB && Boolean(photo) && !isExporting;

  function pdfSubtitle(): string {
    if (isExporting) return 'Generating…';
    if (pdfUri) return 'Saved — tap to generate again';
    if (IS_WEB) return 'Not available on web yet';
    if (!isTopoScope) return 'Available on individual topos';
    if (!bundle) return 'Loading topo…';
    if (!photo) return 'Add a photo to this topo first';
    return `${bundle.annotations.length} annotation${bundle.annotations.length === 1 ? '' : 's'} included`;
  }

  async function handleExportPdf() {
    if (!photo || !bundle) return;
    setIsExporting(true);
    setExportError(undefined);
    try {
      // Synthesize the legacy TopoProject shape `exportTopoPdf` expects.
      const legacyProject = {
        id: bundle.topo.id,
        name: bundle.topo.name,
        description: bundle.topo.description,
        createdAt: bundle.topo.createdAt,
        updatedAt: bundle.topo.updatedAt,
        photos: [photo],
        routes: bundle.routes,
        annotations: bundle.annotations,
      } as Parameters<typeof exportTopoPdf>[0];
      const uri = await exportTopoPdf(legacyProject, photo as Parameters<typeof exportTopoPdf>[1]);
      setPdfUri(uri);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not generate the PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <BottomSheet
      onClose={onClose}
      scrollable={false}
      testID="share-placeholder:sheet"
      title="Share"
      visible={Boolean(scope)}
    >
      <View style={styles.body}>
        <Text style={styles.copy} testID="share-placeholder:scope">
          {scope ? `Sharing the ${KIND_COPY[scope.kind]} “${scope.name}”.` : ''}
        </Text>

        <Section title="Connected services">
          <Text style={styles.emptyServices} testID="share:services-empty">
            No connected services yet. Add one in Settings.
          </Text>
        </Section>

        <Section title="Export file">
          <ExportOption
            disabled={!pdfEnabled}
            icon="document-text-outline"
            label="PDF"
            onPress={() => {
              void handleExportPdf();
            }}
            subtitle={pdfSubtitle()}
            testID="share:export-pdf"
            trailing={isExporting ? <ActivityIndicator color="#6B7280" size="small" /> : undefined}
          />
          <ExportOption
            disabled
            icon="code-slash-outline"
            label="HTML"
            onPress={() => undefined}
            subtitle="Coming soon"
            testID="share:export-html"
            underConstruction
          />
          {isTopoScope ? (
            <ExportOption
              disabled
              icon="image-outline"
              label="PNG"
              onPress={() => undefined}
              subtitle="Image only — coming soon"
              testID="share:export-png"
              underConstruction
            />
          ) : null}
        </Section>

        {pdfUri ? (
          <Text style={styles.resultOk} testID="share:export-result">
            Saved: {pdfUri}
          </Text>
        ) : null}
        {exportError ? (
          <Text style={styles.resultError} testID="share:export-error">
            {exportError}
          </Text>
        ) : null}

        <Button
          label="Close"
          onPress={onClose}
          testID="share-placeholder:close"
          variant="secondary"
        />
      </View>
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ExportOption({
  label,
  subtitle,
  icon,
  onPress,
  disabled,
  underConstruction,
  trailing,
  testID,
}: {
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  underConstruction?: boolean;
  trailing?: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && !disabled && styles.optionPressed]}
      testID={testID}
    >
      <Ionicons
        color={disabled ? '#9CA3AF' : '#374151'}
        name={icon}
        size={20}
        style={styles.optionIcon}
      />
      <View style={styles.optionCopy}>
        <View style={styles.optionLabelRow}>
          <Text style={[styles.optionLabel, disabled && styles.optionLabelDisabled]}>{label}</Text>
          {underConstruction ? (
            <Ionicons
              accessibilityLabel="Under construction"
              color="#D97706"
              name="construct-outline"
              size={14}
              style={styles.constructIcon}
            />
          ) : null}
        </View>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ??
        (!disabled ? <Ionicons color="#9CA3AF" name="chevron-forward" size={18} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingBottom: 8,
    paddingTop: 6,
  },
  constructIcon: {
    marginLeft: 6,
  },
  copy: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    ...interStyle('400'),
  },
  emptyServices: {
    color: '#6B7280',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionIcon: {
    width: 24,
  },
  optionLabel: {
    color: '#111827',
    fontSize: 16,
    ...interStyle('700'),
  },
  optionLabelDisabled: {
    color: '#9CA3AF',
  },
  optionLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  optionPressed: {
    opacity: 0.6,
  },
  optionSubtitle: {
    color: '#6B7280',
    fontSize: 13,
  },
  resultError: {
    color: '#B91C1C',
    fontSize: 13,
  },
  resultOk: {
    color: '#15803D',
    fontSize: 12,
  },
  section: {
    gap: 8,
  },
  sectionBody: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.4,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    ...interStyle('700'),
  },
});
