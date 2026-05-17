import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { EditorTool } from '@/domain/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type ToolGroupId = 'select' | 'stamps' | 'line' | 'label' | 'arrow';

type ToolGroup = {
  id: ToolGroupId;
  label: string;
  icon: IoniconName;
  tool?: EditorTool;
  tools?: EditorTool[];
  submenu?: SubmenuTool[];
};

type SubmenuTool = {
  id?: EditorTool;
  label: string;
  icon: 'bolt' | 'rappelAnchor' | 'belayAnchor' | 'routeMarker' | 'curvedLine' | 'straightLine';
};

const toolGroups: ToolGroup[] = [
  { id: 'select', label: 'Select', icon: 'navigate-outline', tool: 'select' },
  {
    id: 'stamps',
    label: 'Stamps',
    icon: 'hammer-outline',
    tool: 'bolt',
    tools: ['bolt', 'rappel', 'belay', 'start'],
    submenu: [
      { id: 'bolt', label: 'Bolt', icon: 'bolt' },
      { id: 'rappel', label: 'Anchor with rappel', icon: 'rappelAnchor' },
      { id: 'belay', label: 'Belay Anchor', icon: 'belayAnchor' },
      { id: 'start', label: 'Route marker', icon: 'routeMarker' },
    ],
  },
  {
    id: 'line',
    label: 'Line tool',
    icon: 'trending-up-outline',
    tool: 'climbLine',
    tools: ['climbLine'],
    submenu: [
      { id: 'climbLine', label: 'Curved line', icon: 'curvedLine' },
      { label: 'Straight line', icon: 'straightLine' },
    ],
  },
  { id: 'label', label: 'Text tool', icon: 'text-outline', tool: 'label' },
  { id: 'arrow', label: 'Arrow tool', icon: 'arrow-forward-outline', tool: 'arrow' },
];

export function ToolPalette({
  selectedTool,
  onSelectTool,
}: {
  selectedTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
}) {
  const activeGroup = toolGroups.find((group) =>
    group.tool === selectedTool || group.tools?.includes(selectedTool),
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {activeGroup?.submenu ? (
        <View style={styles.submenu}>
          {activeGroup.submenu.map((tool) => {
            const isSelected = selectedTool === tool.id;
            const isDisabled = !tool.id;
            return (
              <Pressable
                accessibilityLabel={tool.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                disabled={isDisabled}
                key={tool.label}
                onPress={() => {
                  if (tool.id) {
                    onSelectTool(tool.id);
                  }
                }}
                style={({ pressed }) => [
                  styles.submenuTool,
                  isSelected && styles.selectedSubmenuTool,
                  isDisabled && styles.disabled,
                  pressed && !isSelected && !isDisabled && styles.pressed,
                ]}
              >
                <SubmenuIcon icon={tool.icon} selected={isSelected} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={styles.pill}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.content}
          showsHorizontalScrollIndicator={false}
          style={styles.menuScroll}
        >
          {toolGroups.map((group) => {
            const isSelected =
              selectedTool === group.tool || group.tools?.includes(selectedTool) === true;
            return (
              <Pressable
                accessibilityLabel={group.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={group.id}
                onPress={() => {
                  if (group.tool) {
                    onSelectTool(group.tool);
                  }
                }}
                style={({ pressed }) => [
                  styles.tool,
                  isSelected && styles.selectedTool,
                  pressed && !isSelected && styles.pressed,
                ]}
              >
                <Ionicons
                  name={group.icon}
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

function SubmenuIcon({ icon, selected }: { icon: SubmenuTool['icon']; selected: boolean }) {
  const foreground = selected ? '#1B1B1F' : '#F8FAFC';

  switch (icon) {
    case 'bolt':
      return <Ionicons color={foreground} name="close" size={18} />;
    case 'rappelAnchor':
      return (
        <View style={styles.anchorIconWrap}>
          <View style={styles.anchorCircle} />
          <Ionicons color="#F8FAFC" name="arrow-down" size={14} style={styles.anchorArrow} />
        </View>
      );
    case 'belayAnchor':
      return <View style={styles.anchorCircle} />;
    case 'routeMarker':
      return (
        <View style={[styles.routeMarker, selected && styles.selectedRouteMarker]}>
          <Text style={[styles.routeMarkerLabel, selected && styles.selectedRouteMarkerLabel]}>
            12
          </Text>
        </View>
      );
    case 'curvedLine':
      return <Ionicons color={foreground} name="trending-up-outline" size={22} />;
    case 'straightLine':
      return <Ionicons color={foreground} name="remove-outline" size={24} />;
  }
}

const styles = StyleSheet.create({
  anchorArrow: {
    marginTop: -4,
  },
  anchorCircle: {
    backgroundColor: '#C91F37',
    borderColor: '#F8FAFC',
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  anchorIconWrap: {
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  menuScroll: {
    flexGrow: 0,
    height: 44,
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
  routeMarker: {
    alignItems: 'center',
    backgroundColor: '#C91F37',
    borderColor: '#F8FAFC',
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  routeMarkerLabel: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  selectedTool: {
    backgroundColor: '#F2B58F',
  },
  selectedRouteMarker: {
    borderColor: '#1B1B1F',
  },
  selectedRouteMarkerLabel: {
    color: '#1B1B1F',
  },
  selectedSubmenuTool: {
    backgroundColor: '#F2B58F',
  },
  submenu: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  submenuTool: {
    alignItems: 'center',
    borderRadius: 15,
    height: 40,
    justifyContent: 'center',
    width: 44,
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
