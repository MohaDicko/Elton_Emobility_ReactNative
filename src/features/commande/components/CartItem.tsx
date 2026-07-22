// ─── Ligne du panier de commande ─────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { COLORS } from '@core/config/theme';
import type { ICartItem } from '../store/commandeStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ICartItemProps {
  item: ICartItem;
  onRemove: (itemCode: string, warehouseCode: string) => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const CartItem = ({ item, onRemove }: ICartItemProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.itemCode}>{item.itemCode}</Text>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.itemName}
        </Text>
        <Text style={styles.warehouse}>{item.warehouseCode}</Text>
      </View>

      <View style={styles.quantityBadge}>
        <Text style={styles.quantityText}>× {item.quantity}</Text>
      </View>

      <IconButton
        icon="trash-can-outline"
        iconColor={COLORS.danger}
        size={22}
        onPress={() => onRemove(item.itemCode, item.warehouseCode)}
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
    color: COLORS.primary,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  warehouse: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quantityBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  deleteButton: {
    margin: 0,
  },
});

export default CartItem;
