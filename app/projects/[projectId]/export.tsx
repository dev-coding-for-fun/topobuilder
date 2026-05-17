import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { TopoProject } from '@/domain/types';
import { exportTopoPdf } from '@/export/pdf';
import { useTopoStore } from '@/state/TopoStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

export default function ExportScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { loadProject } = useTopoStore();
  const [project, setProject] = useState<TopoProject>();
  const [pdfUri, setPdfUri] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId) {
      setProject(await loadProject(projectId));
    }
  }, [loadProject, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const photo = project?.photos[0];

  async function handleExport() {
    if (!project || !photo) {
      return;
    }

    setIsExporting(true);
    try {
      setPdfUri(await exportTopoPdf(project, photo));
    } finally {
      setIsExporting(false);
    }
  }

  if (!project || !photo) {
    return (
      <Screen style={styles.center}>
        <Text>Add a photo before exporting.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>PDF export</Text>
      <Text style={styles.copy}>The first MVP export generates a one-page marked-up topo from the first photo.</Text>
      <Image source={{ uri: photo.uri }} style={styles.preview} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{project.name}</Text>
        <Text style={styles.copy}>
          {project.annotations.filter((annotation) => annotation.photoId === photo.id).length} annotations will be rendered.
        </Text>
        <Button
          disabled={isExporting}
          label={isExporting ? 'Exporting...' : 'Generate and share PDF'}
          onPress={handleExport}
        />
        {pdfUri ? <Text style={styles.uri}>Saved: {pdfUri}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 23,
  },
  preview: {
    backgroundColor: '#CBD5E1',
    borderRadius: 24,
    height: 260,
    width: '100%',
  },
  screen: {
    gap: 18,
    padding: 18,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  uri: {
    color: '#6B7280',
    fontSize: 12,
  },
});
