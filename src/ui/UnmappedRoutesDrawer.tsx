import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TabvarRoute, TopoWithRoutes } from '@/domain/types';
import { interStyle } from '@/ui/fonts';

type Props = {
  sectorId: string;
  routes: TabvarRoute[];
  topos: TopoWithRoutes[];
  onAddTopoForRoute: (route: TabvarRoute) => void;
  onLinkRoute: (route: TabvarRoute) => void;
};

export function UnmappedRoutesDrawer({
  sectorId,
  routes,
  topos,
  onAddTopoForRoute,
  onLinkRoute,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!routes || routes.length === 0) {
    return null;
  }

  const filteredRoutes = routes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.gradeYds && r.gradeYds.toLowerCase().includes(q)) ||
      (r.climbStyle && r.climbStyle.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container} testID={`crag-detail:sector:${sectorId}:unmapped-drawer`}>
      {/* ── Toggle Header ─────────────────────────────────────────────── */}
      <Pressable
        accessibilityLabel={`Toggle unmapped routes (${routes.length})`}
        accessibilityRole="button"
        onPress={() => setIsExpanded((prev) => !prev)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        testID={`crag-detail:sector:${sectorId}:unmapped-toggle`}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            color="#475569"
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
          />
          <Text style={styles.headerTitle}>
            Unmapped Routes ({routes.length})
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {isExpanded ? 'Tap to hide' : 'Tap to view & map'}
        </Text>
      </Pressable>

      {/* ── Expanded Content ──────────────────────────────────────────── */}
      {isExpanded ? (
        <View style={styles.content}>
          {routes.length > 4 ? (
            <View style={styles.searchContainer}>
              <Ionicons color="#94A3B8" name="search-outline" size={16} />
              <TextInput
                accessibilityLabel="Filter unmapped routes"
                clearButtonMode="while-editing"
                onChangeText={setSearchQuery}
                placeholder="Search by name or grade…"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                testID={`crag-detail:sector:${sectorId}:unmapped-search`}
                value={searchQuery}
              />
            </View>
          ) : null}

          <View style={styles.routesList}>
            {filteredRoutes.length > 0 ? (
              filteredRoutes.map((route, index) => {
                const metaParts: string[] = [];
                if (route.gradeYds) metaParts.push(route.gradeYds);
                if (route.climbStyle) metaParts.push(route.climbStyle);
                if (route.boltCount) metaParts.push(`${route.boltCount} bolts`);
                const metaText = metaParts.join(' · ');

                return (
                  <View
                    key={route.appId}
                    style={[styles.routeRow, index > 0 && styles.routeRowBorder]}
                    testID={`crag-detail:sector:${sectorId}:unmapped-route:${route.appId}`}
                  >
                    <View style={styles.routeInfo}>
                      <Text numberOfLines={1} style={styles.routeName}>
                        {route.name}
                      </Text>
                      {metaText ? (
                        <Text numberOfLines={1} style={styles.routeMeta}>
                          {metaText}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        accessibilityLabel={`Add new topo for ${route.name}`}
                        accessibilityRole="button"
                        onPress={() => onAddTopoForRoute(route)}
                        style={({ pressed }) => [
                          styles.actionButton,
                          styles.addTopoButton,
                          pressed && styles.pressed,
                        ]}
                        testID={`crag-detail:sector:${sectorId}:unmapped-route:${route.appId}:add-topo`}
                      >
                        <Ionicons color="#0369A1" name="camera-outline" size={14} />
                        <Text style={styles.addTopoButtonText}>+ Add Topo</Text>
                      </Pressable>

                      {topos.length > 0 ? (
                        <Pressable
                          accessibilityLabel={`Link ${route.name} to existing topo`}
                          accessibilityRole="button"
                          onPress={() => onLinkRoute(route)}
                          style={({ pressed }) => [
                            styles.actionButton,
                            styles.linkButton,
                            pressed && styles.pressed,
                          ]}
                          testID={`crag-detail:sector:${sectorId}:unmapped-route:${route.appId}:link`}
                        >
                          <Ionicons color="#334155" name="link-outline" size={14} />
                          <Text style={styles.linkButtonText}>Link</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noMatchesText}>No matching routes found.</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  addTopoButton: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
  },
  addTopoButtonText: {
    color: '#0369A1',
    fontSize: 12,
    ...interStyle('700'),
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  content: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    ...interStyle('400'),
  },
  headerTitle: {
    color: '#334155',
    fontSize: 14,
    ...interStyle('700'),
  },
  linkButton: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  linkButtonText: {
    color: '#334155',
    fontSize: 12,
    ...interStyle('700'),
  },
  noMatchesText: {
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 8,
    textAlign: 'center',
    ...interStyle('400'),
  },
  pressed: {
    opacity: 0.6,
  },
  routeInfo: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  routeMeta: {
    color: '#64748B',
    fontSize: 12,
    ...interStyle('400'),
  },
  routeName: {
    color: '#0F172A',
    fontSize: 14,
    ...interStyle('700'),
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  routeRowBorder: {
    borderTopColor: '#F8FAFC',
    borderTopWidth: 1,
  },
  routesList: {
    marginTop: 4,
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 13,
    padding: 0,
    ...interStyle('400'),
  },
});
