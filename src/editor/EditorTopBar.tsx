import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type EditorTopBarProps = {
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canSave?: boolean;
};

export function EditorTopBar({
  onBack,
  onUndo,
  onRedo,
  onSave,
  canUndo = true,
  canRedo = true,
  canSave = true,
}: EditorTopBarProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <IconButton accessibilityLabel="Back" icon="arrow-back" onPress={onBack} />
      <View style={styles.cluster}>
        <ClusterButton
          accessibilityLabel="Undo"
          disabled={!canUndo}
          icon="arrow-undo"
          onPress={onUndo}
        />
        <View style={styles.clusterDivider} />
        <ClusterButton
          accessibilityLabel="Redo"
          disabled={!canRedo}
          icon="arrow-redo"
          onPress={onRedo}
        />
      </View>
      <Pressable
        accessibilityLabel="Save"
        accessibilityRole="button"
        disabled={!canSave}
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveButton,
          !canSave && styles.disabled,
          pressed && canSave && styles.pressed,
        ]}
      >
        <Text style={styles.saveLabel}>Save</Text>
      </Pressable>
    </View>
  );
}

function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  disabled,
}: {
  accessibilityLabel: string;
  icon: IoniconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons color="#F8FAFC" name={icon} size={20} />
    </Pressable>
  );
}

function ClusterButton({
  accessibilityLabel,
  icon,
  onPress,
  disabled,
}: {
  accessibilityLabel: string;
  icon: IoniconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.clusterButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons color="#F8FAFC" name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cluster: {
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  clusterButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 52,
  },
  clusterDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.75,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(75, 38, 24, 0.92)',
    borderColor: 'rgba(255, 184, 138, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  saveLabel: {
    color: '#F2B58F',
    fontSize: 16,
    fontWeight: '700',
  },
  wrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
