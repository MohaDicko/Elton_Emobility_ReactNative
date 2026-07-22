// ─── Écran Inventaire — Liste des documents ouverts ──────────────────────────
import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { useAuthStore } from '@core/auth/authStore';
import { useOpenCountings } from '@features/inventaire/hooks/useInventaire';
import { useInventaireStore } from '@features/inventaire/store/inventaireStore';
import type { IInventoryCounting } from '@shared/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

// ─── Composant ───────────────────────────────────────────────────────────────

const InventaireScreen = () => {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const userWarehouse = useAuthStore((s) => s.user?.warehouseCode ?? '');
  // Non-admin : uniquement les inventaires de son magasin (magasin porté par les lignes)
  const { data: documents = [], isLoading, refetch, isRefetching } = useOpenCountings(
    isAdmin ? undefined : userWarehouse || undefined
  );
  const selectDocument = useInventaireStore((s) => s.selectDocument);

  const visibleDocuments = documents;

  const handleOpen = useCallback((doc: IInventoryCounting) => {
    selectDocument(doc.DocumentEntry);
    router.push(`/(main)/inventaire/${doc.DocumentEntry}`);
  }, [selectDocument]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Render item ──
  // NOTE : InventoryCountingLines est vide dans la réponse liste SAP — confirmé Postman.
  // La progression et les entrepôts ne sont disponibles qu'au chargement du détail.
  // La carte affiche uniquement N° et date — l'utilisateur tape pour voir les lignes.
  const renderDoc = ({ item: doc }: { item: IInventoryCounting }) => (
    <Pressable
      style={({ pressed }) => [styles.docCard, pressed && styles.docCardPressed]}
      onPress={() => handleOpen(doc)}
    >
      {/* En-tête carte */}
      <View style={styles.docHeader}>
        <View style={styles.docBadge}>
          <Text style={styles.docBadgeText}>N°{doc.DocumentNumber}</Text>
        </View>
        <Text style={styles.docDate}>{formatDate(doc.CountDate)}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textDisabled} />
      </View>

      {/* Statut */}
      <View style={styles.statusRow}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={COLORS.blue} />
        <Text style={styles.statusText}>En attente de comptage</Text>
      </View>
    </Pressable>
  );

  // ── Render ──
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerBrand, { backgroundColor: COLORS.blue }]} />
        <View style={styles.headerContent}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.blue}18` }]}>
            <MaterialCommunityIcons name="clipboard-check" size={22} color={COLORS.blue} />
          </View>
          <Text style={styles.headerTitle}>Inventaire</Text>
          {visibleDocuments.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{visibleDocuments.length}</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={visibleDocuments}
        keyExtractor={(doc) => String(doc.DocumentEntry)}
        renderItem={renderDoc}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isLoading}
            onRefresh={handleRefresh}
            tintColor={COLORS.blue}
            colors={[COLORS.blue]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="clipboard-text-off-outline"
                size={52}
                color={COLORS.textDisabled}
              />
              <Text style={styles.emptyTitle}>Aucun document ouvert</Text>
              <Text style={styles.emptySubtitle}>
                Créez un document d'inventaire depuis SAP Desktop, puis revenez ici pour commencer le comptage.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  headerBadge: {
    backgroundColor: COLORS.blue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  // ── Carte document ──
  docCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  docCardPressed: {
    opacity: 0.85,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docBadge: {
    backgroundColor: COLORS.blue,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  docBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  docDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.blue,
  },
  // ── État vide ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textDisabled,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default InventaireScreen;
