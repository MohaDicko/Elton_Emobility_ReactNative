import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Pressable, RefreshControl } from 'react-native';
import { Text, Portal, Modal, Searchbar, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@core/config/theme';
import { AppModal, AppButton, ModuleKpiStrip } from '@shared/components/ui';
import { useReceptionKpis } from '@features/reception/hooks/useReceptionKpis';
import { WarehouseSelector } from '@shared/components';
import type { IPurchaseOrder } from '@shared/types';
import { useReceptionStore } from '@features/reception/store/receptionStore';
import { useCreateDeliveryNote, useOpenOrdersForReception } from '@features/reception/hooks/useReception';
import { receptionService } from '@features/reception/services/receptionService';
import OrderSelector from '@features/reception/components/OrderSelector';
import ReceptionLineItem from '@features/reception/components/ReceptionLine';
import { useAuthStore } from '@core/auth/authStore';

const formatDate = (sapDate: string): string => {
  if (!sapDate) return '';
  return new Date(sapDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const ReceptionScreen = () => {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const assignedWarehouse = useAuthStore((s) => s.user?.warehouseCode ?? '');
  const [kpiWarehouse, setKpiWarehouse] = useState('');
  const orderWarehouse = isAdmin ? kpiWarehouse : assignedWarehouse;
  const { kpis: receptionKpis, refresh: refreshKpis, refreshing: refreshingKpis } = useReceptionKpis(kpiWarehouse);
  const {
    data: quickOrders = [],
    isLoading: quickOrdersLoading,
    refetch: refetchQuickOrders,
    isFetching: refreshingQuickOrders,
  } = useOpenOrdersForReception(orderWarehouse);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [quickPickerVisible, setQuickPickerVisible] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const selectedOrder = useReceptionStore((s) => s.selectedOrder);
  const lines = useReceptionStore((s) => s.lines);
  const setOrder = useReceptionStore((s) => s.setOrder);
  const updateReceivedQuantity = useReceptionStore((s) => s.updateReceivedQuantity);
  const receiveAll = useReceptionStore((s) => s.receiveAll);

  const { mutate: createDeliveryNote, isPending } = useCreateDeliveryNote();

  const handleOrderSelect = useCallback(async (order: IPurchaseOrder) => {
    setLoadingDetail(true);
    try {
      const detail = await receptionService.getOrderDetail(order.DocEntry);
      setOrder(detail, orderWarehouse || undefined);
    } catch {
      setOrder(order, orderWarehouse || undefined);
    } finally {
      setLoadingDetail(false);
    }
  }, [setOrder, orderWarehouse]);

  const closeQuickPicker = useCallback(() => {
    setQuickPickerVisible(false);
    setQuickSearch('');
  }, []);

  const handleQuickOrderSelect = useCallback(async (order: IPurchaseOrder) => {
    closeQuickPicker();
    await handleOrderSelect(order);
  }, [closeQuickPicker, handleOrderSelect]);

  const handleRefresh = useCallback(() => {
    refreshKpis();
    void refetchQuickOrders();
  }, [refreshKpis, refetchQuickOrders]);

  const handleSendReception = () => {
    if (!selectedOrder || lines.length === 0) return;
    const activeLines = lines.filter((l) => l.receivedQuantity > 0);
    if (activeLines.length === 0) return;

    createDeliveryNote({
      cardCode: selectedOrder.CardCode,
      lines: activeLines.map((l) => ({
        ItemCode: l.itemCode,
        Quantity: l.receivedQuantity,
        WarehouseCode: l.warehouseCode,
        BaseType: 22 as const,
        BaseEntry: selectedOrder.DocEntry,
        BaseLine: l.lineNum,
      })),
    });

    setConfirmVisible(false);
  };

  const quickFilteredOrders = useMemo(() => {
    const search = quickSearch.trim().toLowerCase();
    if (!search) return quickOrders;
    return quickOrders.filter((o) =>
      String(o.DocNum).includes(search) ||
      (o.CardName ?? '').toLowerCase().includes(search) ||
      (o.CardCode ?? '').toLowerCase().includes(search) ||
      (o.NumAtCard ?? '').toLowerCase().includes(search)
    );
  }, [quickOrders, quickSearch]);

  const activeLines = lines.filter((l) => l.receivedQuantity > 0);
  const totalReceived = activeLines.reduce((sum, l) => sum + l.receivedQuantity, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.headerBrand, { backgroundColor: COLORS.primary }]} />
          <View style={styles.headerContent}>
            <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.primary}18` }]}>
              <MaterialCommunityIcons name="truck-check" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.headerTitle}>Réception</Text>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.kpiFilterBlock}>
            <WarehouseSelector
              label="Filtrer les KPIs"
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

        <ModuleKpiStrip
          kpis={receptionKpis}
          title="Situation actuelle"
          pressableIndexes={[0]}
          onKpiPress={(_, index) => {
            if (index === 0) setQuickPickerVisible(true);
          }}
        />

        <FlatList
          data={lines}
          keyExtractor={(item) => `${item.lineNum}-${item.itemCode}`}
          renderItem={({ item }) => (
            <ReceptionLineItem
              line={item}
              onQuantityChange={updateReceivedQuantity}
            />
          )}
          ListHeaderComponent={(
            <View style={styles.formSection}>
              <OrderSelector
                selectedDocEntry={selectedOrder?.DocEntry ?? null}
                onSelect={handleOrderSelect}
                warehouseCode={orderWarehouse}
              />

              {selectedOrder && (
                <View style={styles.orderInfo}>
                  <View style={styles.orderInfoRow}>
                    <Text style={styles.orderLabel}>Fournisseur</Text>
                    <Text style={styles.orderValue}>
                      {selectedOrder.CardCode} - {selectedOrder.CardName}
                    </Text>
                  </View>
                  <View style={styles.orderInfoRow}>
                    <Text style={styles.orderLabel}>BC no</Text>
                    <Text style={styles.orderValue}>{selectedOrder.DocNum}</Text>
                  </View>
                  <View style={styles.orderInfoRow}>
                    <Text style={styles.orderLabel}>Lignes ouvertes</Text>
                    <Text style={styles.orderValue}>{lines.length}</Text>
                  </View>

                  {lines.length > 0 && (
                    <AppButton
                      label="TOUT RECEPTIONNER"
                      onPress={receiveAll}
                      variant="outline"
                      icon="check-all"
                      fullWidth
                    />
                  )}
                </View>
              )}

              {loadingDetail && (
                <View style={styles.loadingState}>
                  <Text style={styles.loadingText}>Chargement du BC...</Text>
                </View>
              )}

              {lines.length > 0 && (
                <View style={styles.linesHeader}>
                  <MaterialCommunityIcons
                    name="format-list-checks"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.linesTitle}>
                     Lignes a receptionner ({lines.length})
                  </Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={(
            !selectedOrder && !loadingDetail ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="truck-check"
                  size={48}
                  color={COLORS.textDisabled}
                />
                  <Text style={styles.emptyTitle}>Aucun BC selectionne</Text>
                <Text style={styles.emptySubtitle}>
                   Choisissez un bon de commande ouvert pour demarrer la reception
                </Text>
              </View>
            ) : null
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshingKpis || refreshingQuickOrders}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />

        {activeLines.length > 0 && (
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomLabel}>
                {activeLines.length} ligne{activeLines.length > 1 ? 's' : ''} - {totalReceived} unite{totalReceived > 1 ? 's' : ''}
              </Text>
            </View>
            <AppButton
              label="VALIDER LA RECEPTION"
              onPress={() => setConfirmVisible(true)}
              variant="primary"
              loading={isPending}
              fullWidth
              icon="check-circle"
            />
          </View>
        )}

        <Portal>
          <Modal
            visible={quickPickerVisible}
            onDismiss={closeQuickPicker}
            contentContainerStyle={styles.quickModal}
          >
            <Text style={styles.quickModalTitle}>Choisir un BC a receptionner</Text>
            <Searchbar
              placeholder="No BC, fournisseur, ref..."
              value={quickSearch}
              onChangeText={setQuickSearch}
              style={styles.quickSearch}
              inputStyle={styles.quickSearchInput}
            />

            {quickOrdersLoading ? (
              <View style={styles.quickLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.quickLoadingText}>Chargement des BC...</Text>
              </View>
            ) : (
              <FlatList
                data={quickFilteredOrders}
                keyExtractor={(item) => String(item.DocEntry)}
                style={styles.quickList}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <Divider />}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.quickItem, pressed && styles.quickItemPressed]}
                    onPress={() => { void handleQuickOrderSelect(item); }}
                  >
                    <Text style={styles.quickItemTitle}>BC {item.DocNum}</Text>
                    <Text style={styles.quickItemSub} numberOfLines={1}>
                      {item.CardCode} - {item.CardName}
                    </Text>
                    <Text style={styles.quickItemMeta} numberOfLines={1}>
                      {formatDate(item.DocDate)}
                      {item.NumAtCard ? ` - Ref: ${item.NumAtCard}` : ''}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={(
                  <View style={styles.quickEmpty}>
                      <Text style={styles.quickEmptyText}>Aucun BC ouvert trouve</Text>
                  </View>
                )}
              />
            )}

            <View style={styles.quickActions}>
              <AppButton
                label="Fermer"
                onPress={closeQuickPicker}
                variant="outline"
                fullWidth
              />
            </View>
          </Modal>
        </Portal>

        <AppModal
          visible={confirmVisible}
          title="Confirmer la reception ?"
          message={`Vous allez receptionner ${totalReceived} unite${totalReceived > 1 ? 's' : ''} sur ${activeLines.length} ligne${activeLines.length > 1 ? 's' : ''} du BC no${selectedOrder?.DocNum ?? '-'}.\n\nCette action est irreversible.`}
          confirmLabel="Valider"
          onConfirm={handleSendReception}
          onCancel={() => setConfirmVisible(false)}
          loading={isPending}
        />
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    paddingBottom: 8,
    gap: 6,
    marginBottom: 2,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  formSection: {
    paddingHorizontal: 16,
  },
  orderInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  orderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  loadingState: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  linesTitle: {
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
  quickModal: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  quickSearch: {
    marginBottom: 8,
    backgroundColor: COLORS.background,
    elevation: 0,
  },
  quickSearchInput: {
    fontSize: 14,
    minHeight: 40,
  },
  quickLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  quickLoadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quickList: {
    maxHeight: 360,
  },
  quickItem: {
    paddingVertical: 11,
    paddingHorizontal: 6,
    gap: 4,
  },
  quickItemPressed: {
    backgroundColor: COLORS.primary + '14',
    borderRadius: 8,
  },
  quickItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quickItemSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quickItemMeta: {
    fontSize: 12,
    color: COLORS.textDisabled,
  },
  quickEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  quickEmptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quickActions: {
    marginTop: 10,
  },
});

export default ReceptionScreen;
