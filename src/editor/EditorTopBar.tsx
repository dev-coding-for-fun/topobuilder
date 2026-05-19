import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type EditorTopBarProps = {
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  canDelete?: boolean;
};

export function EditorTopBar({
  onBack,
  onUndo,
  onRedo,
  onDelete,
  canUndo = true,
  canRedo = true,
  canDelete = false,
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
      {canDelete && onDelete ? (
        <Pressable
          accessibilityLabel="Delete selected annotation"
          accessibilityRole="button"
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Ionicons color="#FEE2E2" name="trash" size={21} />
        </Pressable>
      ) : (
        <View style={styles.contextSlot} />
      )}
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
  contextSlot: {
    height: 44,
    width: 44,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    borderColor: 'rgba(254, 202, 202, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
