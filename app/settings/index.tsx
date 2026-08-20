import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { buildTabvarConnectUrl } from '@/integrations/tabvar/links';
import { clearTabvarSession, loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { disconnectTabvar } from '@/integrations/tabvar/client';
import type { TabvarSession } from '@/integrations/tabvar/types';
import { resyncTabvarIssues } from '@/issues/sync';
import {
  DEFAULT_EXPORT_DISCLAIMER_SETTINGS,
  type ExportDisclaimerSettings,
  loadExportDisclaimerSettings,
  saveExportDisclaimerSettings,
} from '@/settings/exportDisclaimer';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

export default function SettingsScreen() {
  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="settings:screen">
      <Stack.Screen
        options={{
          title: 'Settings',
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Connected services">
          <TabvarSyncPanel />
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
          <ExportDisclaimerPanel />
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

function ExportDisclaimerPanel() {
  const [settings, setSettings] = useState<ExportDisclaimerSettings>(DEFAULT_EXPORT_DISCLAIMER_SETTINGS);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    loadExportDisclaimerSettings()
      .then((nextSettings) => {
        if (mounted) {
          setSettings(nextSettings);
        }
      })
      .catch((loadError) => {
        if (mounted) {
          setError(errorMessage(loadError, 'Could not load export disclaimer settings.'));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  function updateSettings(nextSettings: ExportDisclaimerSettings) {
    setSettings(nextSettings);
    setError(undefined);
    saveExportDisclaimerSettings(nextSettings).catch((saveError) => {
      setError(errorMessage(saveError, 'Could not save export disclaimer settings.'));
    });
  }

  return (
    <View style={styles.disclaimerPanel} testID="settings:export-disclaimer">
      <ToggleRow
        onValueChange={(enabled) => updateSettings({ ...settings, enabled })}
        subtitle="Add this safety notice to every exported PDF"
        testID="settings:export-disclaimer-enabled"
        title="Export disclaimer"
        value={settings.enabled}
      />
      <View style={styles.disclaimerEditor}>
        <TextInput
          editable={settings.enabled}
          multiline
          onChangeText={(text) => updateSettings({ ...settings, text })}
          placeholder="Disclaimer text"
          style={[styles.disclaimerInput, !settings.enabled && styles.disclaimerInputDisabled]}
          testID="settings:export-disclaimer-text"
          textAlignVertical="top"
          value={settings.text}
        />
        {error ? (
          <Text style={styles.preferenceError} testID="settings:export-disclaimer-error">
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function TabvarSyncPanel() {
  const { tabvar, tabvarError } = useLocalSearchParams<{
    tabvar?: string;
    tabvarError?: string;
  }>();
  const [session, setSession] = useState<TabvarSession>();
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'connect' | 'disconnect' | 'resync'>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const refreshSession = useCallback(async () => {
    setSession(await loadTabvarSession());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setIsLoading(true);
      loadTabvarSession()
        .then((nextSession) => {
          if (mounted) {
            setSession(nextSession);
            setIsLoading(false);
          }
        })
        .catch((loadError) => {
          if (mounted) {
            setError(errorMessage(loadError, 'Could not load Tabvar connection.'));
            setIsLoading(false);
          }
        });
      return () => {
        mounted = false;
      };
    }, []),
  );

  useEffect(() => {
    const nextError = firstParam(tabvarError);
    const nextStatus = firstParam(tabvar);
    if (nextError) {
      setError(nextError);
      setMessage(undefined);
    } else if (nextStatus === 'connected') {
      setMessage('Connected to Tabvar.');
      setError(undefined);
      void refreshSession();
    }
  }, [refreshSession, tabvar, tabvarError]);

  async function handleConnect() {
    setBusyAction('connect');
    setError(undefined);
    setMessage(undefined);
    try {
      await Linking.openURL(buildTabvarConnectUrl());
      setMessage('Finish connecting in the Tabvar browser window.');
    } catch (connectError) {
      setError(errorMessage(connectError, 'Could not open Tabvar.'));
    } finally {
      setBusyAction(undefined);
    }
  }

  async function handleDisconnect() {
    setBusyAction('disconnect');
    setError(undefined);
    setMessage(undefined);
    const accessToken = session?.accessToken;
    try {
      if (accessToken) {
        await disconnectTabvar(accessToken);
      }
      setMessage('Disconnected from Tabvar.');
    } catch (disconnectError) {
      setMessage('Disconnected locally. Tabvar could not be notified.');
      setError(errorMessage(disconnectError, 'Tabvar disconnect failed.'));
    } finally {
      await clearTabvarSession();
      setSession(undefined);
      setBusyAction(undefined);
    }
  }

  async function handleResync() {
    setBusyAction('resync');
    setError(undefined);
    setMessage(undefined);
    try {
      await resyncTabvarIssues();
      setMessage('Route issues resynced from Tabvar.');
    } catch (resyncError) {
      setError(errorMessage(resyncError, 'Could not resync route issues.'));
    } finally {
      setBusyAction(undefined);
    }
  }

  const identity = session ? tabvarIdentity(session) : undefined;
  const isBusy = !!busyAction;

  return (
    <View style={styles.tabvarPanel} testID="settings:tabvar">
      <View style={styles.tabvarHeader}>
        <Ionicons color="#374151" name="cloud-upload-outline" size={20} style={styles.rowIcon} />
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>TABVAR sync</Text>
          <Text style={styles.rowSubtitle}>
            {isLoading
              ? 'Checking connection…'
              : session
                ? `Connected${identity ? ` as ${identity}` : ''}`
                : 'Not connected'}
          </Text>
        </View>
      </View>

      <Text style={styles.tabvarBody}>
        Connect TopoBuilder to Tabvar to publish or sync guidebook data when exports are ready.
      </Text>

      {message ? (
        <Text style={styles.tabvarMessage} testID="settings:tabvar-message">
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.tabvarError} testID="settings:tabvar-error">
          {error}
        </Text>
      ) : null}

      <View style={styles.tabvarActions}>
        {session ? (
          <>
            <Button
              disabled={isBusy}
              label={busyAction === 'resync' ? 'Resyncing…' : 'Resync route issues'}
              onPress={handleResync}
              testID="settings:tabvar-resync"
              variant="secondary"
            />
            <Button
              disabled={isBusy}
              label={busyAction === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
              onPress={handleDisconnect}
              testID="settings:tabvar-disconnect"
              variant="secondary"
            />
          </>
        ) : (
          <Button
            disabled={isBusy || isLoading}
            label={busyAction === 'connect' ? 'Opening Tabvar…' : 'Connect with Tabvar'}
            onPress={handleConnect}
            testID="settings:tabvar-connect"
          />
        )}
        <Button
          disabled={isBusy}
          label="View sync log"
          onPress={() => router.push('/settings/issue-sync-log')}
          testID="settings:tabvar-sync-log"
          variant="secondary"
        />
      </View>
    </View>
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function tabvarIdentity(session: TabvarSession) {
  return session.email || session.displayName || session.tabvarUserId;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const styles = StyleSheet.create({
  disclaimerEditor: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  disclaimerInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 132,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...interStyle('400'),
  },
  disclaimerInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  disclaimerPanel: {
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
  },
  preferenceError: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
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
  tabvarActions: {
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 4,
  },
  tabvarBody: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  tabvarError: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
  },
  tabvarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  tabvarMessage: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 18,
  },
  tabvarPanel: {
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
