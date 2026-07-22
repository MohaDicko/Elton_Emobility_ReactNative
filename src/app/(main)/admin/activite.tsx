import React, { useState, useMemo } from 'react';
import { View, FlatList, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '@core/config/theme';
import { useAllActivite } from '@features/activite/hooks/useActivite';
import type { IActiviteItem } from '@features/activite/types';

type DocType = 'Commande' | 'Reception' | 'Sortie' | 'Entree' | 'Transfert' | 'Inventaire';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  Commande: 'Commande',
  Reception: 'R\u00E9ception',
  Sortie: 'Sortie',
  Entree: 'Entr\u00E9e',
  Transfert: 'Transfert',
  Inventaire: 'Inventaire',
};

const TYPE_CONFIG: Record<DocType, { color: string; icon: string }> = {
  Commande: { color: COLORS.primary, icon: 'cart-plus' },
  Reception: { color: COLORS.blue, icon: 'package-down' },
  Sortie: { color: COLORS.danger, icon: 'package-up' },
  Entree: { color: COLORS.greenLight, icon: 'login' },
  Transfert: { color: COLORS.orange, icon: 'swap-horizontal' },
  Inventaire: { color: COLORS.info, icon: 'clipboard-check' },
};

const fixMojibake = (value: string): string => {
  let current = String(value ?? '');
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(escape(current));
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

const normalizeDocType = (raw: string): DocType | null => {
  const v = fixMojibake(raw).trim();
  if (v === 'Commande') return 'Commande';
  if (v === 'Sortie') return 'Sortie';
  if (v === 'Transfert') return 'Transfert';
  if (v === 'Inventaire') return 'Inventaire';
  if (v === 'Reception' || v === 'R\u00E9ception') return 'Reception';
  if (v === 'Entree' || v === 'Entr\u00E9e') return 'Entree';
  return null;
};

const prettyDocType = (raw: string): string => {
  const normalized = normalizeDocType(raw);
  return normalized ? DOC_TYPE_LABELS[normalized] : fixMojibake(raw);
};

const ActiviteRow = ({ item }: { item: IActiviteItem }) => {
  const normalized = normalizeDocType(item.U_TypeDoc);
  const config = normalized ? TYPE_CONFIG[normalized] : { color: COLORS.textSecondary, icon: 'file-outline' };

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: `${config.color}18` }]}>
        <MaterialCommunityIcons name={config.icon as any} size={20} color={config.color} />
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.typeLabel, { color: config.color }]}>{prettyDocType(item.U_TypeDoc)}</Text>
          {item.U_DocNum ? <Text style={styles.docNum}>{`N\u00B0 ${item.U_DocNum}`}</Text> : null}
        </View>
        <Text style={styles.userName} numberOfLines={1}>{item.U_UtilisateurMob}</Text>
        {item.U_Tiers ? <Text style={styles.tiers} numberOfLines={1}>{item.U_Tiers}</Text> : null}
        <Text style={styles.date}>{(item.U_DocDate ?? '').slice(0, 10)}</Text>
      </View>
    </View>
  );
};

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}>
    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
      {label}
    </Text>
  </Pressable>
);

const AdminActiviteScreen = () => {
  const { data = [], isLoading, isError, refetch, isFetching } = useAllActivite();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const users = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.U_UtilisateurMob) set.add(item.U_UtilisateurMob);
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(
    () => (selectedUser ? data.filter((item) => item.U_UtilisateurMob === selectedUser) : data),
    [data, selectedUser]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{'Activités des utilisateurs'}</Text>
      </View>

      {users.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterChip label="Tous" active={selectedUser === null} onPress={() => setSelectedUser(null)} />
            {users.map((u) => (
              <FilterChip
                key={u}
                label={u}
                active={selectedUser === u}
                onPress={() => setSelectedUser(u === selectedUser ? null : u)}
              />
            ))}
          </ScrollView>
          <Text style={styles.resultCount}>
            {filteredData.length} document{filteredData.length > 1 ? 's' : ''}
            {selectedUser ? ` - ${selectedUser}` : ''}
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : isError ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.danger} />
          <Text style={styles.errorText}>{'Impossible de charger les activités'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.Code}
          renderItem={({ item }) => <ActiviteRow item={item} />}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="history" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>{'Aucune activité'}</Text>
              <Text style={styles.emptySubtitle}>
                {selectedUser
                  ? `Aucun document pour ${selectedUser}`
                  : "Aucun document cree depuis l'application"}
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  filterSection: {
    backgroundColor: COLORS.white,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipInactive: {
    backgroundColor: 'transparent',
    borderColor: `${COLORS.primary}60`,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  chipTextInactive: {
    color: COLORS.primary,
  },
  loader: {
    marginTop: 60,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  docNum: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tiers: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  separator: {
    height: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textDisabled,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default AdminActiviteScreen;
