// ─── Écran Commande Fournisseur — saisie articles + panier groupé ────────────
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, SectionList, StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { AppButton, QuantityStepper } from '@shared/components/ui';
import {
  ArticleSearchBar, WarehouseSelector, StockMultiWarehouse, ArticleMetaTags,
} from '@shared/components';
import { useWarehouses } from '@shared/hooks';
import type { IArticle } from '@shared/types';
import { itemService } from '@shared/services/itemService';
import { useCommandeStore } from '@features/commande/store/commandeStore';
import { useSuppliers, useSupplierByCode } from '@features/commande/hooks/useCommande';
import ArticleKPIs from '@features/commande/components/ArticleKPIs';
import CartSummary from '@features/commande/components/CartSummary';
import SupplierSelector from '@features/commande/components/SupplierSelector';
import { useAuthStore } from '@core/auth/authStore';

// ─── Composant ───────────────────────────────────────────────────────────────

const CommandeScreen = () => {
  // ── State local ──
  const [selectedArticle, setSelectedArticle] = useState<IArticle | null>(null);
  const [quantity, setQuantity] = useState(1); // nombre de cartons (PCB)
  const [warehouseCode, setWarehouseCode] = useState('');
  // Fournisseur inline — utilisé uniquement quand l'article n'a pas de Mainsupplier
  const [inlineSupplierCode, setInlineSupplierCode] = useState('');
  const [inlineSupplierName, setInlineSupplierName] = useState('');

  const assignedWarehouse = useAuthStore((s) => s.user?.warehouseCode ?? '');
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const { warehouses } = useWarehouses();

  // Liste complète des fournisseurs — pour le groupement du panier (cartSections)
  const { data: suppliers = [] } = useSuppliers();
  // Fournisseur de l'article sélectionné — requête directe GET /BusinessPartners('code')
  // enabled uniquement quand Mainsupplier est connu → 1 appel ciblé, résultat mis en cache 10 min
  const { data: articleSupplier } = useSupplierByCode(selectedArticle?.Mainsupplier);

  // ── Store Zustand ──
  const cart = useCommandeStore((s) => s.cart);
  const addToCart = useCommandeStore((s) => s.addToCart);
  const removeFromCart = useCommandeStore((s) => s.removeFromCart);

  // ── Panier groupé par fournisseur (nom résolu en live depuis la liste SAP) ──
  const cartSections = useMemo(() => {
    const groups: Record<string, { supplierCode: string; supplierName: string; data: typeof cart }> = {};
    for (const item of cart) {
      const key = item.supplierCode || 'SANS_FOURNISSEUR';
      if (!groups[key]) {
        // Résoudre le nom en live — même si l'item a été ajouté avant le chargement des fournisseurs
        const resolvedName =
          suppliers.find((s) => s.CardCode === item.supplierCode)?.CardName
          ?? item.supplierName
          ?? item.supplierCode;
        groups[key] = { supplierCode: key, supplierName: resolvedName, data: [] };
      }
      groups[key].data.push(item);
    }
    return Object.values(groups);
  }, [cart, suppliers]);

  const supplierCount = cartSections.length;

  // ── Résolution du fournisseur de l'article sélectionné ──
  const articleHasSupplier = Boolean(selectedArticle?.Mainsupplier);
  const articleNeedsInlineSupplier = selectedArticle !== null && !articleHasSupplier;

  const resolvedSupplierCode = useMemo(() => {
    if (!selectedArticle) return '';
    if (selectedArticle.Mainsupplier) return selectedArticle.Mainsupplier;
    return inlineSupplierCode;
  }, [selectedArticle, inlineSupplierCode]);

  const resolvedSupplierName = useMemo(() => {
    if (!selectedArticle) return '';
    if (selectedArticle.Mainsupplier) {
      return (
        // 1. Résultat de la requête directe GET /BusinessPartners('code') — le plus fiable
        articleSupplier?.CardName
        // 2. Fallback : liste complète si déjà en cache
        ?? suppliers.find((s) => s.CardCode === selectedArticle.Mainsupplier)?.CardName
        // 3. Dernier recours : afficher le code brut
        ?? selectedArticle.Mainsupplier
      );
    }
    return inlineSupplierName;
  }, [selectedArticle, articleSupplier, inlineSupplierName, suppliers]);

  // ── Entrepôts autorisés pour l'article sélectionné ──
  const allowedWarehouseCodes = useMemo(() => {
    if (!selectedArticle?.ItemWarehouseInfoCollection) return undefined;
    return selectedArticle.ItemWarehouseInfoCollection.map((w) => w.WarehouseCode);
  }, [selectedArticle]);

  const warehouseNotConfigured = useMemo(() => {
    if (!allowedWarehouseCodes || !warehouseCode) return false;
    return !allowedWarehouseCodes.includes(warehouseCode);
  }, [allowedWarehouseCodes, warehouseCode]);

  // Gestionnaire → uniquement son entrepôt ; Admin → tous les entrepôts de l'article
  const selectorAllowedCodes = useMemo(() => {
    if (!isAdmin) {
      return assignedWarehouse ? [assignedWarehouse] : undefined;
    }
    return allowedWarehouseCodes;
  }, [isAdmin, assignedWarehouse, allowedWarehouseCodes]);

  const visibleStocks = useMemo(() => {
    const articleStocks = selectedArticle?.ItemWarehouseInfoCollection ?? [];
    const stockByWarehouse = new Map(articleStocks.map((s) => [s.WarehouseCode, s]));

    if (assignedWarehouse) {
      const ownStock = stockByWarehouse.get(assignedWarehouse);
      return [ownStock ?? { WarehouseCode: assignedWarehouse, InStock: 0, Committed: 0, Ordered: 0 }];
    }
    if (warehouses.length === 0) return articleStocks;

    const byMaster = warehouses.map((wh) => {
      const stock = stockByWarehouse.get(wh.WarehouseCode);
      return stock ?? { WarehouseCode: wh.WarehouseCode, InStock: 0, Committed: 0, Ordered: 0 };
    });
    const masterCodes = new Set(warehouses.map((wh) => wh.WarehouseCode));
    const extras = articleStocks.filter((s) => !masterCodes.has(s.WarehouseCode));
    return [...byMaster, ...extras];
  }, [selectedArticle, assignedWarehouse, warehouses]);

  // PCB de l'article sélectionné — 1 si non configuré (= commande à l'unité)
  const pcbValue = useMemo(() => {
    const raw = selectedArticle?.U_PCB;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
  }, [selectedArticle?.U_PCB]);

  const kpiStock = useMemo(() => {
    if (!selectedArticle) return 0;
    if (!warehouseCode) return selectedArticle.QuantityOnStock ?? 0;
    const byWarehouse = selectedArticle.ItemWarehouseInfoCollection?.find(
      (w) => w.WarehouseCode === warehouseCode
    )?.InStock;
    return byWarehouse ?? selectedArticle.QuantityOnStock ?? 0;
  }, [selectedArticle, warehouseCode]);

  // Pré-sélectionner l'entrepôt du gestionnaire au démarrage
  useEffect(() => {
    if (assignedWarehouse && warehouseCode !== assignedWarehouse) {
      setWarehouseCode(assignedWarehouse);
    }
  }, [assignedWarehouse, warehouseCode]);

  // Reset fournisseur inline quand on change d'article
  useEffect(() => {
    setInlineSupplierCode('');
    setInlineSupplierName('');
  }, [selectedArticle?.ItemCode]);

  // ── Handlers ──
  const handleArticleSelect = useCallback((article: IArticle) => {
    setSelectedArticle(article);
    setQuantity(1);
    // Enrichissement pour ItemWarehouseInfoCollection + ItemPrices
    itemService.getByCode(article.ItemCode).then(setSelectedArticle).catch(() => {});
  }, []);

  const handleSuggestion = useCallback((qteSuggeree: number) => {
    if (qteSuggeree > 0) {
      // Convertir la suggestion (unités) en nombre de cartons, arrondi au supérieur
      setQuantity(Math.max(1, Math.ceil(qteSuggeree / pcbValue)));
    }
  }, [pcbValue]);

  const handleAddToCart = useCallback(() => {
    if (!selectedArticle || !warehouseCode || !resolvedSupplierCode) return;

    addToCart({
      itemCode: selectedArticle.ItemCode,
      itemName: selectedArticle.ItemName,
      quantity: quantity * pcbValue,   // unités SAP = cartons × taille PCB
      pcb: pcbValue,
      warehouseCode,
      supplierCode: resolvedSupplierCode,
      supplierName: resolvedSupplierName,
    });

    setSelectedArticle(null);
    setQuantity(1);
  }, [selectedArticle, warehouseCode, resolvedSupplierCode, resolvedSupplierName, quantity, addToCart]);

  const isArticleFrozen = selectedArticle?.Frozen === 'tYES';

  const canAddToCart =
    selectedArticle !== null &&
    !isArticleFrozen &&
    warehouseCode.length > 0 &&
    quantity > 0 &&
    !warehouseNotConfigured &&
    resolvedSupplierCode.length > 0; // Fournisseur obligatoire (auto ou inline)

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
          <View style={[styles.headerBrand, { backgroundColor: COLORS.primary }]} />
          <View style={styles.headerContent}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.primary}18` }]}>
              <MaterialCommunityIcons name="cart-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.headerTitle}>Commande Fournisseur</Text>
          </View>
        </View>

        <SectionList
          sections={cartSections}
          keyExtractor={(item) => `${item.itemCode}-${item.warehouseCode}`}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="truck-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sectionHeaderText} numberOfLines={1}>
                {section.supplierName || section.supplierCode}
              </Text>
              <Text style={styles.sectionItemCount}>
                {section.data.length} art.
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.cartRow}>
              <View style={styles.cartRowInfo}>
                <Text style={styles.cartRowCode}>{item.itemCode}</Text>
                <Text style={styles.cartRowName} numberOfLines={1}>{item.itemName}</Text>
                <Text style={styles.cartRowWhs}>{item.warehouseCode}</Text>
              </View>
              <View style={styles.cartRowQtyBadge}>
                {item.pcb > 1 ? (
                  <>
                    <Text style={styles.cartRowQtyText}>
                      {Math.round(item.quantity / item.pcb)} PCB
                    </Text>
                    <Text style={styles.cartRowQtySubText}>{item.quantity} u.</Text>
                  </>
                ) : (
                  <Text style={styles.cartRowQtyText}>× {item.quantity}</Text>
                )}
              </View>
              <Pressable
                onPress={() => removeFromCart(item.itemCode, item.warehouseCode)}
                style={styles.cartRowDelete}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} />
              </Pressable>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.formSection}>
              {/* Carte de progression */}
              <View style={styles.flowCard}>
                <View style={styles.flowTopRow}>
                  <View style={styles.flowTitleRow}>
                    <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.flowTitle}>Suivi de commande</Text>
                  </View>
                </View>
                <View style={styles.flowGrid}>
                  <View style={styles.flowStatBox}>
                    <Text style={styles.flowStatLabel}>Fournisseurs</Text>
                    <Text style={[styles.flowStatValue, supplierCount > 0 ? styles.flowOk : styles.flowMuted]}>
                      {supplierCount > 0 ? `${supplierCount}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.flowStatBox}>
                    <Text style={styles.flowStatLabel}>Panier</Text>
                    <Text style={[styles.flowStatValue, cart.length > 0 ? styles.flowOk : styles.flowWarn]}>
                      {`${cart.length} article${cart.length > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <View style={styles.flowStatBox}>
                    <Text style={styles.flowStatLabel}>Commandes</Text>
                    <Text style={[styles.flowStatValue, supplierCount > 0 ? styles.flowOk : styles.flowMuted]}>
                      {supplierCount > 0 ? `${supplierCount} BC` : 'En attente'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recherche article */}
              <View style={styles.searchSection}>
                <ArticleSearchBar
                  onArticleSelect={handleArticleSelect}
                  placeholder="Rechercher ou scanner un article..."
                />
              </View>

              {/* Article sélectionné + KPIs */}
              {selectedArticle && (
                <View style={styles.selectedSection}>
                  {/* Info article */}
                  <View style={styles.articleInfo}>
                    <View style={styles.articleCodeRow}>
                      <Text style={styles.articleCode}>{selectedArticle.ItemCode}</Text>
                      {isArticleFrozen && (
                        <View style={styles.frozenBadge}>
                          <MaterialCommunityIcons name="cancel" size={12} color={COLORS.danger} />
                          <Text style={styles.frozenBadgeText}>INACTIF</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.articleName} numberOfLines={2}>
                      {selectedArticle.ItemName}
                    </Text>
                    {selectedArticle.BarCode && (
                      <Text style={styles.articleBarcode}>{selectedArticle.BarCode}</Text>
                    )}
                  </View>

                  {/* Avertissement article inactif */}
                  {isArticleFrozen && (
                    <View style={styles.frozenWarning}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.danger} />
                      <Text style={styles.frozenWarningText}>
                        Cet article est inactif dans SAP — impossible de le commander
                      </Text>
                    </View>
                  )}

                  {/* Fournisseur auto ou avertissement inline */}
                  {articleHasSupplier ? (
                    <View style={styles.supplierAutoBox}>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.supplierAutoText}>
                        Fournisseur : <Text style={styles.supplierAutoCode}>{resolvedSupplierName}</Text>
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.supplierMissingBox}>
                      <View style={styles.supplierMissingHeader}>
                        <MaterialCommunityIcons name="alert-outline" size={16} color={COLORS.orange} />
                        <Text style={styles.supplierMissingText}>
                          Aucun fournisseur principal configuré pour cet article dans SAP.
                          Sélectionnez-en un pour cette commande :
                        </Text>
                      </View>
                      <SupplierSelector
                        value={inlineSupplierCode}
                        onChange={(code, name) => {
                          setInlineSupplierCode(code);
                          setInlineSupplierName(name);
                        }}
                      />
                    </View>
                  )}

                  {/* Caractéristiques article */}
                  <ArticleMetaTags article={selectedArticle} />

                  {/* KPIs */}
                  <ArticleKPIs
                    itemCode={selectedArticle.ItemCode}
                    quantityOnStock={kpiStock}
                    warehouseCode={warehouseCode || undefined}
                    quantityOrderedFromVendors={selectedArticle.QuantityOrderedFromVendors ?? 0}
                    onSuggestion={handleSuggestion}
                  />

                  {/* Stock par entrepôt */}
                  {selectedArticle.ItemWarehouseInfoCollection &&
                    selectedArticle.ItemWarehouseInfoCollection.length > 0 && (
                      <StockMultiWarehouse
                        stocks={visibleStocks}
                        highlightWarehouse={warehouseCode}
                      />
                    )}

                  {/* Entrepôt + Quantité */}
                  <View style={styles.orderFields}>
                    <WarehouseSelector
                      value={warehouseCode}
                      onChange={setWarehouseCode}
                      label="Entrepôt destination"
                      allowedCodes={selectorAllowedCodes}
                    />

                    {warehouseNotConfigured && (
                      <View style={styles.warehouseWarning}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.orange} />
                        <Text style={styles.warehouseWarningText}>
                          Cet article n'est pas configuré pour cet entrepôt. Activez-le dans SAP
                          (Fiche article → onglet Stocks).
                        </Text>
                      </View>
                    )}

                    <QuantityStepper
                      value={quantity}
                      onChange={setQuantity}
                      min={1}
                      label={pcbValue > 1 ? `Cartons à commander (PCB : ${pcbValue})` : 'Quantité à commander'}
                    />
                    {pcbValue > 1 && (
                      <Text style={styles.pcbHint}>
                        = {quantity * pcbValue} unité{quantity * pcbValue > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>

                  {/* Bouton Ajouter */}
                  <View style={styles.addButtonContainer}>
                    <AppButton
                      label="AJOUTER AU PANIER"
                      onPress={handleAddToCart}
                      variant="primary"
                      icon="cart-plus"
                      fullWidth
                      disabled={!canAddToCart}
                    />
                  </View>
                </View>
              )}

              {/* Titre du panier */}
              {cart.length > 0 && (
                <View style={styles.cartHeader}>
                  <MaterialCommunityIcons name="cart" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.cartTitle}>
                    Mon panier — {supplierCount} fournisseur{supplierCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !selectedArticle ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="package-variant" size={48} color={COLORS.textDisabled} />
                <Text style={styles.emptyTitle}>Aucun article</Text>
                <Text style={styles.emptySubtitle}>
                  Scannez ou recherchez un article pour commencer
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />

        {/* Barre du bas — vers l'écran récap */}
        <CartSummary
          itemCount={cart.length}
          supplierCount={supplierCount}
          onSendPress={() => router.push('/(main)/commande/recap')}
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
  listContent: {
    flexGrow: 1,
  },
  formSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  flowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  flowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  flowGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  flowStatBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  flowStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  flowStatValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
  },
  flowOk: { color: COLORS.primary },
  flowWarn: { color: COLORS.orange },
  flowMuted: { color: COLORS.textSecondary },
  searchSection: {
    marginBottom: 12,
  },
  selectedSection: {
    marginBottom: 16,
    gap: 10,
  },
  articleInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  articleCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  articleCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  articleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  articleBarcode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  frozenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
  },
  frozenBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
  frozenWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  frozenWarningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
    lineHeight: 18,
  },
  supplierAutoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FBF4',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  supplierAutoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  supplierAutoCode: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  supplierMissingBox: {
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
    gap: 10,
  },
  supplierMissingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  supplierMissingText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.orange,
    lineHeight: 18,
    fontWeight: '500',
  },
  orderFields: {
    gap: 6,
  },
  warehouseWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  warehouseWarningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.orange,
    lineHeight: 18,
  },
  addButtonContainer: {
    marginTop: 4,
  },
  // ── Panier ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionItemCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56,
  },
  cartRowInfo: {
    flex: 1,
    marginRight: 8,
  },
  cartRowCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cartRowName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  cartRowWhs: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cartRowQtyBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
    alignItems: 'center',
  },
  cartRowQtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cartRowQtySubText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  pcbHint: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: -2,
  },
  cartRowDelete: {
    padding: 6,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
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
});

export default CommandeScreen;
