// ─── Écran Récapitulatif Commande — révision + validation finale ──────────────
import React, { useState, useMemo, useEffect } from 'react';
import { View, SectionList, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { AppButton, AppModal } from '@shared/components/ui';
import { useCommandeStore, type ICartItem } from '@features/commande/store/commandeStore';
import { useCreateOrders, useSuppliers, type ISupplierGroup } from '@features/commande/hooks/useCommande';

// ─── Composant ───────────────────────────────────────────────────────────────

const RecapScreen = () => {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ICartItem | null>(null);

  const cart = useCommandeStore((s) => s.cart);
  const updateQuantity = useCommandeStore((s) => s.updateQuantity);
  const removeFromCart = useCommandeStore((s) => s.removeFromCart);

  const { mutate: createOrders, isPending } = useCreateOrders();
  const { data: suppliers = [] } = useSuppliers();

  // Panier vide → retour automatique vers la saisie
  useEffect(() => {
    if (cart.length === 0) {
      router.replace('/(main)/commande');
    }
  }, [cart.length]);

  // ── Groupement par fournisseur (nom résolu en live) ──
  const cartSections = useMemo((): (ISupplierGroup & { data: ICartItem[] })[] => {
    const groups: Record<string, ISupplierGroup & { data: ICartItem[] }> = {};
    for (const item of cart) {
      const key = item.supplierCode || 'SANS_FOURNISSEUR';
      if (!groups[key]) {
        const resolvedName =
          suppliers.find((s) => s.CardCode === item.supplierCode)?.CardName
          ?? item.supplierName
          ?? item.supplierCode;
        groups[key] = {
          supplierCode: key,
          supplierName: resolvedName,
          items: [],
          data: [],
        };
      }
      groups[key].items.push(item);
      groups[key].data.push(item);
    }
    return Object.values(groups);
  }, [cart, suppliers]);

  const supplierCount = cartSections.length;
  const totalItems = cart.length;

  // ── Envoyer toutes les commandes ──
  const handleSend = () => {
    setConfirmVisible(false);
    createOrders(
      cartSections.map((s) => ({
        supplierCode: s.supplierCode,
        supplierName: s.supplierName,
        items: s.items,
      })),
      {
        onSuccess: () => {
          router.replace('/(main)/home');
        },
      }
    );
  };

  // ── Confirmation suppression article ──
  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      removeFromCart(deleteTarget.itemCode, deleteTarget.warehouseCode);
      setDeleteTarget(null);
    }
  };

  // ── Render ──
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header avec bouton fermer */}
      <View style={styles.header}>
        <View style={[styles.headerBrand, { backgroundColor: COLORS.primary }]} />
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Récapitulatif</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {supplierCount} BC
            </Text>
          </View>
        </View>
      </View>

      {/* Sous-titre */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>
          {supplierCount} bon{supplierCount > 1 ? 's' : ''} de commande ·{' '}
          {totalItems} article{totalItems > 1 ? 's' : ''}
        </Text>
        <Text style={styles.subHeaderHint}>
          Vérifiez et ajustez avant d'envoyer
        </Text>
      </View>

      {/* Liste groupée par fournisseur */}
      <SectionList
        sections={cartSections}
        keyExtractor={(item) => `${item.itemCode}-${item.warehouseCode}`}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="truck-outline" size={16} color={COLORS.white} />
            <Text style={styles.sectionHeaderText} numberOfLines={1}>
              {section.supplierName}
            </Text>
            <Text style={styles.sectionHeaderCount}>
              {section.data.length} art.
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            {/* Info article */}
            <View style={styles.itemInfo}>
              <Text style={styles.itemCode}>{item.itemCode}</Text>
              <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
              <Text style={styles.itemWhs}>{item.warehouseCode}</Text>
            </View>

            {/* Stepper quantité — incrémente par PCB */}
            <View style={styles.stepper}>
              <Pressable
                onPress={() => updateQuantity(item.itemCode, item.warehouseCode, item.quantity - item.pcb)}
                style={[styles.stepperBtn, styles.stepperMinus]}
                hitSlop={4}
                disabled={item.quantity <= item.pcb}
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={16}
                  color={item.quantity <= item.pcb ? COLORS.textDisabled : COLORS.danger}
                />
              </Pressable>

              <View style={styles.stepperQty}>
                {item.pcb > 1 ? (
                  <>
                    <Text style={styles.stepperQtyText}>
                      {Math.round(item.quantity / item.pcb)}
                    </Text>
                    <Text style={styles.stepperQtyLabel}>PCB</Text>
                  </>
                ) : (
                  <Text style={styles.stepperQtyText}>{item.quantity}</Text>
                )}
              </View>

              <Pressable
                onPress={() => updateQuantity(item.itemCode, item.warehouseCode, item.quantity + item.pcb)}
                style={[styles.stepperBtn, styles.stepperPlus]}
                hitSlop={4}
              >
                <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
              </Pressable>
            </View>

            {/* Supprimer */}
            <Pressable
              onPress={() => setDeleteTarget(item)}
              style={styles.deleteBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={COLORS.danger} />
            </Pressable>
          </View>
        )}
        renderSectionFooter={({ section }) => (
          <View style={styles.sectionFooter}>
            <Text style={styles.sectionFooterText}>
              {section.data.length} article{section.data.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Pied de page : boutons action */}
      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.footerSummaryText}>
            {supplierCount} bon{supplierCount > 1 ? 's' : ''} de commande ·{' '}
            {totalItems} article{totalItems > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.footerActions}>
          <View style={styles.modifyBtnWrapper}>
            <AppButton
              label="RETOUR"
              onPress={() => router.back()}
              variant="outline"
              icon="arrow-left"
              fullWidth
            />
          </View>
          <View style={styles.sendBtnWrapper}>
            <AppButton
              label={`ENVOYER ${supplierCount} BC`}
              onPress={() => setConfirmVisible(true)}
              variant="primary"
              icon="check-bold"
              loading={isPending}
              fullWidth
            />
          </View>
        </View>
      </View>

      {/* Modal confirmation envoi */}
      <AppModal
        visible={confirmVisible}
        title={`Envoyer ${supplierCount} commande${supplierCount > 1 ? 's' : ''} ?`}
        message={
          `Vous allez créer ${supplierCount} bon${supplierCount > 1 ? 's' : ''} de commande :\n\n` +
          cartSections
            .map((s) => `• ${s.supplierName} — ${s.data.length} article${s.data.length > 1 ? 's' : ''}`)
            .join('\n') +
          '\n\nCette action est irréversible.'
        }
        confirmLabel={`Envoyer ${supplierCount} commande${supplierCount > 1 ? 's' : ''}`}
        onConfirm={handleSend}
        onCancel={() => setConfirmVisible(false)}
        loading={isPending}
      />

      {/* Modal confirmation suppression article */}
      <AppModal
        visible={deleteTarget !== null}
        title="Retirer l'article ?"
        message={`Supprimer "${deleteTarget?.itemName}" du panier ?`}
        confirmLabel="Retirer"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        danger
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
  // ── Header ──
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  // ── Sous-titre ──
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subHeaderHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  // ── Section header fournisseur ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderCount: {
    fontSize: 12,
    color: COLORS.white + 'CC',
    fontWeight: '600',
  },
  // ── Ligne article ──
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 64,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 1,
    lineHeight: 18,
  },
  itemWhs: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // ── Stepper ──
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 8,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  stepperMinus: {
    borderColor: COLORS.danger + '60',
    backgroundColor: '#FEF2F2',
  },
  stepperPlus: {
    borderColor: COLORS.primary + '60',
    backgroundColor: '#F0FBF4',
  },
  stepperQty: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepperQtyLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  deleteBtn: {
    padding: 6,
  },
  // ── Footer section ──
  sectionFooter: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F0FBF4',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionFooterText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // ── Pied de page ──
  footer: {
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
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  footerSummaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modifyBtnWrapper: {
    flex: 1,
  },
  sendBtnWrapper: {
    flex: 2,
  },
});

export default RecapScreen;
