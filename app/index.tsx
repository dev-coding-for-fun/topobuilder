import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTopoStore } from '@/state/TopoStore';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

export default function ProjectListScreen() {
  const { summaries, isReady, createProject } = useTopoStore();
  const [name, setName] = useState('New crag topo');
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateProject() {
    setIsCreating(true);
    try {
      const project = await createProject(name.trim() || 'Untitled topo');
      router.push(`/projects/${project.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Offline topo builder</Text>
        <Text style={styles.title}>Stamp bolts, anchors, starts, labels, and route lines in the field.</Text>
        <Text style={styles.subtitle}>Everything stays local to the device for this MVP.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a topo</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Topo name"
          style={styles.input}
          value={name}
        />
        <Button
          disabled={!isReady || isCreating}
          label={isCreating ? 'Creating...' : 'Create topo'}
          onPress={handleCreateProject}
        />
      </View>

      <FlatList
        ListEmptyComponent={
          <Text style={styles.empty}>{isReady ? 'No local topos yet.' : 'Preparing offline storage...'}</Text>
        }
        contentContainerStyle={styles.listContent}
        data={summaries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.projectCard}>
            <View style={styles.projectCopy}>
              <Text style={styles.projectTitle}>{item.name}</Text>
              <Text style={styles.projectMeta}>
                {item.photoCount} photos · {item.routeCount} routes
              </Text>
            </View>
            <Button label="Open" onPress={() => router.push(`/projects/${item.id}`)} variant="secondary" />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  empty: {
    color: '#6B7280',
    paddingVertical: 24,
    textAlign: 'center',
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  hero: {
    gap: 10,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  listContent: {
    gap: 12,
    paddingBottom: 32,
    paddingTop: 18,
  },
  projectCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  projectCopy: {
    flex: 1,
  },
  projectMeta: {
    color: '#6B7280',
    marginTop: 4,
  },
  projectTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  screen: {
    gap: 18,
    padding: 18,
  },
  subtitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 23,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
});
