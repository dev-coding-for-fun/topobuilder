import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { interStyle } from '@/ui/fonts';

type BottomSheetProps = {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  testID?: string;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
};

/**
 * Lightweight modal-based bottom sheet — backdrop + rounded panel anchored to
 * the bottom.
 *
 * The `90%` height cap lives on `sheetWrap`, not the sheet itself: a percentage
 * height must resolve against a parent with a *definite* height. The backdrop
 * is `flex: 1` (definite), but the sheet's own parent hugs its content, so a
 * `maxHeight: '90%'` on the sheet resolves circularly and leaves ~10% of the
 * wrapper empty below the panel.
 *
 * Keyboard handling differs by content type:
 * - Scrollable sheets use `KeyboardAwareScrollView`, which scrolls the focused
 *   field above the keyboard (the panel itself stays anchored).
 * - Non-scrollable sheets (short, single-input) are lifted as a whole by
 *   padding the backdrop with the keyboard height.
 */
export function BottomSheet({
  visible,
  title,
  children,
  onClose,
  testID,
  contentStyle,
  scrollable = true,
}: BottomSheetProps) {
  const keyboardHeight = useKeyboardHeight();
  // Scrollable sheets manage the keyboard internally; only lift the panel for
  // the non-scrollable ones.
  const lift = scrollable ? 0 : keyboardHeight;
  const dropBottomInset = !scrollable && keyboardHeight > 0;

  const header = (
    <>
      <View style={styles.handle} />
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
          >
            <Ionicons color="#374151" name="close" size={22} />
          </Pressable>
        </View>
      ) : null}
    </>
  );

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close sheet"
        onPress={onClose}
        style={[styles.backdrop, { paddingBottom: lift }]}
      >
        <Pressable onPress={() => undefined} style={styles.sheetWrap} testID={testID}>
          <SafeAreaView edges={dropBottomInset ? [] : ['bottom']} style={styles.sheet}>
            {header}
            {scrollable ? (
              <KeyboardAwareScrollView
                bottomOffset={16}
                contentContainerStyle={[styles.body, contentStyle]}
                keyboardShouldPersistTaps="handled"
                style={styles.scrollBody}
              >
                {children}
              </KeyboardAwareScrollView>
            ) : (
              <View style={[styles.body, contentStyle]}>{children}</View>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Tracks the on-screen keyboard height so the sheet can lift above it. iOS uses
 * the `Will*` events so the sheet animates in lockstep with the keyboard;
 * Android only reliably reports geometry on the `Did*` events.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15,23,42,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  closeButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#D1D5DB',
    borderRadius: 999,
    height: 4,
    marginTop: 10,
    width: 44,
  },
  scrollBody: {
    flexShrink: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexShrink: 1,
    paddingBottom: 12,
  },
  sheetWrap: {
    maxHeight: '90%',
    width: '100%',
  },
  title: {
    color: '#111827',
    flex: 1,
    fontSize: 18,
    ...interStyle('800'),
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
});
