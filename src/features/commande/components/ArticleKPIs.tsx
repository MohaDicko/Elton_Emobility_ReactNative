import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import { formatQuantity } from '@shared/utils';
import useVentesHebdo from '../hooks/useVentesHebdo';

interface IArticleKPIsProps {
  itemCode: string;
  quantityOnStock: number;
  warehouseCode?: string;
  quantityOrderedFromVendors: number;
  onSuggestion?: (qteSuggeree: number) => void;
}

const ArticleKPIs = ({
  itemCode,
  quantityOnStock,
  warehouseCode,
  quantityOrderedFromVendors,
  onSuggestion,
}: IArticleKPIsProps) => {
  const {
    venteMoyenne,
    ral,
    couvertureSemaines,
    qteSuggeree,
    invoicesFetched,
    periodeWeeks,
    isApproximatif,
    isLoading,
  } = useVentesHebdo(itemCode, quantityOnStock, quantityOrderedFromVendors, warehouseCode);

  React.useEffect(() => {
    if (!isLoading && onSuggestion) {
      onSuggestion(qteSuggeree);
    }
  }, [isLoading, qteSuggeree, onSuggestion]);

  const stockColor =
    quantityOnStock > 10 ? COLORS.primary : quantityOnStock > 0 ? COLORS.orange : COLORS.danger;

  const couvertureColor =
    couvertureSemaines === null
      ? COLORS.textSecondary
      : couvertureSemaines >= 4
        ? COLORS.primary
        : couvertureSemaines >= 2
          ? COLORS.orange
          : COLORS.danger;

  const suggestionColor = qteSuggeree > 0 ? COLORS.danger : COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.kpi}>
          <View style={styles.kpiHeader}>
            <MaterialCommunityIcons name="package-variant" size={14} color={COLORS.textSecondary} />
            <Text style={styles.kpiLabel}>Stock</Text>
          </View>
          <Text style={[styles.kpiValue, { color: stockColor }]}>{formatQuantity(quantityOnStock)}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.kpi}>
          <View style={styles.kpiHeader}>
            <MaterialCommunityIcons name="chart-line" size={14} color={COLORS.textSecondary} />
            <Text style={styles.kpiLabel}>Vente/sem</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.blue} style={styles.kpiSpinner} />
          ) : (
            <>
              <Text style={[styles.kpiValue, { color: COLORS.blue }]}>{formatQuantity(venteMoyenne)}</Text>
              {isApproximatif && invoicesFetched > 0 && (
                <Text style={styles.kpiHint}>~ {invoicesFetched} fact. / {periodeWeeks} sem</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.separator} />

        <View style={styles.kpi}>
          <View style={styles.kpiHeader}>
            <MaterialCommunityIcons name="truck-delivery" size={14} color={COLORS.textSecondary} />
            <Text style={styles.kpiLabel}>En cours</Text>
          </View>
          <Text style={[styles.kpiValue, { color: COLORS.orange }]}>{formatQuantity(ral)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.kpi}>
          <View style={styles.kpiHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.textSecondary} />
            <Text style={styles.kpiLabel}>Couverture</Text>
          </View>
          {couvertureSemaines === null ? (
            <>
              <Text style={[styles.kpiValue, { color: COLORS.textSecondary }]}>-</Text>
              <Text style={styles.kpiHint}>pas de ventes</Text>
            </>
          ) : (
            <>
              <Text style={[styles.kpiValue, { color: couvertureColor }]}>
                {couvertureSemaines}
                <Text style={styles.kpiUnit}> sem</Text>
              </Text>
              <Text style={styles.kpiHint}>
                {couvertureSemaines === 0 ? 'en rupture' : 'stock disponible'}
              </Text>
            </>
          )}
        </View>

        <View style={styles.separator} />

        <View style={[styles.kpi, styles.suggestionKpi]}>
          <View style={styles.kpiHeader}>
            <MaterialCommunityIcons name="cart-arrow-down" size={14} color={suggestionColor} />
            <Text style={[styles.kpiLabel, { color: suggestionColor }]}>A commander</Text>
          </View>
          <Text style={[styles.kpiValue, styles.suggestionValue, { color: suggestionColor }]}>
            {formatQuantity(qteSuggeree)}
          </Text>
          {qteSuggeree === 0 && <Text style={styles.kpiHint}>Stock suffisant</Text>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  kpiSpinner: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpi: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  kpiUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiHint: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 2,
  },
  separator: {
    width: 1,
    backgroundColor: COLORS.border,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  suggestionKpi: {
    flex: 1.2,
  },
  suggestionValue: {
    fontSize: 24,
    fontWeight: '800',
  },
});

export default ArticleKPIs;
