import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { useAuthStore } from '@core/auth/authStore';
import { useAllActivite, useMyActivite } from '@features/activite/hooks/useActivite';
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

const DOC_TYPES: DocType[] = ['Commande', 'Reception', 'Sortie', 'Entree', 'Transfert', 'Inventaire'];

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

const ActiviteRow = ({ item, showUser }: { item: IActiviteItem; showUser: boolean }) => {
  const normalized = normalizeDocType(item.U_TypeDoc);
  const config = normalized ? TYPE_CONFIG[normalized] : { color: COLORS.textSecondary, icon: 'file-outline' };

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: `${config.color}18` }]}>
        <MaterialCommunityIcons name={config.icon as any} size={22} color={config.color} />
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.typeLabel, { color: config.color }]}>{prettyDocType(item.U_TypeDoc)}</Text>
          {item.U_DocNum ? <Text style={styles.docNum}>{`N\u00B0 ${item.U_DocNum}`}</Text> : null}
        </View>
        {showUser ? <Text style={styles.userName} numberOfLines={1}>{item.U_UtilisateurMob}</Text> : null}
        {item.U_Tiers ? <Text style={styles.tiers} numberOfLines={1}>{item.U_Tiers}</Text> : null}
        <Text style={styles.date}>{(item.U_DocDate ?? '').slice(0, 10)}</Text>
      </View>
    </View>
  );
};

const ActiviteScreen = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin ?? false;
  const [selectedDocType, setSelectedDocType] = useState<DocType | null>(null);
  const myQuery = useMyActivite(isAdmin ? '' : (user?.userName ?? ''));
  const allQuery = useAllActivite(isAdmin);
  const currentQuery = isAdmin ? allQuery : myQuery;

  const { data = [], isLoading, isError, refetch, isFetching } = currentQuery;

  const filteredData = useMemo(
    () =>
      selectedDocType
        ? data.filter((item) => normalizeDocType(item.U_TypeDoc) === selectedDocType)
        : data,
    [data, selectedDocType]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={[styles.headerBrand, { backgroundColor: COLORS.primary }]} />
        <View style={styles.headerContent}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.primary}18` }]}>
            <MaterialCommunityIcons name="history" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>{isAdmin ? 'Activit\u00E9s' : 'Mon Activit\u00E9'}</Text>
          <Text style={styles.headerCount}>
            {isLoading ? '...' : `${filteredData.length} doc${filteredData.length > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            style={[styles.chip, selectedDocType === null ? styles.chipActive : styles.chipInactive]}
            onPress={() => setSelectedDocType(null)}
          >
            <Text style={[styles.chipText, selectedDocType === null ? styles.chipTextActive : styles.chipTextInactive]}>
              Tous
            </Text>
          </Pressable>
          {DOC_TYPES.map((docType) => (
            <Pressable
              key={docType}
              style={[styles.chip, selectedDocType === docType ? styles.chipActive : styles.chipInactive]}
              onPress={() => setSelectedDocType(docType === selectedDocType ? null : docType)}
            >
              <Text style={[styles.chipText, selectedDocType === docType ? styles.chipTextActive : styles.chipTextInactive]}>
                {DOC_TYPE_LABELS[docType]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : isError ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.danger} />
          <Text style={styles.errorText}>{'Impossible de charger l\'activit\u00E9'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.Code}
          renderItem={({ item }) => <ActiviteRow item={item} showUser={isAdmin} />}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="history" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>{'Aucune activit\u00E9'}</Text>
              <Text style={styles.emptySubtitle}>
                {selectedDocType
                  ? `Aucun document de type "${DOC_TYPE_LABELS[selectedDocType]}"`
                  : isAdmin
                    ? "Aucun document cree par les utilisateurs"
                    : 'Les documents crees apparaitront ici'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerBrand: { height: 4 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  headerCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filterSection: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
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
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
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
    fontSize: 13,
    fontWeight: '700',
  },
  docNum: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tiers: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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

export default ActiviteScreen;

