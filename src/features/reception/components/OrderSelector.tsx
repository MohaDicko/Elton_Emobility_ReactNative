// ─── Sélecteur de bon de commande à réceptionner ─────────────────────────────
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Menu, ActivityIndicator, Searchbar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import { useOpenOrdersForReception } from '../hooks/useReception';
import type { IPurchaseOrder } from '@shared/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (sapDate: string) => {
  if (!sapDate) return '';
  return new Date(sapDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatTotal = (total?: number) => {
  if (total == null) return '';
  return total.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface IOrderSelectorProps {
  selectedDocEntry: number | null;
  onSelect: (order: IPurchaseOrder) => void;
  warehouseCode?: string;
}

// ─── Sous-composant : item enrichi de liste ───────────────────────────────────

const OrderMenuItem = ({
  order,
  isSelected,
  onPress,
}: {
  order: IPurchaseOrder;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[styles.menuItem, isSelected && styles.menuItemSelected]}
    onPress={onPress}
  >
    {/* Ligne 1 : N° BC + date comptabilisation */}
    <View style={styles.menuItemHeader}>
      <Text style={[styles.menuItemNum, isSelected && styles.menuItemNumSelected]}>
        BC {order.DocNum}
      </Text>
      <View style={styles.menuItemDates}>
        <Text style={styles.menuItemDate}>📅 {formatDate(order.DocDate)}</Text>
        {order.DocDueDate && (
          <Text style={styles.menuItemDueDate}>🚚 {formatDate(order.DocDueDate)}</Text>
        )}
      </View>
    </View>

    {/* Ligne 2 : Fournisseur */}
    <Text style={styles.menuItemSupplier} numberOfLines={1}>
      {order.CardCode} — {order.CardName}
    </Text>

    {/* Ligne 3 : Réf fournisseur + total */}
    <View style={styles.menuItemFooter}>
      {order.NumAtCard ? (
        <Text style={styles.menuItemRef}>Réf frs : {order.NumAtCard}</Text>
      ) : (
        <Text style={styles.menuItemRefEmpty}>Sans réf. fournisseur</Text>
      )}
      {order.DocTotal != null && (
        <Text style={styles.menuItemTotal}>{formatTotal(order.DocTotal)}</Text>
      )}
    </View>
  </Pressable>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const OrderSelector = ({ selectedDocEntry, onSelect, warehouseCode }: IOrderSelectorProps) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { data: orders = [], isLoading } = useOpenOrdersForReception(warehouseCode);

  const selectedOrder = orders.find((o) => o.DocEntry === selectedDocEntry);
  const displayText = selectedOrder
    ? `BC ${selectedOrder.DocNum} — ${selectedOrder.CardName}`
    : 'Sélectionner un bon de commande';

  const filtered = search.length >= 1
    ? orders.filter(
        (o) =>
          String(o.DocNum).includes(search) ||
          (o.CardName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (o.CardCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (o.NumAtCard ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Bon de commande</Text>

      <Menu
        visible={visible}
        onDismiss={() => { setVisible(false); setSearch(''); }}
        anchor={
          <Pressable
            style={styles.selector}
            onPress={() => setVisible(true)}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <View style={styles.selectorTextWrap}>
                  <Text
                    style={[styles.selectorText, !selectedOrder && styles.placeholder]}
                    numberOfLines={1}
                  >
                    {displayText}
                  </Text>
                  {selectedOrder && (
                    <Text style={styles.selectorSub} numberOfLines={1}>
                      {formatDate(selectedOrder.DocDate)}
                      {selectedOrder.NumAtCard ? `  •  Réf: ${selectedOrder.NumAtCard}` : ''}
                      {selectedOrder.DocTotal != null ? `  •  ${formatTotal(selectedOrder.DocTotal)}` : ''}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={COLORS.textSecondary}
                />
              </>
            )}
          </Pressable>
        }
        contentStyle={styles.menuContent}
      >
        <Searchbar
          placeholder="N° BC, fournisseur, réf..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
        <Divider />
        <ScrollView style={styles.menuScroll}>
          {filtered.slice(0, 30).map((order, index) => (
            <React.Fragment key={order.DocEntry}>
              <OrderMenuItem
                order={order}
                isSelected={order.DocEntry === selectedDocEntry}
                onPress={() => {
                  onSelect(order);
                  setVisible(false);
                  setSearch('');
                }}
              />
              {index < filtered.length - 1 && <Divider style={styles.itemDivider} />}
            </React.Fragment>
          ))}
          {filtered.length === 0 && (
            <View style={styles.emptyMenu}>
              <Text style={styles.emptyText}>Aucun BC ouvert trouvé</Text>
            </View>
          )}
        </ScrollView>
      </Menu>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    gap: 10,
  },
  selectorTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  selectorSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  placeholder: {
    color: COLORS.placeholder,
    fontWeight: '400',
  },
  menuContent: {
    backgroundColor: COLORS.surface,
    width: 360,
  },
  searchBar: {
    margin: 8,
    elevation: 0,
    backgroundColor: COLORS.background,
    height: 40,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 40,
  },
  menuScroll: {
    maxHeight: 320,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  menuItemSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemNum: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuItemNumSelected: {
    color: COLORS.primary,
  },
  menuItemDates: {
    alignItems: 'flex-end',
    gap: 2,
  },
  menuItemDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  menuItemDueDate: {
    fontSize: 11,
    color: COLORS.orange,
    fontWeight: '600',
  },
  menuItemSupplier: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  menuItemRef: {
    fontSize: 12,
    color: COLORS.blue,
    fontStyle: 'italic',
  },
  menuItemRefEmpty: {
    fontSize: 12,
    color: COLORS.placeholder,
    fontStyle: 'italic',
  },
  menuItemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  itemDivider: {
    marginHorizontal: 16,
  },
  emptyMenu: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default OrderSelector;
