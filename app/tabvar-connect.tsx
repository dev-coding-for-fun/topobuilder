import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { completeTabvarConnect } from '@/integrations/tabvar/client';
import { saveTabvarSession } from '@/integrations/tabvar/sessionStore';
import { startInitialIssueSync } from '@/issues/sync';
import { Screen } from '@/ui/Screen';
import { interStyle } from '@/ui/fonts';

const ticketCompletions = new Map<string, Promise<void>>();

export default function TabvarConnectCallbackScreen() {
  const { ticket, error } = useLocalSearchParams<{
    ticket?: string;
    error?: string;
  }>();
  const [status, setStatus] = useState('Connecting to Tabvar…');

  useEffect(() => {
    let mounted = true;

    async function completeConnection() {
      const callbackError = firstParam(error);
      if (callbackError) {
        redirectWithError(callbackError);
        return;
      }

      const nextTicket = firstParam(ticket);
      if (!nextTicket) {
        redirectWithError('Tabvar did not include a connection ticket.');
        return;
      }

      try {
        await completeTicketOnce(nextTicket);
        if (mounted) {
          setStatus('Connected. Returning to Settings…');
        }
        router.replace('/settings?tabvar=connected');
      } catch (connectError) {
        redirectWithError(errorMessage(connectError, 'Could not complete Tabvar connection.'));
      }
    }

    void completeConnection();

    return () => {
      mounted = false;
    };
  }, [error, ticket]);

  return (
    <Screen style={styles.screen} testID="tabvar-connect:screen">
      <Stack.Screen options={{ title: 'Tabvar' }} />
      <View style={styles.card}>
        <Text style={styles.title}>Tabvar</Text>
        <Text style={styles.body}>{status}</Text>
      </View>
    </Screen>
  );
}

export function _resetTabvarConnectTicketCacheForTests() {
  ticketCompletions.clear();
}

function completeTicketOnce(ticket: string): Promise<void> {
  const existing = ticketCompletions.get(ticket);
  if (existing) return existing;

  const completion = completeAndPersistTicket(ticket).catch((error) => {
    ticketCompletions.delete(ticket);
    throw error;
  });
  ticketCompletions.set(ticket, completion);
  return completion;
}

async function completeAndPersistTicket(ticket: string): Promise<void> {
  const session = await completeTabvarConnect(ticket);
  await saveTabvarSession(session);
  startInitialIssueSync();
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function redirectWithError(message: string) {
  router.replace(`/settings?tabvarError=${encodeURIComponent(message)}`);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const styles = StyleSheet.create({
  body: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 8,
    margin: 24,
    padding: 24,
  },
  screen: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#111827',
    fontSize: 22,
    ...interStyle('800'),
  },
});
