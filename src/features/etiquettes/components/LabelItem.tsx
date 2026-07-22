// â”€â”€â”€ Ligne d'Ã©tiquette Ã  imprimer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { COLORS } from '@core/config/theme';
import type { ILabelData } from '../services/etiquetteService';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ILabelItemProps {
  label: ILabelData;
  onRemove: (itemCode: string) => void;
}

// â”€â”€â”€ Composant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LabelItem = ({ label, onRemove }: ILabelItemProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.itemCode}>{label.itemCode}</Text>
        <Text style={styles.itemName} numberOfLines={1}>
          {label.itemName}
        </Text>
        {label.price > 0 && (
          <Text style={styles.price}>
            {Math.round(label.price).toLocaleString('fr-FR')} FCFA
          </Text>
        )}
        {label.barcode ? (
          <Text style={styles.barcode}>{label.barcode}</Text>
        ) : (
          <Text style={styles.noBarcode}>Pas de code-barres</Text>
        )}
      </View>

      <View style={styles.quantityBadge}>
        <Text style={styles.quantityText}>x{label.quantity}</Text>
      </View>

      <IconButton
        icon="trash-can-outline"
        iconColor={COLORS.danger}
        size={22}
        onPress={() => onRemove(label.itemCode)}
        style={styles.deleteButton}
      />
    </View>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    textAlign: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  barcode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  noBarcode: {
    fontSize: 11,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
    marginTop: 8,
  },
  quantityBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.blue,
  },
  deleteButton: {
    margin: 0,
  },
});

export default LabelItem;



