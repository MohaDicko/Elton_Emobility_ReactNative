// ─── Écran Sortie de Marchandises ─────────────────────────────────────────────
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { AppModal, QuantityStepper, AppButton, ModuleKpiStrip } from '@shared/components/ui';
import { ArticleSearchBar, WarehouseSelector, ArticleMetaTags } from '@shared/components';
import type { IArticle } from '@shared/types';
import { useSortieStore, SORTIE_MOTIFS, type SortieMotifT } from '@features/sortie/store/sortieStore';
import { useCreateExit } from '@features/sortie/hooks/useSortie';
import { useSortieKpis } from '@features/sortie/hooks/useSortieKpis';
import SortieItem from '@features/sortie/components/SortieItem';
import { itemService } from '@shared/services/itemService';
import { useAuthStore } from '@core/auth/authStore';

// ─── Composant ───────────────────────────────────────────────────────────────

const SortieScreen = () => {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const [kpiWarehouse, setKpiWarehouse] = useState('');
  const { kpis: sortieKpis, refresh: refreshKpis, refreshing: refreshingKpis } = useSortieKpis(kpiWarehouse);

  // ── State local ──
  const [selectedArticle, setSelectedArticle] = useState<IArticle | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [motifError, setMotifError] = useState(false);
  const [commentaireError, setCommentaireError] = useState(false);
  const assignedWarehouse = useAuthStore((s) => s.user?.warehouseCode ?? '');

  // ── Store Zustand ──
  const cart = useSortieStore((s) => s.cart);
  const defaultWarehouse = useSortieStore((s) => s.defaultWarehouse);
  const motif = useSortieStore((s) => s.motif);
  const addToCart = useSortieStore((s) => s.addToCart);
  const removeFromCart = useSortieStore((s) => s.removeFromCart);
  const setDefaultWarehouse = useSortieStore((s) => s.setDefaultWarehouse);
  const setMotif = useSortieStore((s) => s.setMotif);
  const commentaire = useSortieStore((s) => s.commentaire);
  const setCommentaire = useSortieStore((s) => s.setCommentaire);

  // ── Mutation ──
  const { mutate: createExit, isPending } = useCreateExit();

  useEffect(() => {
    if (assignedWarehouse && defaultWarehouse !== assignedWarehouse) {
      setDefaultWarehouse(assignedWarehouse);
    }
  }, [assignedWarehouse, defaultWarehouse, setDefaultWarehouse]);

  // ── Handlers ──
  const handleArticleSelect = useCallback((article: IArticle) => {
    // Affichage immédiat avec les données de la recherche
    setSelectedArticle(article);
    setQuantity(1);
    // Enrichissement silencieux : GET /Items('CODE') → ItemWarehouseInfoCollection
    // Remplace l'article avec le stock précis par entrepôt sans bloquer l'UI
    itemService.getByCode(article.ItemCode).then((fullArticle) => {
      setSelectedArticle(fullArticle);
    }).catch(() => {
      // Silencieux — l'article de base reste affiché avec stock total
    });
  }, []);

  // Stock dans l'entrepôt sélectionné — disponible si ItemWarehouseInfoCollection présent (scan)
  // Fallback sur QuantityOnStock (stock global) pour les recherches texte
  const warehouseStock = useMemo(() => {
    if (!selectedArticle || !defaultWarehouse) return null;
    const info = selectedArticle.ItemWarehouseInfoCollection?.find(
      (w) => w.WarehouseCode === defaultWarehouse
    );
    return info ? info.InStock : null;
  }, [selectedArticle, defaultWarehouse]);

  const handleAddToCart = () => {
    if (!selectedArticle || !defaultWarehouse) return;
    if (!motif) {
      setMotifError(true);
      Toast.show({
        type: 'info',
        text1: 'Motif obligatoire',
        text2: "Selectionnez d'abord le motif de sortie.",
      });
      return;
    }

    // Priorité au stock entrepôt précis, sinon stock global
    const stockToStore = warehouseStock ?? selectedArticle.QuantityOnStock;

    addToCart({
      itemCode: selectedArticle.ItemCode,
      itemName: selectedArticle.ItemName,
      quantity,
      warehouseCode: defaultWarehouse,
      availableStock: stockToStore,
    });

    setSelectedArticle(null);
    setQuantity(1);
  };

  const handleSendExit = () => {
    if (cart.length === 0) return;
    if (!motif) return;

    createExit({
      lines: cart.map((item) => ({
        ItemCode: item.itemCode,
        Quantity: item.quantity,
        WarehouseCode: item.warehouseCode,
      })),
      motif: motif ?? undefined,
      commentaire: commentaire.trim() || undefined,
    });

    setConfirmVisible(false);
  };

  const handleOpenConfirm = useCallback(() => {
    if (cart.length === 0) return;

    let hasError = false;

    if (!motif) {
      setMotifError(true);
      hasError = true;
    }

    if (!commentaire.trim()) {
      setCommentaireError(true);
      hasError = true;
    }

    if (hasError) {
      Toast.show({
        type: 'info',
        text1: 'Champs obligatoires manquants',
        text2: !motif && !commentaire.trim()
          ? 'Selectionnez un motif et saisissez un commentaire.'
          : !motif
          ? 'Selectionnez un motif de sortie.'
          : 'Le commentaire est obligatoire.',
      });
      return;
    }

    setMotifError(false);
    setCommentaireError(false);
    setConfirmVisible(true);
  }, [cart.length, motif, commentaire]);

  const handleRefresh = useCallback(() => {
    refreshKpis();
  }, [refreshKpis]);

  const canSearchArticle = motif !== null;
  const canAddToCart =
    selectedArticle !== null && defaultWarehouse.length > 0 && quantity > 0 && canSearchArticle;

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ── Render ──
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBrand, { backgroundColor: COLORS.danger }]} />
          <View style={styles.headerContent}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.danger}18` }]}>
              <MaterialCommunityIcons name="package-up" size={22} color={COLORS.danger} />
            </View>
            <Text style={styles.headerTitle}>Sortie Marchandises</Text>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.kpiFilterBlock}>
            <WarehouseSelector
              label="Filtre KPIs"
              value={kpiWarehouse}
              onChange={(value) => setKpiWarehouse(value.trim().toUpperCase())}
              allowAllOption
              allOptionLabel="Tous les entrepots"
            />
            {kpiWarehouse.length > 0 && (
              <AppButton
                label="Tous les entrepots"
                onPress={() => setKpiWarehouse('')}
                variant="ghost"
                icon="filter-remove-outline"
              />
            )}
          </View>
        )}

        {/* KPIs */}
        <ModuleKpiStrip kpis={sortieKpis} title="Surveillance mensuelle" />

        <FlatList
          data={cart}
          keyExtractor={(item) => item.itemCode}
          renderItem={({ item }) => (
            <SortieItem item={item} onRemove={removeFromCart} />
          )}
          ListHeaderComponent={
            <View style={styles.formSection}>
              {/* Entrepôt */}
              <WarehouseSelector
                value={defaultWarehouse}
                onChange={setDefaultWarehouse}
                label="Entrepot de sortie"
                allowedCodes={assignedWarehouse ? [assignedWarehouse] : undefined}
              />

              {/* Motif de sortie — sélecteur 4 types SAP */}
              <View style={styles.motifSection}>
                <Text style={styles.motifLabel}>Motif de sortie *</Text>
                <View style={styles.motifGrid}>
                  {SORTIE_MOTIFS.map((m) => {
                    const selected = motif === m.value;
                    return (
                      <TouchableOpacity
                        key={m.value}
                        style={[styles.motifChip, selected && styles.motifChipSelected]}
                        onPress={() => {
                          setMotif(m.value as SortieMotifT);
                          setMotifError(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={m.icon as any}
                          size={18}
                          color={selected ? COLORS.surface : COLORS.textSecondary}
                        />
                        <Text style={[styles.motifChipLabel, selected && styles.motifChipLabelSelected]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {motif === null && (
                  <Text style={[styles.motifHintText, motifError && styles.motifHintTextError]}>
                    Selectionnez le motif avant d'ajouter des articles.
                  </Text>
                )}
              </View>

              {/* Commentaire obligatoire */}
              <View style={styles.commentaireSection}>
                <Text style={styles.motifLabel}>Commentaire *</Text>
                <TextInput
                  style={[
                    styles.commentaireInput,
                    commentaireError && !commentaire.trim() && styles.commentaireInputError,
                  ]}
                  value={commentaire}
                  onChangeText={(text) => {
                    setCommentaire(text);
                    if (text.trim()) setCommentaireError(false);
                  }}
                  placeholder="Décrivez la raison de la sortie..."
                  placeholderTextColor={COLORS.textDisabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                />
                {commentaireError && !commentaire.trim() && (
                  <Text style={styles.commentaireErrorText}>
                    Le commentaire est obligatoire avant de valider.
                  </Text>
                )}
                <Text style={styles.commentaireCounter}>
                  {commentaire.length}/200
                </Text>
              </View>

              {/* Recherche article */}
              <View style={styles.searchSection}>
                {!canSearchArticle && (
                  <View style={styles.searchLockBox}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={16}
                      color={COLORS.orange}
                    />
                    <Text style={styles.searchLockText}>
                      Etape 1: selectionnez d'abord un motif de sortie.
                    </Text>
                  </View>
                )}
                <ArticleSearchBar
                  onArticleSelect={handleArticleSelect}
                  placeholder="Rechercher ou scanner un article..."
                  disabled={!canSearchArticle}
                />
              </View>

              {/* Article sélectionné */}
              {selectedArticle && (
                <View style={styles.selectedSection}>
                  <View style={styles.articleInfo}>
                    <Text style={styles.articleCode}>
                      {selectedArticle.ItemCode}
                    </Text>
                    <Text style={styles.articleName} numberOfLines={2}>
                      {selectedArticle.ItemName}
                    </Text>
                    <Text style={[
                      styles.stockInfo,
                      warehouseStock !== null && warehouseStock < quantity && styles.stockLow,
                    ]}>
                      {warehouseStock !== null
                        ? `Stock ${defaultWarehouse} : ${warehouseStock}`
                        : `Stock total : ${selectedArticle.QuantityOnStock}`}
                    </Text>
                  </View>

                  {/* Caractéristiques article */}
                  <ArticleMetaTags article={selectedArticle} />

                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    label="Quantité à sortir"
                  />

                  <View style={styles.addButtonContainer}>
                    <AppButton
                      label="AJOUTER À LA SORTIE"
                      onPress={handleAddToCart}
                      variant="primary"
                      icon="plus-circle"
                      fullWidth
                      disabled={!canAddToCart}
                    />
                  </View>
                </View>
              )}

              {/* Titre panier */}
              {cart.length > 0 && (
                <View style={styles.cartHeader}>
                  <MaterialCommunityIcons
                    name="package-up"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.cartTitle}>
                    Articles à sortir ({cart.length})
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !selectedArticle ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="package-up"
                  size={48}
                  color={COLORS.textDisabled}
                />
                <Text style={styles.emptyTitle}>Aucun article</Text>
                <Text style={styles.emptySubtitle}>
                  Scannez ou recherchez un article pour enregistrer une sortie
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshingKpis}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />

        {/* Barre du bas */}
        {cart.length > 0 && (
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomLabel}>
                {cart.length} article{cart.length > 1 ? 's' : ''} — {totalQuantity} unité{totalQuantity > 1 ? 's' : ''}
              </Text>
            </View>
            <AppButton
              label="VALIDER LA SORTIE"
              onPress={handleOpenConfirm}
              variant="primary"
              loading={isPending}
              fullWidth
              icon="check-circle"
              disabled={cart.length === 0}
            />
          </View>
        )}

        {/* Modal de confirmation */}
        <AppModal
          visible={confirmVisible}
          title="Confirmer la sortie ?"
          message={`Vous allez sortir ${totalQuantity} unité${totalQuantity > 1 ? 's' : ''} (${cart.length} article${cart.length > 1 ? 's' : ''}) du stock.\n\nMotif : ${motif ?? '—'}\nCommentaire : ${commentaire.trim() || '—'}\n\nCette action est irréversible.`}
          confirmLabel="Valider la sortie"
          onConfirm={handleSendExit}
          onCancel={() => setConfirmVisible(false)}
          loading={isPending}
        />
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
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
  kpiFilterBlock: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 4,
  },
  listContent: {
    flexGrow: 1,
  },
  formSection: {
    paddingHorizontal: 16,
  },
  searchSection: {
    marginBottom: 12,
  },
  searchLockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    marginBottom: 8,
  },
  searchLockText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
  },
  selectedSection: {
    marginBottom: 16,
    gap: 12,
  },
  articleInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
  },
  articleCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  articleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  stockInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stockLow: {
    color: '#F47920',
    fontWeight: '600',
  },
  motifSection: {
    marginBottom: 12,
  },
  motifLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  motifGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  motifChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 4,
  },
  motifChipSelected: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  motifChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  motifChipLabelSelected: {
    color: COLORS.surface,
  },
  motifHintText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: '500',
  },
  motifHintTextError: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  commentaireSection: {
    marginBottom: 12,
  },
  commentaireInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
  },
  commentaireInputError: {
    borderColor: COLORS.danger,
  },
  commentaireErrorText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
  },
  commentaireCounter: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textDisabled,
    textAlign: 'right',
  },
  addButtonContainer: {
    marginTop: 4,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomInfo: {
    marginBottom: 10,
  },
  bottomLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default SortieScreen;
