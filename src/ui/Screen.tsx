import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StyleSheet, type ViewStyle } from 'react-native';

export function Screen({
  children,
  style,
  testID,
  edges,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  edges?: readonly Edge[];
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]} testID={testID}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
});
