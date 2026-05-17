import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { EditorTool } from '@/domain/types';

import { editorTools } from './tools';

export function ToolPalette({
  selectedTool,
  onSelectTool,
}: {
  selectedTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
}) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.pill}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.content}
          showsHorizontalScrollIndicator={false}
        >
          {editorTools.map((tool) => {
            const isSelected = selectedTool === tool.id;
            return (
              <Pressable
                accessibilityLabel={tool.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={tool.id}
                onPress={() => onSelectTool(tool.id)}
                style={({ pressed }) => [
                  styles.tool,
                  isSelected && styles.selectedTool,
                  pressed && !isSelected && styles.pressed,
                ]}
              >
                <Ionicons
                  name={tool.icon}
                  size={22}
                  color={isSelected ? '#1B1B1F' : '#F8FAFC'}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  pill: {
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: '100%',
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  selectedTool: {
    backgroundColor: '#F2B58F',
  },
  tool: {
    alignItems: 'center',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 52,
  },
  wrapper: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
