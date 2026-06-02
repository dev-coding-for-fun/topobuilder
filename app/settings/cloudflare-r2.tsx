import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

export default function CloudflareR2Screen() {
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucket, setBucket] = useState('');
  const [endpoint, setEndpoint] = useState('');

  return (
    <Screen edges={['left', 'right', 'bottom']} style={styles.screen} testID="settings:r2-screen">
      <Stack.Screen
        options={{
          title: 'Cloudflare R2',
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Configure a personal Cloudflare R2 bucket to back up topo photos. Saving credentials is
          not wired up yet — this form is a placeholder.
        </Text>

        <Field
          autoCapitalize="none"
          label="Account ID"
          onChangeText={setAccountId}
          testID="settings:r2:account-id"
          value={accountId}
        />
        <Field
          autoCapitalize="none"
          label="Access Key ID"
          onChangeText={setAccessKeyId}
          testID="settings:r2:access-key-id"
          value={accessKeyId}
        />
        <Field
          autoCapitalize="none"
          label="Secret Access Key"
          onChangeText={setSecretAccessKey}
          secureTextEntry
          testID="settings:r2:secret"
          value={secretAccessKey}
        />
        <Field
          autoCapitalize="none"
          label="Bucket name"
          onChangeText={setBucket}
          testID="settings:r2:bucket"
          value={bucket}
        />
        <Field
          autoCapitalize="none"
          helper="e.g. https://<account>.r2.cloudflarestorage.com"
          label="Endpoint URL"
          onChangeText={setEndpoint}
          placeholder="https://"
          testID="settings:r2:endpoint"
          value={endpoint}
        />

        <View style={styles.actions}>
          <Button
            disabled
            label="Test connection"
            onPress={() => undefined}
            testID="settings:r2:test"
            variant="secondary"
          />
          <Button disabled label="Save" onPress={() => undefined} testID="settings:r2:save" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  helper,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string; helper?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        {...input}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    paddingTop: 12,
  },
  field: {
    gap: 6,
  },
  fieldHelper: {
    color: '#6B7280',
    fontSize: 12,
  },
  fieldLabel: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    ...interStyle('700'),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  intro: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 6,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  scroll: {
    gap: 14,
    paddingBottom: 60,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
