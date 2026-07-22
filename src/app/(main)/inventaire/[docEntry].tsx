// â”€â”€â”€ Ã‰cran Comptage Inventaire â€” flux "terrain" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Le document est crÃ©Ã© depuis SAP Desktop (avec un placeholder). L'opÃ©rateur
// scanne ou recherche un article, saisit la quantitÃ© et l'emplacement, puis
// l'ajoute au document. La liste du bas montre ce qui a dÃ©jÃ  Ã©tÃ© comptÃ©.
import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Portal, Modal, Button } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { AppButton, QuantityStepper } from '@shared/components/ui';
import { ArticleSearchBar } from '@shared/components';
import {
  useCountingDetail,
  useBinLocations,
  useWarehouseBins,
  useAddCountedItem,
  useUpdateCountedLine,
} from '@features/inventaire/hooks/useInventaire';
import { useAuthStore } from '@core/auth/authStore';
import type { IArticle, IInventoryCountingLine } from '@shared/types';

// â”€â”€â”€ Composant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CountingDetailScreen = () => {
  const { docEntry: docEntryParam } = useLocalSearchParams<{ docEntry: string }>();
  const docEntry = docEntryParam ? parseInt(docEntryParam, 10) : null;

  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const userWarehouse = useAuthStore((s) => s.user?.warehouseCode ?? '');

  // â”€â”€ Ã‰tat du formulaire de saisie (local â€” pas dans Zustand) â”€â”€
  const listRef = useRef<FlatList<IInventoryCountingLine>>(null);
  const [selectedArticle, setSelectedArticle] = useState<IArticle | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedBinEntry, setSelectedBinEntry] = useState<number | undefined>(undefined);
  const [selectedLineNumber, setSelectedLineNumber] = useState<number | null>(null);
  // Article déjà compté au mÃªme emplacement â†’ l'opÃ©rateur choisit : additionner ou remplacer
  const [duplicate, setDuplicate] = useState<{
    line: IInventoryCountingLine;
    newQty: number;
  } | null>(null);

  // â”€â”€ DonnÃ©es SAP â”€â”€
  const { data: doc, isLoading, refetch, isRefetching } = useCountingDetail(docEntry);

  // Le magasin de l'inventaire est portÃ© par la premiÃ¨re ligne du document
  // (le placeholder crÃ©Ã© depuis SAP Desktop, puis les lignes comptÃ©es)
  const warehouseCode = doc?.InventoryCountingLines[0]?.WarehouseCode ?? '';

  // Un non-admin ne compte que dans son propre magasin
  const wrongWarehouse =
    !isAdmin && warehouseCode.length > 0 && userWarehouse !== warehouseCode;
  const { data: warehouseBins = [] } = useWarehouseBins(warehouseCode);
  const { mutate: addItem, isPending: isAdding } = useAddCountedItem();
  const { mutate: updateLine, isPending: isUpdatingLine } = useUpdateCountedLine();

  const documentLines = useMemo(() => {
    const lines = doc?.InventoryCountingLines ?? [];
    const isPlaceholderOnly = lines.length === 1 && lines[0].Counted === 'tNO';
    return isPlaceholderOnly ? [] : lines;
  }, [doc]);

  const countedLines = useMemo(
    () => documentLines.filter((l) => l.Counted === 'tYES'),
    [documentLines]
  );

  // RÃ©solution BinEntry â†’ BinCode pour l'affichage des lignes comptÃ©es
  const lineBinEntries = useMemo(
    () => [
      ...new Set(
        documentLines
          .map((l) => l.BinEntry)
          .filter((b): b is number => b !== null)
      ),
    ],
    [documentLines]
  );
  const { data: binMap = new Map() } = useBinLocations(lineBinEntries);

  const hasBins = warehouseBins.length > 0;

  // Format SAP : "MAGASIN-NOM" â†’ n'afficher que "NOM"
  const shortBinLabel = useCallback((fullCode: string) => {
    const dashIdx = fullCode.indexOf('-');
    return dashIdx >= 0 ? fullCode.slice(dashIdx + 1) : fullCode;
  }, []);

  const getLineBinLabel = (line: IInventoryCountingLine) => {
    if (line.BinEntry === null) return null;
    const code = binMap.get(line.BinEntry);
    return code ? shortBinLabel(code) : `#${line.BinEntry}`;
  };

  // â”€â”€ Handlers â”€â”€
  const handleArticleSelect = useCallback((article: IArticle) => {
    setSelectedLineNumber(null);
    setSelectedArticle(article);
    setQuantity(1);
  }, []);

  const handleLinePress = useCallback((line: IInventoryCountingLine) => {
    setSelectedLineNumber(line.LineNumber);
    setSelectedBinEntry(line.BinEntry ?? undefined);
    setQuantity(line.Counted === 'tYES' ? line.CountedQuantity : 1);
    setSelectedArticle({
      ItemCode: line.ItemCode,
      ItemName: line.ItemDescription,
      BarCode: line.BarCode,
      ItemsGroupCode: 0,
      QuantityOnStock: 0,
      QuantityOrderedFromVendors: 0,
      QuantityOrderedByCustomers: 0,
      InventoryUOM: line.UoMCode ?? '',
      U_rayon: null,
      U_sous_fam: null,
      U_PCB: null,
    });
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  const handleAdd = () => {
    if (!docEntry || !selectedArticle || !warehouseCode) return;

    // MÃªme article dÃ©jÃ  comptÃ© au mÃªme emplacement â†’ choix de l'opÃ©rateur
    const existing = documentLines.find(
      (l) =>
        l.ItemCode === selectedArticle.ItemCode &&
        (l.BinEntry ?? undefined) === selectedBinEntry
    );
    if (existing?.Counted === 'tYES' && existing.LineNumber !== selectedLineNumber) {
      setDuplicate({ line: existing, newQty: quantity });
      return;
    }

    if (existing) {
      updateLine(
        { docEntry, lineNumber: existing.LineNumber, quantity },
        {
          onSuccess: () => {
            setSelectedArticle(null);
            setQuantity(1);
          },
        }
      );
      return;
    }

    addItem(
      {
        docEntry,
        itemCode: selectedArticle.ItemCode,
        quantity,
        binEntry: selectedBinEntry,
        warehouseCode,
      },
      {
        onSuccess: () => {
          // Conserver l'emplacement sÃ©lectionnÃ© â€” l'opÃ©rateur compte souvent
          // plusieurs articles au mÃªme endroit
          setSelectedArticle(null);
          setQuantity(1);
        },
      }
    );
  };

  /** RÃ©solution du doublon â€” cumul (10+5=15) ou remplacement (â†’5) */
  const handleDuplicateResolve = (mode: 'add' | 'replace') => {
    if (!docEntry || !duplicate) return;
    const newQuantity =
      mode === 'add'
        ? duplicate.line.CountedQuantity + duplicate.newQty
        : duplicate.newQty;
    updateLine(
      { docEntry, lineNumber: duplicate.line.LineNumber, quantity: newQuantity },
      {
        onSuccess: () => {
          setDuplicate(null);
          setSelectedArticle(null);
          setQuantity(1);
        },
        onError: () => setDuplicate(null),
      }
    );
  };

  // Magasin avec emplacements activÃ©s â†’ SAP exige un BinEntry sur chaque ligne (-5002)
  const binMissing = hasBins && selectedBinEntry === undefined;

  const canAdd =
    selectedArticle !== null &&
    quantity > 0 &&
    warehouseCode.length > 0 &&
    !wrongWarehouse &&
    !binMissing &&
    !isAdding &&
    !isUpdatingLine;

  // â”€â”€ Render loading / erreur â”€â”€
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.blue} />
        <Text style={styles.loadingText}>Chargement du document...</Text>
      </View>
    );
  }

  if (!doc) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Document introuvable</Text>
        <AppButton label="Retour" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  const countDate = new Date(doc.CountDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // â”€â”€ Render â”€â”€
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBrand, { backgroundColor: COLORS.blue }]} />
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
            </Pressable>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Inventaire N°{doc.DocumentNumber}</Text>
              <Text style={styles.headerSub}>
                {countDate}{warehouseCode ? ` · ${warehouseCode}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={documentLines}
          keyExtractor={(item) => String(item.LineNumber)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.blue}
              colors={[COLORS.blue]}
            />
          }
          ListHeaderComponent={
            <View style={styles.formSection}>
              {!warehouseCode || wrongWarehouse ? (
                <View style={styles.warnBox}>
                  <MaterialCommunityIcons name="alert-outline" size={16} color={COLORS.orange} />
                  <Text style={styles.warnText}>
                    {wrongWarehouse
                      ? `Cet inventaire concerne le magasin ${warehouseCode} - votre compte est rattaché à ${userWarehouse || 'aucun magasin'}.`
                      : 'Impossible de déterminer le magasin de cet inventaire (document sans ligne).'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Recherche / scan article */}
                  <ArticleSearchBar
                    onArticleSelect={handleArticleSelect}
                    placeholder="Scanner ou rechercher l'article compté..."
                    hideStock
                  />

                  {/* Article sÃ©lectionnÃ© â†’ quantitÃ© + emplacement + ajouter */}
                  {selectedArticle && (
                    <View style={styles.articleCard}>
                      <View style={styles.articleInfo}>
                        <Text style={styles.articleCode}>{selectedArticle.ItemCode}</Text>
                        <Text style={styles.articleName} numberOfLines={2}>
                          {selectedArticle.ItemName}
                        </Text>
                        {selectedArticle.BarCode ? (
                          <Text style={styles.articleBarcode}>{selectedArticle.BarCode}</Text>
                        ) : null}
                      </View>

                      <QuantityStepper
                        value={quantity}
                        onChange={setQuantity}
                        min={0}
                        label="Quantité comptée"
                      />

                      {/* Emplacement â€” uniquement si le magasin en a */}
                      {hasBins && (
                        <View style={styles.binSection}>
                          <Text style={styles.binLabel}>
                            Emplacement du comptage <Text style={styles.binRequired}>*</Text>
                          </Text>
                          {binMissing && (
                            <Text style={styles.binHint}>
                              Ce magasin gère les emplacements - sélectionnez celui où vous comptez
                            </Text>
                          )}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.binChips}
                          >
                            {warehouseBins.map((bin) => {
                              const active = selectedBinEntry === bin.AbsEntry;
                              return (
                                <Pressable
                                  key={bin.AbsEntry}
                                  style={[styles.binChip, active && styles.binChipActive]}
                                  onPress={() =>
                                    setSelectedBinEntry(active ? undefined : bin.AbsEntry)
                                  }
                                >
                                  <MaterialCommunityIcons
                                    name="map-marker-outline"
                                    size={14}
                                    color={active ? COLORS.white : COLORS.blue}
                                  />
                                  <Text style={[styles.binChipText, active && styles.binChipTextActive]}>
                                    {shortBinLabel(bin.BinCode)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}

                      <AppButton
                        label={(isAdding || isUpdatingLine) ? 'ENREGISTREMENT...' : selectedLineNumber !== null ? 'ENREGISTRER LE COMPTAGE' : 'AJOUTER AU COMPTAGE'}
                        onPress={handleAdd}
                        variant="primary"
                        icon="plus"
                        fullWidth
                        disabled={!canAdd}
                      />
                    </View>
                  )}
                </>
              )}

              {/* Titre liste */}
              {documentLines.length > 0 && (
                <View style={styles.listTitleRow}>
                  <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.listTitle}>
                    Articles du document - {countedLines.length}/{documentLines.length} comptés
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item: line }) => {
            const binLabel = getLineBinLabel(line);
            return (
              <Pressable
                onPress={() => handleLinePress(line)}
                style={({ pressed }) => [
                  styles.lineCard,
                  selectedLineNumber === line.LineNumber && styles.lineCardSelected,
                  pressed && styles.lineCardPressed,
                ]}
              >
                <View style={styles.lineCheck}>
                  <MaterialCommunityIcons
                    name={line.Counted === 'tYES' ? 'check-circle' : 'clock-outline'}
                    size={20}
                    color={line.Counted === 'tYES' ? COLORS.primary : COLORS.orange}
                  />
                </View>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineCode}>{line.ItemCode}</Text>
                  <Text style={styles.lineName} numberOfLines={1}>{line.ItemDescription}</Text>
                  {binLabel ? (
                    <View style={styles.lineMetaRow}>
                      <Text style={styles.lineMeta}>{binLabel}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.lineQty, line.Counted !== 'tYES' && styles.lineQtyPending]}>
                  {line.Counted === 'tYES' ? line.CountedQuantity : 'A compter'}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            warehouseCode && !wrongWarehouse && documentLines.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="barcode-scan" size={44} color={COLORS.textDisabled} />
                <Text style={styles.emptyTitle}>Aucun article compté</Text>
                <Text style={styles.emptySubtitle}>
                  Scannez ou recherchez le premier article pour commencer le comptage
                </Text>
              </View>
            ) : null
          }
        />

        {/* Article déjà compté â€” additionner ou remplacer */}
        <Portal>
          <Modal
            visible={duplicate !== null}
            onDismiss={() => setDuplicate(null)}
            contentContainerStyle={styles.dupModal}
          >
            <Text style={styles.dupTitle}>Article déjà compté</Text>
            <Text style={styles.dupMessage}>
              <Text style={styles.dupCode}>{duplicate?.line.ItemCode}</Text>
              {duplicate?.line.BinEntry != null
                ? ` (${getLineBinLabel(duplicate.line) ?? ''})`
                : ''} a déjà été compté : {duplicate?.line.CountedQuantity ?? 0}.
              {'\n'}Que faire avec les {duplicate?.newQty ?? 0} saisis ?
            </Text>
            <View style={styles.dupActions}>
              <Button
                mode="outlined"
                onPress={() => setDuplicate(null)}
                disabled={isUpdatingLine}
                textColor={COLORS.textSecondary}
                style={styles.dupBtn}
              >
                Annuler
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleDuplicateResolve('replace')}
                disabled={isUpdatingLine}
                textColor={COLORS.orange}
                style={styles.dupBtn}
              >
                {`Remplacer (-> ${duplicate?.newQty ?? 0})`}
              </Button>
              <Button
                mode="contained"
                onPress={() => handleDuplicateResolve('add')}
                loading={isUpdatingLine}
                disabled={isUpdatingLine}
                buttonColor={COLORS.primary}
                textColor={COLORS.white}
                style={styles.dupBtn}
              >
                {`Additionner (-> ${(duplicate?.line.CountedQuantity ?? 0) + (duplicate?.newQty ?? 0)})`}
              </Button>
            </View>
          </Modal>
        </Portal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  // â”€â”€ Header â”€â”€
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
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerBadge: {
    backgroundColor: COLORS.blue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  // â”€â”€ Formulaire â”€â”€
  listContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  formSection: {
    padding: 16,
    gap: 12,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  warnText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.orange,
    lineHeight: 18,
  },
  articleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  articleInfo: { gap: 2 },
  articleCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.blue,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  articleBarcode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  // â”€â”€ Emplacements â”€â”€
  binSection: { gap: 6 },
  binLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  binRequired: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  binHint: {
    fontSize: 12,
    color: COLORS.orange,
    lineHeight: 16,
  },
  binChips: {
    gap: 8,
    paddingVertical: 2,
  },
  binChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${COLORS.blue}60`,
    backgroundColor: 'transparent',
  },
  binChipActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  binChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue,
  },
  binChipTextActive: {
    color: COLORS.white,
  },
  // â”€â”€ Liste comptÃ©e â”€â”€
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  lineCardSelected: {
    borderColor: COLORS.blue,
    backgroundColor: '#F3FAFF',
  },
  lineCardPressed: { opacity: 0.75 },
  lineCheck: { width: 24 },
  lineInfo: { flex: 1, gap: 1 },
  lineCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blue,
  },
  lineName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  lineMetaRow: { flexDirection: 'row', marginTop: 2 },
  lineMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  lineQty: {
    minWidth: 72,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  lineQtyPending: {
    fontSize: 12,
    color: COLORS.orange,
  },
  // â”€â”€ Ã‰tat vide â”€â”€
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textDisabled,
    textAlign: 'center',
    lineHeight: 18,
  },
  // â”€â”€ Footer validation â”€â”€
  footer: {
    padding: 16,
    paddingTop: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // â”€â”€ Modal doublon â”€â”€
  dupModal: {
    backgroundColor: COLORS.surface,
    margin: 24,
    borderRadius: 16,
    padding: 24,
  },
  dupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  dupMessage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  dupCode: {
    fontWeight: '700',
    color: COLORS.blue,
  },
  dupActions: {
    gap: 10,
  },
  dupBtn: {
    borderRadius: 10,
  },
});

export default CountingDetailScreen;









