import { Canvas, Circle, Group, Image as SkiaImage, Line, Path, Rect, Skia, useImage } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { denormalizePoint, fitContain, normalizePoint, screenToImagePoint } from '@/domain/geometry';
import type { Annotation, AnnotationKind, EditorTool, NormalizedPoint, PhotoAsset } from '@/domain/types';

type TopoCanvasProps = {
  photo: PhotoAsset;
  annotations: Annotation[];
  activeTool: EditorTool;
  onPlaceAnnotation: (kind: AnnotationKind, point: NormalizedPoint) => void;
};

export function TopoCanvas({
  photo,
  annotations,
  activeTool,
  onPlaceAnnotation,
}: TopoCanvasProps) {
  const image = useImage(photo.uri);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const imageFit = useMemo(
    () => fitContain({ width: photo.width, height: photo.height }, canvasSize),
    [canvasSize, photo.height, photo.width],
  );

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  }

  function handlePress(event: { nativeEvent: { locationX: number; locationY: number } }) {
    if (activeTool === 'select') {
      return;
    }

    const annotationKind: AnnotationKind = activeTool;
    const imagePoint = screenToImagePoint(
      { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
      { width: photo.width, height: photo.height },
      canvasSize,
    );
    onPlaceAnnotation(annotationKind, normalizePoint(imagePoint, photo));
  }

  const renderableSize = {
    width: imageFit.width,
    height: imageFit.height,
  };

  return (
    <Pressable onPress={handlePress} onLayout={handleLayout} style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: imageFit.offsetX }, { translateY: imageFit.offsetY }]}>
          {image ? (
            <SkiaImage image={image} x={0} y={0} width={imageFit.width} height={imageFit.height} fit="contain" />
          ) : (
            <Rect x={0} y={0} width={imageFit.width} height={imageFit.height} color="#CBD5E1" />
          )}
          {annotations.map((annotation) => (
            <AnnotationShape
              annotation={annotation}
              key={annotation.id}
              size={renderableSize}
            />
          ))}
        </Group>
      </Canvas>
      {!image && (
        <View pointerEvents="none" style={styles.loading}>
          <Text style={styles.loadingText}>Loading topo photo...</Text>
        </View>
      )}
    </Pressable>
  );
}

function AnnotationShape({
  annotation,
  size,
}: {
  annotation: Annotation;
  size: { width: number; height: number };
}) {
  if ('points' in annotation) {
    const path = Skia.Path.Make();
    annotation.points.forEach((point, index) => {
      const next = denormalizePoint(point, size);
      if (index === 0) {
        path.moveTo(next.x, next.y);
      } else {
        path.lineTo(next.x, next.y);
      }
    });

    return (
      <Path
        color={annotation.color}
        path={path}
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={annotation.kind === 'climbLine' ? 5 : 4}
        style="stroke"
      />
    );
  }

  const point = denormalizePoint(annotation.point, size);

  if (annotation.kind === 'arrow') {
    return (
      <Group>
        <Line
          color={annotation.color}
          p1={{ x: point.x - 18, y: point.y + 18 }}
          p2={{ x: point.x + 18, y: point.y - 18 }}
          strokeWidth={4}
        />
        <Line
          color={annotation.color}
          p1={{ x: point.x + 18, y: point.y - 18 }}
          p2={{ x: point.x + 4, y: point.y - 18 }}
          strokeWidth={4}
        />
      </Group>
    );
  }

  return (
    <Group>
      <Circle color="#FFFFFF" cx={point.x} cy={point.y} r={12} />
      <Circle color={annotation.color} cx={point.x} cy={point.y} r={8} />
    </Group>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    flex: 1,
    overflow: 'hidden',
  },
  loading: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
