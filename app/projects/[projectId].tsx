import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Platform, StyleSheet, Text, View } from 'react-native';

import type { TopoProject } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { loadProject, addPhotoFromLibrary, storageError } = useTopoStore();
  const [project, setProject] = useState<TopoProject>();
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  const refresh = useCallback(async () => {
    if (projectId) {
      setProject(await loadProject(projectId));
    }
  }, [loadProject, projectId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleAddPhoto() {
    if (!projectId) {
      return;
    }

    setIsAddingPhoto(true);
    try {
      await addPhotoFromLibrary(projectId);
      await refresh();
    } finally {
      setIsAddingPhoto(false);
    }
  }

  if (!project) {
    return (
      <Screen style={styles.center}>
        <Text>Loading project...</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} testID="project-detail:screen">
      <View style={styles.header}>
        <Text style={styles.title} testID="project-detail:title">{project.name}</Text>
        <Text style={styles.meta}>
          {project.photos.length} photos · {project.annotations.length} annotations
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          disabled={isAddingPhoto}
          label={isAddingPhoto ? 'Importing...' : 'Import photo'}
          onPress={handleAddPhoto}
          testID="project-detail:import-photo-button"
        />
        {Platform.OS === 'web' ? null : (
          <>
            <Button
              label="Take photo"
              onPress={() => router.push(`/projects/${project.id}/camera`)}
              variant="secondary"
            />
            <Button
              disabled={project.photos.length === 0}
              label="Export PDF"
              onPress={() => router.push(`/projects/${project.id}/export`)}
              variant="secondary"
            />
          </>
        )}
      </View>
      {storageError ? <Text style={styles.error}>{storageError}</Text> : null}

      <FlatList
        ListEmptyComponent={
          <View style={styles.emptyCard} testID="project-detail:empty-photos">
            <Text style={styles.emptyTitle}>Add your first rock face photo</Text>
            <Text style={styles.emptyText}>
              {Platform.OS === 'web'
                ? 'Import an existing image file to start marking up a topo in the browser.'
                : 'The MVP supports library import now, with VisionCamera wired for mobile capture next.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={project.photos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.photoCard} testID="project-detail:photo-card">
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Topo photo</Text>
              <Text style={styles.meta}>
                {item.width} x {item.height}
              </Text>
            </View>
            <Button
              label="Edit"
              onPress={() => router.push(`/projects/${project.id}/editor?photoId=${item.id}`)}
              testID="project-detail:edit-photo-button"
              variant="secondary"
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 8,
    padding: 24,
  },
  emptyText: {
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    gap: 6,
  },
  listContent: {
    gap: 12,
    paddingBottom: 32,
    paddingTop: 18,
  },
  meta: {
    color: '#6B7280',
  },
  photoCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  photoCopy: {
    flex: 1,
  },
  photoTitle: {
    color: '#111827',
    fontWeight: '800',
  },
  screen: {
    alignSelf: 'center',
    maxWidth: 980,
    padding: 18,
    width: '100%',
  },
  thumbnail: {
    backgroundColor: '#CBD5E1',
    borderRadius: 12,
    height: 70,
    width: 70,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
});
