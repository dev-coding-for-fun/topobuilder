import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, type ViewStyle } from 'react-native';

export function Screen({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  return <SafeAreaView style={[styles.screen, style]} testID={testID}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
});
