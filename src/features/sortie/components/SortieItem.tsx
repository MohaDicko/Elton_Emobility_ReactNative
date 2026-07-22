// ─── Ligne du panier de sortie ────────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { COLORS } from '@core/config/theme';
import type { ISortieItem } from '../store/sortieStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ISortieItemProps {
  item: ISortieItem;
  onRemove: (itemCode: string) => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const SortieItem = ({ item, onRemove }: ISortieItemProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.itemCode}>{item.itemCode}</Text>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.itemName}
        </Text>
        <View style={styles.warehouseRow}>
          <Text style={styles.warehouse}>{item.warehouseCode}</Text>
          {item.availableStock !== undefined && (
            <Text style={[
              styles.stockLabel,
              item.quantity > item.availableStock && styles.stockLabelWarn,
            ]}>
              {item.quantity > item.availableStock
                ? `⚠ Stock : ${item.availableStock}`
                : `Stock : ${item.availableStock}`}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.quantityBadge}>
        <Text style={styles.quantityText}>× {item.quantity}</Text>
      </View>

      <IconButton
        icon="trash-can-outline"
        iconColor={COLORS.danger}
        size={22}
        onPress={() => onRemove(item.itemCode)}
        style={styles.deleteButton}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 56,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  itemCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  warehouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  warehouse: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stockLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stockLabelWarn: {
    color: '#F47920',
    fontWeight: '700',
  },
  quantityBadge: {
    backgroundColor: '#FBE9E7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  deleteButton: {
    margin: 0,
  },
});

export default SortieItem;
