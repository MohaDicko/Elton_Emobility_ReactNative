// ─── Écran Mise à Jour des Listes de Prix — Module 8 ELTON OIL COMPANY ───────
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Portal, Modal, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';
import { ArticleSearchBar, ArticleMetaTags } from '@shared/components';
import { itemService } from '@shared/services';
import type { IArticle } from '@shared/types';
import { usePriceLists, useItemPrices, useUpdatePrice } from '@features/prix';

const PrixScreen = () => {
  const user = useAuthStore((s) => s.user);
  const userWarehouse = user?.warehouseCode ?? '01';

  // ── State local ──
  const [selectedArticle, setSelectedArticle] = useState<IArticle | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<number>(2); // Par défaut 2 (prix vente boutique)
  const [newPriceStr, setNewPriceStr] = useState<string>('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // ── Données distantes ──
  const { data: priceLists = [], isLoading: isLoadingLists } = usePriceLists();
  const { data: itemPrices = [], isLoading: isLoadingPrices } = useItemPrices(
    selectedArticle?.ItemCode
  );
  const updatePriceMutation = useUpdatePrice();

  // ── Prix actuel pour la liste sélectionnée ──
  const currentPriceEntry = useMemo(() => {
    return itemPrices.find((p) => p.PriceList === selectedPriceList);
  }, [itemPrices, selectedPriceList]);

  const currentPrice = currentPriceEntry?.Price ?? selectedArticle?.price ?? 0;
  const newPriceNum = Number(newPriceStr.replace(/\s/g, '')) || 0;
  const priceDiff = newPriceNum - currentPrice;
  const diffPercent = currentPrice > 0 ? ((priceDiff / currentPrice) * 100).toFixed(1) : '0';

  // ── Sélection d'article ──
  const handleArticleSelect = useCallback(async (article: IArticle) => {
    setLoadingArticle(true);
    try {
      const full = await itemService.getByCode(article.ItemCode);
      setSelectedArticle(full);
      const basePrice = full.price ?? 0;
      setNewPriceStr(basePrice > 0 ? String(basePrice) : '');
    } catch {
      setSelectedArticle(article);
      const basePrice = article.price ?? 0;
      setNewPriceStr(basePrice > 0 ? String(basePrice) : '');
    } finally {
      setLoadingArticle(false);
    }
  }, []);

  const handleAdjustPrice = (delta: number) => {
    const current = Number(newPriceStr.replace(/\s/g, '')) || currentPrice || 0;
    const updated = Math.max(0, current + delta);
    setNewPriceStr(String(updated));
  };

  const handleConfirmUpdate = () => {
    if (!selectedArticle || newPriceNum <= 0) return;

    updatePriceMutation.mutate(
      {
        itemCode: selectedArticle.ItemCode,
        priceList: selectedPriceList,
        newPrice: newPriceNum,
        oldPrice: currentPrice,
      },
      {
        onSuccess: () => {
          setConfirmModalVisible(false);
          // Rafraîchir l'article localement
          setSelectedArticle((prev) => (prev ? { ...prev, price: newPriceNum } : null));
        },
      }
    );
  };

  const isFormValid = Boolean(selectedArticle && newPriceNum > 0 && newPriceNum !== currentPrice);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerBrand} />
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Mise à Jour des Prix</Text>
            <Text style={styles.headerSub}>
              Boutique {userWarehouse} · Synchronisation SAP en direct
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Recherche / Scan Article ── */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionLabel}>Rechercher ou scanner l'article</Text>
            <ArticleSearchBar
              onArticleSelect={handleArticleSelect}
              placeholder="Code SAP, code-barres ou libellé..."
            />
          </View>

          {loadingArticle ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.loadingText}>Chargement des tarifs SAP...</Text>
            </View>
          ) : selectedArticle ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.cardContainer}>
              {/* ── Fiche Article ── */}
              <View style={styles.articleCard}>
                <View style={styles.articleHeader}>
                  <View style={styles.articleIconBox}>
                    <MaterialCommunityIcons name="tag-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.articleDetails}>
                    <Text style={styles.articleName} numberOfLines={2}>
                      {selectedArticle.ItemName}
                    </Text>
                    <Text style={styles.articleCode}>{selectedArticle.ItemCode}</Text>
                  </View>
                </View>

                <ArticleMetaTags article={selectedArticle} />
              </View>

              {/* ── Sélection de la Liste de Prix (Boutique / Général) ── */}
              <View style={styles.priceListSection}>
                <Text style={styles.sectionLabel}>Grille Tarifaire Cible</Text>
                <View style={styles.chipsRow}>
                  {priceLists.map((pl) => {
                    const isSelected = pl.PriceListNo === selectedPriceList;
                    return (
                      <Pressable
                        key={pl.PriceListNo}
                        onPress={() => setSelectedPriceList(pl.PriceListNo)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? 'check-circle' : 'circle-outline'}
                          size={16}
                          color={isSelected ? '#fff' : COLORS.textSecondary}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {pl.PriceListName || `Liste ${pl.PriceListNo}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Comparatif Tarif Actuel / Nouveau ── */}
              <View style={styles.pricingBox}>
                <View style={styles.priceColumn}>
                  <Text style={styles.priceColTitle}>Prix actuel SAP</Text>
                  <Text style={styles.priceColVal}>
                    {isLoadingPrices ? '...' : `${currentPrice.toLocaleString('fr-FR')} F`}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="arrow-right-bold"
                  size={24}
                  color={COLORS.textDisabled}
                  style={{ alignSelf: 'center' }}
                />

                <View style={styles.priceColumn}>
                  <Text style={styles.priceColTitle}>Nouveau Tarif</Text>
                  <Text
                    style={[
                      styles.priceColVal,
                      { color: priceDiff !== 0 ? COLORS.primary : COLORS.textPrimary },
                    ]}
                  >
                    {newPriceNum > 0 ? `${newPriceNum.toLocaleString('fr-FR')} F` : '—'}
                  </Text>
                </View>
              </View>

              {/* Écart si modification */}
              {newPriceNum > 0 && priceDiff !== 0 ? (
                <View
                  style={[
                    styles.diffBadge,
                    { backgroundColor: priceDiff > 0 ? '#E8F5E9' : '#FFF3E0' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={priceDiff > 0 ? 'trending-up' : 'trending-down'}
                    size={18}
                    color={priceDiff > 0 ? COLORS.success : COLORS.warning}
                  />
                  <Text
                    style={[
                      styles.diffText,
                      { color: priceDiff > 0 ? COLORS.success : COLORS.warning },
                    ]}
                  >
                    {priceDiff > 0 ? `+${priceDiff.toLocaleString('fr-FR')}` : priceDiff.toLocaleString('fr-FR')} F CFA ({priceDiff > 0 ? `+${diffPercent}` : diffPercent}%)
                  </Text>
                </View>
              ) : null}

              {/* ── Saisie du Nouveau Prix ── */}
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>Saisir le nouveau prix de vente</Text>
                <TextInput
                  mode="outlined"
                  value={newPriceStr}
                  onChangeText={(val) => setNewPriceStr(val.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="Ex: 1500"
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primary}
                  right={<TextInput.Affix text="F CFA" />}
                  style={styles.priceInput}
                />

                {/* Boutons d'ajustement rapide */}
                <View style={styles.quickAdjustRow}>
                  <Button mode="outlined" compact onPress={() => handleAdjustPrice(-100)}>
                    -100
                  </Button>
                  <Button mode="outlined" compact onPress={() => handleAdjustPrice(+100)}>
                    +100
                  </Button>
                  <Button mode="outlined" compact onPress={() => handleAdjustPrice(+500)}>
                    +500
                  </Button>
                  <Button mode="outlined" compact onPress={() => handleAdjustPrice(+1000)}>
                    +1 000
                  </Button>
                </View>
              </View>

              {/* ── Bouton Validation ── */}
              <Button
                mode="contained"
                onPress={() => setConfirmModalVisible(true)}
                disabled={!isFormValid || updatePriceMutation.isPending}
                loading={updatePriceMutation.isPending}
                buttonColor={COLORS.primary}
                style={styles.submitBtn}
                contentStyle={styles.submitBtnContent}
                labelStyle={styles.submitBtnLabel}
                icon="cloud-upload"
              >
                SYNCHRONISER DANS SAP
              </Button>
            </Animated.View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="barcode-scan" size={54} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>Aucun article sélectionné</Text>
              <Text style={styles.emptySub}>
                Recherchez par nom ou scannez le code-barres de l'article pour mettre à jour son prix.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal de Confirmation ── */}
      <Portal>
        <Modal
          visible={confirmModalVisible}
          onDismiss={() => setConfirmModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color={COLORS.primary} />
            <Text style={styles.modalTitle}>Confirmer le changement de prix</Text>
          </View>
          <Divider style={{ marginVertical: 12 }} />

          <Text style={styles.modalDesc}>
            Vous allez modifier le tarif de vente pour l'article :
          </Text>
          <Text style={styles.modalItemName} numberOfLines={2}>
            {selectedArticle?.ItemName}
          </Text>
          <Text style={styles.modalItemCode}>{selectedArticle?.ItemCode}</Text>

          <View style={styles.modalPriceSummary}>
            <Text style={styles.modalPriceOld}>
              Ancien prix : {currentPrice.toLocaleString('fr-FR')} F CFA
            </Text>
            <Text style={styles.modalPriceNew}>
              Nouveau prix : {newPriceNum.toLocaleString('fr-FR')} F CFA
            </Text>
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setConfirmModalVisible(false)}
              style={{ flex: 1, marginRight: 8 }}
            >
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmUpdate}
              loading={updatePriceMutation.isPending}
              buttonColor={COLORS.primary}
              style={{ flex: 1 }}
            >
              Valider
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBrand: {
    height: 4,
    backgroundColor: COLORS.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  searchSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardContainer: {
    gap: 16,
  },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  articleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  articleDetails: {
    flex: 1,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  articleCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  priceListSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f8f9fa',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  pricingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceColumn: {
    alignItems: 'center',
    flex: 1,
  },
  priceColTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceColVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  diffText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceInput: {
    backgroundColor: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  quickAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
  },
  submitBtn: {
    borderRadius: 10,
    marginTop: 8,
  },
  submitBtnContent: {
    paddingVertical: 6,
  },
  submitBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  modalItemCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  modalPriceSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  modalPriceOld: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  modalPriceNew: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
});

export default PrixScreen;
