// ─── Écran Impression Étiquettes ──────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { QuantityStepper, AppButton } from '@shared/components/ui';
import { ArticleSearchBar } from '@shared/components';
import type { IArticle } from '@shared/types';
import { itemService } from '@shared/services';
import { useEtiquetteStore } from '@features/etiquettes/store/etiquetteStore';
import { etiquetteService } from '@features/etiquettes/services/etiquetteService';
import { extractSapErrorMessage } from '@shared/utils';
import LabelItem from '@features/etiquettes/components/LabelItem';

// ─── Composant ───────────────────────────────────────────────────────────────

const EtiquettesScreen = () => {
  // ── State local ──
  const [selectedArticle, setSelectedArticle] = useState<IArticle | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [labelQty, setLabelQty] = useState(1);
  const [printing, setPrinting] = useState(false);

  // ── Store Zustand ──
  const labels = useEtiquetteStore((s) => s.labels);
  const addLabel = useEtiquetteStore((s) => s.addLabel);
  const removeLabel = useEtiquetteStore((s) => s.removeLabel);
  const clearLabels = useEtiquetteStore((s) => s.clearLabels);

  // ── Handlers ──
  // Récupère l'article complet (avec prix depuis ItemPrices) car la
  // recherche collection ne retourne pas ItemPrices
  const handleArticleSelect = useCallback(async (article: IArticle) => {
    setLoadingArticle(true);
    try {
      const full = await itemService.getByCode(article.ItemCode);
      setSelectedArticle(full);
    } catch {
      setSelectedArticle(article); // fallback si SAP inaccessible
    } finally {
      setLoadingArticle(false);
    }
    setLabelQty(1);
  }, []);

  const handleAddLabel = () => {
    if (!selectedArticle) return;

    addLabel({
      itemCode: selectedArticle.ItemCode,
      itemName: selectedArticle.ItemName,
      barcode: selectedArticle.BarCode,
      price: selectedArticle.price ?? 0,
      pcb: selectedArticle.U_PCB ?? null,
      quantity: labelQty,
    });

    setSelectedArticle(null);
    setLabelQty(1);
  };

  const handlePrint = async () => {
    if (labels.length === 0) return;
    setPrinting(true);
    try {
      await etiquetteService.printLabels(labels);
      clearLabels();
      Toast.show({
        type: 'success',
        text1: 'Impression lancée',
        text2: "Les étiquettes ont été envoyées",
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur impression',
        text2: extractSapErrorMessage(error),
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePDF = async () => {
    if (labels.length === 0) return;
    setPrinting(true);
    try {
      await etiquetteService.shareLabelsAsPDF(labels);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur PDF',
        text2: extractSapErrorMessage(error),
      });
    } finally {
      setPrinting(false);
    }
  };

  const totalLabels = labels.reduce((sum, l) => sum + l.quantity, 0);

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
          <View style={[styles.headerBrand, { backgroundColor: COLORS.pink }]} />
          <View style={styles.headerContent}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.pink}18` }]}>
              <MaterialCommunityIcons name="printer" size={22} color={COLORS.pink} />
            </View>
            <Text style={styles.headerTitle}>Impression Étiquettes</Text>
          </View>
        </View>

        <FlatList
          data={labels}
          keyExtractor={(item) => item.itemCode}
          renderItem={({ item }) => (
            <LabelItem label={item} onRemove={removeLabel} />
          )}
          ListHeaderComponent={
            <View style={styles.formSection}>

              {/* Recherche article */}
              <View style={styles.searchSection}>
                <ArticleSearchBar
                  onArticleSelect={handleArticleSelect}
                  placeholder="Scanner ou rechercher un article..."
                />
              </View>

              {/* Chargement prix article */}
              {loadingArticle && (
                <Text style={styles.loadingPrice}>Récupération du prix...</Text>
              )}

              {/* Article sélectionné */}
              {selectedArticle && !loadingArticle && (
                <View style={styles.selectedSection}>
                  <View style={styles.articleInfo}>
                    <Text style={styles.articleCode}>
                      {selectedArticle.ItemCode}
                    </Text>
                    <Text style={styles.articleName} numberOfLines={2}>
                      {selectedArticle.ItemName}
                    </Text>
                    {(selectedArticle.price ?? 0) > 0 && (
                      <Text style={styles.articlePrice}>
                        {Math.round(selectedArticle.price!).toLocaleString('fr-FR')} FCFA
                      </Text>
                    )}
                    {selectedArticle.BarCode ? (
                      <View style={styles.barcodeRow}>
                        <MaterialCommunityIcons
                          name="barcode"
                          size={18}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.barcodeText}>
                          {selectedArticle.BarCode}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.noBarcode}>
                        Pas de code-barres associé
                      </Text>
                    )}
                  </View>

                  <QuantityStepper
                    value={labelQty}
                    onChange={setLabelQty}
                    min={1}
                    max={100}
                    label="Nombre d'étiquettes"
                  />

                  <View style={styles.addButtonContainer}>
                    <AppButton
                      label="AJOUTER À L'IMPRESSION"
                      onPress={handleAddLabel}
                      variant="primary"
                      icon="plus-circle"
                      fullWidth
                    />
                  </View>
                </View>
              )}

              {/* Titre liste */}
              {labels.length > 0 && (
                <View style={styles.cartHeader}>
                  <MaterialCommunityIcons
                    name="tag-multiple"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.cartTitle}>
                    Étiquettes à imprimer ({totalLabels})
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !selectedArticle ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={48}
                  color={COLORS.textDisabled}
                />
                <Text style={styles.emptyTitle}>Aucune étiquette</Text>
                <Text style={styles.emptySubtitle}>
                  Scannez un article pour préparer ses étiquettes
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />

        {/* Barre du bas — impression */}
        {labels.length > 0 && (
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomLabel}>
                {labels.length} article{labels.length > 1 ? 's' : ''} — {totalLabels} étiquette{totalLabels > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <View style={styles.buttonFlex}>
                <AppButton
                  label="PARTAGER PDF"
                  onPress={handleSharePDF}
                  variant="outline"
                  loading={printing}
                  fullWidth
                  icon="file-pdf-box"
                />
              </View>
              <View style={styles.buttonFlex}>
                <AppButton
                  label="IMPRIMER"
                  onPress={handlePrint}
                  variant="primary"
                  loading={printing}
                  fullWidth
                  icon="printer"
                />
              </View>
            </View>
          </View>
        )}
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
  },
  searchSection: {
    marginBottom: 12,
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
    color: COLORS.primary,
  },
  articleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  loadingPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  articlePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  barcodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  noBarcode: {
    fontSize: 12,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
    marginTop: 4,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonFlex: {
    flex: 1,
  },
});

export default EtiquettesScreen;
