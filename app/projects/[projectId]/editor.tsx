import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isPathKind } from '@/domain/annotationFactory';
import type { Annotation, EditorTool, NormalizedPoint, TopoProject } from '@/domain/types';
import { EditorTopBar } from '@/editor/EditorTopBar';
import { ToolPalette } from '@/editor/ToolPalette';
import { TopoCanvas } from '@/editor/TopoCanvas';
import { useTopoStore } from '@/state/TopoStore';

export default function EditorScreen() {
  const { projectId, photoId } = useLocalSearchParams<{ projectId: string; photoId: string }>();
  const { loadProject, addAnnotation, addPathAnnotation, removeAnnotation } = useTopoStore();
  const [project, setProject] = useState<TopoProject>();
  const [activeTool, setActiveTool] = useState<EditorTool>('climbLine');
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([]);

  const refresh = useCallback(async () => {
    if (projectId) {
      setProject(await loadProject(projectId));
    }
  }, [loadProject, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const photo = project?.photos.find((item) => item.id === photoId);
  const route = project?.routes[0];
  const savedAnnotations = useMemo(
    () => project?.annotations.filter((annotation) => annotation.photoId === photoId) ?? [],
    [photoId, project?.annotations],
  );
  const annotations = useMemo(() => {
    if (
      !project ||
      !photo ||
      draftPoints.length === 0 ||
      activeTool === 'select' ||
      !isPathKind(activeTool)
    ) {
      return savedAnnotations;
    }

    const now = new Date().toISOString();
    const draft: Annotation = {
      id: 'draft',
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind: activeTool,
      color:
        activeTool === 'walkoff' ? '#2F80ED' : activeTool === 'scramble' ? '#F2994A' : '#C6F24F',
      points: draftPoints,
      createdAt: now,
      updatedAt: now,
    };
    return [...savedAnnotations, draft];
  }, [activeTool, draftPoints, photo, project, route?.id, savedAnnotations]);

  async function handlePlace(kind: Exclude<EditorTool, 'select'>, point: NormalizedPoint) {
    if (!project || !photo) {
      return;
    }

    if (isPathKind(kind)) {
      setDraftPoints((points) => [...points, point]);
      return;
    }

    await addAnnotation({
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind,
      point,
      label: kind === 'label' ? 'Grade / note' : undefined,
    });
    await refresh();
  }

  const isDraftableTool = activeTool !== 'select' && isPathKind(activeTool);
  const canSavePath = isDraftableTool && draftPoints.length >= 2;

  async function saveDraftPath() {
    if (!project || !photo || activeTool === 'select' || !isPathKind(activeTool)) {
      return;
    }
    if (draftPoints.length < 2) {
      return;
    }

    await addPathAnnotation({
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind: activeTool,
      points: draftPoints,
    });
    setDraftPoints([]);
    await refresh();
  }

  async function deleteLastAnnotation() {
    const last = savedAnnotations.at(-1);
    if (!last) {
      return;
    }

    await removeAnnotation(last);
    await refresh();
  }

  function handleUndo() {
    if (draftPoints.length > 0) {
      setDraftPoints((points) => points.slice(0, -1));
      return;
    }
    if (savedAnnotations.length === 0) {
      return;
    }
    Alert.alert(
      'Delete last annotation?',
      'This removes the most recent mark from this photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteLastAnnotation },
      ],
    );
  }

  if (!project || !photo) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loadingText}>Loading editor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <TopoCanvas
        activeTool={activeTool}
        annotations={annotations}
        onPlaceAnnotation={handlePlace}
        photo={photo}
      />
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topOverlay}>
        <EditorTopBar
          canRedo={false}
          canSave={canSavePath}
          canUndo={draftPoints.length > 0 || savedAnnotations.length > 0}
          onBack={() => router.back()}
          onRedo={() => undefined}
          onSave={saveDraftPath}
          onUndo={handleUndo}
        />
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.bottomOverlay}>
        <ToolPalette
          onSelectTool={(tool) => {
            setActiveTool(tool);
            setDraftPoints([]);
          }}
          selectedTool={activeTool}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  root: {
    backgroundColor: '#000000',
    flex: 1,
  },
  topOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
