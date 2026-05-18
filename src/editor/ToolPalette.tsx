import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { defaultAnnotationColourForTarget, type StampAnnotationKind } from '@/domain/annotationColours';
import type { EditorTool } from '@/domain/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type OcticonName = ComponentProps<typeof Octicons>['name'];
type ToolbarIcon =
  | { family: 'ionicons'; name: IoniconName }
  | { family: 'materialCommunity'; name: MaterialCommunityIconName }
  | { family: 'octicons'; name: OcticonName };

type ToolGroupId = 'select' | 'stamps' | 'line' | 'label' | 'arrow';

type ToolGroup = {
  id: ToolGroupId;
  label: string;
  icon: ToolbarIcon;
  tool?: EditorTool;
  tools?: EditorTool[];
  submenu?: SubmenuTool[];
};

type SubmenuTool = {
  id?: EditorTool;
  label: string;
  icon: 'bolt' | 'rappelAnchor' | 'belayAnchor' | 'routeMarker';
};

const toolGroups: ToolGroup[] = [
  { id: 'select', label: 'Select', icon: { family: 'ionicons', name: 'navigate-outline' }, tool: 'select' },
  {
    id: 'stamps',
    label: 'Stamps',
    icon: { family: 'ionicons', name: 'hammer-outline' },
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
    icon: { family: 'materialCommunity', name: 'draw' },
    tool: 'climbLine',
    tools: ['climbLine'],
  },
  { id: 'label', label: 'Text tool', icon: { family: 'ionicons', name: 'text-outline' }, tool: 'label' },
  { id: 'arrow', label: 'Arrow tool', icon: { family: 'octicons', name: 'arrow-up-right' }, tool: 'arrow' },
];

export function ToolPalette({
  stampColors,
  selectedTool,
  onSelectTool,
}: {
  stampColors?: Partial<Record<StampAnnotationKind, string>>;
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
                <SubmenuIcon
                  color={tool.id && isStampTool(tool.id) ? stampColors?.[tool.id] : undefined}
                  icon={tool.icon}
                  selected={isSelected}
                />
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
                <ToolbarIcon icon={group.icon} selected={isSelected} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function ToolbarIcon({ icon, selected }: { icon: ToolbarIcon; selected: boolean }) {
  const foreground = selected ? '#1B1B1F' : '#F8FAFC';

  if (icon.family === 'materialCommunity') {
    return <MaterialCommunityIcons color={foreground} name={icon.name} size={22} />;
  }

  if (icon.family === 'octicons') {
    return <Octicons color={foreground} name={icon.name} size={22} />;
  }

  return <Ionicons color={foreground} name={icon.name} size={22} />;
}

function SubmenuIcon({
  color = defaultAnnotationColourForTarget('bolt'),
  icon,
  selected,
}: {
  color?: string;
  icon: SubmenuTool['icon'];
  selected: boolean;
}) {
  const foreground = selected ? '#1B1B1F' : '#F8FAFC';

  switch (icon) {
    case 'bolt':
      return <Ionicons color={color} name="close" size={18} testID="bolt-submenu-icon" />;
    case 'rappelAnchor':
      return (
        <View style={styles.anchorIconWrap}>
          <View style={[styles.anchorCircle, { backgroundColor: color }]} testID="rappel-submenu-icon" />
          <Ionicons color="#F8FAFC" name="arrow-down" size={14} style={styles.anchorArrow} />
        </View>
      );
    case 'belayAnchor':
      return <View style={[styles.anchorCircle, { backgroundColor: color }]} testID="belay-submenu-icon" />;
    case 'routeMarker':
      return (
        <View
          style={[styles.routeMarker, { backgroundColor: color }, selected && styles.selectedRouteMarker]}
          testID="start-submenu-icon"
        >
          <Text style={[styles.routeMarkerLabel, selected && styles.selectedRouteMarkerLabel]}>
            12
          </Text>
        </View>
      );
  }
}

function isStampTool(tool: EditorTool): tool is StampAnnotationKind {
  return tool === 'bolt' || tool === 'rappel' || tool === 'belay' || tool === 'start';
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
