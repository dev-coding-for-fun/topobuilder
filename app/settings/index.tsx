import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

export default function SettingsScreen() {
  return (
    <Screen style={styles.screen} testID="settings:screen">
      <Stack.Screen
        options={{
          title: 'Settings',
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons color="#111827" name="arrow-back" size={22} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Connected services">
          <Row
            disabled
            icon="cloud-upload-outline"
            onPress={() => undefined}
            subtitle="Not connected — coming soon"
            testID="settings:tabvar"
            title="TABVAR sync"
          />
          <Row
            disabled
            icon="cloud-upload-outline"
            onPress={() => undefined}
            subtitle="Not connected — coming soon"
            testID="settings:mountain-project"
            title="Mountain Project"
          />
          <Row
            disabled
            icon="cloud-upload-outline"
            onPress={() => undefined}
            subtitle="Not connected — coming soon"
            testID="settings:thecrag"
            title="theCrag"
          />
          <Row
            icon="server-outline"
            onPress={() => router.push('/settings/cloudflare-r2')}
            subtitle="Personal photo backup"
            testID="settings:r2"
            title="Cloudflare R2"
          />
        </Section>

        <Section title="App preferences">
          <ToggleRow
            disabled
            onValueChange={() => undefined}
            subtitle="Theme follows system (coming soon)"
            testID="settings:dark-mode"
            title="Dark mode"
            value={false}
          />
          <ToggleRow
            disabled
            onValueChange={() => undefined}
            subtitle="Metric (coming soon)"
            testID="settings:units"
            title="Use metric units"
            value
          />
        </Section>

        <Section title="About">
          <Row
            disabled
            icon="information-circle-outline"
            onPress={() => undefined}
            subtitle="0.1.0"
            testID="settings:version"
            title="Version"
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  title,
  subtitle,
  icon,
  onPress,
  disabled,
  testID,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.pressed]}
      testID={testID}
    >
      {icon ? <Ionicons color="#374151" name={icon} size={20} style={styles.rowIcon} /> : null}
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {!disabled ? <Ionicons color="#9CA3AF" name="chevron-forward" size={18} /> : null}
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowIcon: {
    width: 24,
  },
  rowSubtitle: {
    color: '#6B7280',
    fontSize: 13,
  },
  rowTitle: {
    color: '#111827',
    fontSize: 16,
    ...interStyle('700'),
  },
  scroll: {
    paddingBottom: 60,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  section: {
    paddingTop: 18,
  },
  sectionBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.4,
    paddingBottom: 8,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
    ...interStyle('700'),
  },
});
