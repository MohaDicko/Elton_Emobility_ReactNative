// ─── Ligne de réception — affiche commandé / déjà livré / à recevoir ────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '@core/config/theme';
import { QuantityStepper } from '@shared/components/ui';
import type { IReceptionLine } from '../store/receptionStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IReceptionLineProps {
  line: IReceptionLine;
  onQuantityChange: (lineNum: number, quantity: number) => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const ReceptionLineItem = ({ line, onQuantityChange }: IReceptionLineProps) => {
  return (
    <View style={styles.container}>
      {/* Info article */}
      <View style={styles.articleRow}>
        <Text style={styles.itemCode}>{line.itemCode}</Text>
        <Text style={styles.warehouse}>{line.warehouseCode}</Text>
      </View>
      <Text style={styles.itemName} numberOfLines={2}>
        {line.itemDescription}
      </Text>

      {/* Indicateurs */}
      <View style={styles.indicators}>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Commandé</Text>
          <Text style={styles.indicatorValue}>{line.orderedQuantity}</Text>
        </View>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Déjà livré</Text>
          <Text style={[styles.indicatorValue, { color: COLORS.blue }]}>
            {line.deliveredQuantity}
          </Text>
        </View>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Restant</Text>
          <Text style={[styles.indicatorValue, { color: COLORS.orange }]}>
            {line.remainingQuantity}
          </Text>
        </View>
      </View>

      {/* Saisie quantité reçue */}
      <QuantityStepper
        value={line.receivedQuantity}
        onChange={(qty) => onQuantityChange(line.lineNum, qty)}
        min={0}
        max={line.remainingQuantity}
        label="Quantité reçue"
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  articleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  warehouse: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  itemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  indicator: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  indicatorValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
});

export default ReceptionLineItem;
