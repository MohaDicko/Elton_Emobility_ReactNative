import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import type { IWarehouseStock } from '@shared/types';
import { formatQuantity } from '@shared/utils';

interface IStockMultiWarehouseProps {
  stocks: IWarehouseStock[];
  highlightWarehouse?: string;
  highlightToWarehouse?: string;
  highlightMaxWarehouse?: string;
}

const StockMultiWarehouse = ({
  stocks,
  highlightWarehouse,
  highlightToWarehouse,
  highlightMaxWarehouse,
}: IStockMultiWarehouseProps) => {
  if (stocks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="warehouse" size={32} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>Aucune donnee de stock</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.warehouseHeaderCol]}>Entrepot</Text>
        <Text style={[styles.headerCell, styles.numberHeaderCol]}>Dispo</Text>
        <Text style={[styles.headerCell, styles.numberHeaderCol]}>Alloue</Text>
        <Text style={[styles.headerCell, styles.numberHeaderCol]}>Cmde</Text>
      </View>

      <View>
        {stocks.map((stock) => {
          const isFrom = stock.WarehouseCode === highlightWarehouse;
          const isTo = stock.WarehouseCode === highlightToWarehouse;
          const isMax = stock.WarehouseCode === highlightMaxWarehouse && !isFrom && !isTo;
          const hasStock = stock.InStock > 0;
          const suffix = isFrom ? ' [S]' : isTo ? ' [D]' : isMax ? ' [M]' : '';

          return (
            <View
              key={stock.WarehouseCode}
              style={[
                styles.row,
                isFrom && styles.highlightedFromRow,
                isTo && styles.highlightedToRow,
                isMax && styles.highlightedMaxRow,
              ]}
            >
              <View style={styles.warehouseCol}>
                <View
                  style={[
                    styles.stockDot,
                    { backgroundColor: hasStock ? COLORS.primary : COLORS.textDisabled },
                  ]}
                />
                <Text
                  style={[
                    styles.warehouseText,
                    isFrom && styles.highlightedFromText,
                    isTo && styles.highlightedToText,
                    isMax && styles.highlightedMaxText,
                  ]}
                  numberOfLines={1}
                >
                  {stock.WarehouseCode}
                  {suffix}
                </Text>
              </View>

              <Text
                style={[
                  styles.cell,
                  styles.numberCol,
                  styles.numberText,
                  { color: hasStock ? COLORS.primary : COLORS.textDisabled },
                ]}
              >
                {formatQuantity(stock.InStock)}
              </Text>

              <Text
                style={[
                  styles.cell,
                  styles.numberCol,
                  styles.numberText,
                  { color: stock.Committed > 0 ? COLORS.orange : COLORS.textDisabled },
                ]}
              >
                {formatQuantity(stock.Committed)}
              </Text>

              <Text
                style={[
                  styles.cell,
                  styles.numberCol,
                  styles.numberText,
                  { color: stock.Ordered > 0 ? COLORS.blue : COLORS.textDisabled },
                ]}
              >
                {formatQuantity(stock.Ordered)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  warehouseHeaderCol: {
    flex: 2,
  },
  numberHeaderCol: {
    flex: 1,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 50,
  },
  highlightedFromRow: {
    backgroundColor: '#FFF3E0',
  },
  highlightedToRow: {
    backgroundColor: '#E3F2FD',
  },
  highlightedMaxRow: {
    backgroundColor: '#E8F5E9',
  },
  cell: {
    fontSize: 14,
  },
  warehouseCol: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberCol: {
    flex: 1,
    textAlign: 'right',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  warehouseText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  highlightedFromText: {
    fontWeight: '700',
    color: COLORS.orange,
  },
  highlightedToText: {
    fontWeight: '700',
    color: COLORS.blue,
  },
  highlightedMaxText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StockMultiWarehouse;
