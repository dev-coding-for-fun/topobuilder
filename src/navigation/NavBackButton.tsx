import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

const ICON_SIZE = 24;

type NavBackButtonProps = {
  href?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  tone?: 'default' | 'onDark';
};

export function NavBackButton({
  href,
  onPress,
  style,
  testID = 'nav:header-back',
  tone = 'default',
}: NavBackButtonProps) {
  const color = tone === 'onDark' ? '#F8FAFC' : '#111827';

  function handlePress() {
    if (onPress) {
      onPress();
      return;
    }
    if (href) {
      // Replace so the current screen does not stay behind its logical parent.
      router.replace(href as Href);
    }
  }

  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={12}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      testID={testID}
    >
      <Ionicons color={color} name="arrow-back" size={ICON_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.6,
  },
});
