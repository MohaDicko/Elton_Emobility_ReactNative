// ─── Carte article — affichage complet avec famille, sous-famille, PCB, UdM ──
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import type { IArticle } from '@shared/types';
import { formatQuantity } from '@shared/utils';
import useItemGroups from '@shared/hooks/useItemGroups';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IArticleCardProps {
  article: IArticle;
  onPress?: () => void;
  showStock?: boolean;
  warehouseCode?: string;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const ArticleCard = ({
  article,
  onPress,
  showStock = true,
  warehouseCode,
}: IArticleCardProps) => {
  const { getGroupName } = useItemGroups();

  // Calcul du stock affiché
  const getDisplayStock = (): number => {
    if (warehouseCode && article.ItemWarehouseInfoCollection) {
      const warehouseInfo = article.ItemWarehouseInfoCollection.find(
        (wh) => wh.WarehouseCode === warehouseCode
      );
      return warehouseInfo?.InStock ?? 0;
    }
    return article.QuantityOnStock;
  };

  const stock = getDisplayStock();

  const getStockColor = (): string => {
    if (stock > 10) return COLORS.primary;
    if (stock > 0) return COLORS.orange;
    return COLORS.danger;
  };

  const famille = getGroupName(article.ItemsGroupCode);

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      style={styles.card}
      {...(onPress && { onPress })}
    >
      {/* ── En-tête : Code + UdM ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.itemCode}>{article.ItemCode}</Text>
          <Text style={styles.itemName} numberOfLines={2}>
            {article.ItemName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {article.InventoryUOM && (
            <View style={styles.uomBadge}>
              <Text style={styles.uomText}>{article.InventoryUOM}</Text>
            </View>
          )}
          {onPress && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={COLORS.textSecondary}
            />
          )}
        </View>
      </View>

      {/* ── Code-barres ── */}
      {article.BarCode && (
        <View style={styles.barcodeRow}>
          <MaterialCommunityIcons
            name="barcode"
            size={18}
            color={COLORS.textSecondary}
          />
          <Text style={styles.barcodeText}>{article.BarCode}</Text>
        </View>
      )}

      {/* ── Famille / Sous-famille / Rayon / PCB ── */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Famille</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {famille}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sous-famille</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {article.U_sous_fam ?? '—'}
            </Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rayon</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {article.U_rayon ?? '—'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>PCB</Text>
            <Text style={styles.detailValue}>
              {article.U_PCB ?? '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Stock ── */}
      {showStock && (
        <View style={styles.stockRow}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Stock</Text>
            <Text style={[styles.stockValue, { color: getStockColor() }]}>
              {formatQuantity(stock)}
            </Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Commandé</Text>
            <Text style={[styles.stockValue, { color: COLORS.blue }]}>
              {formatQuantity(article.QuantityOrderedFromVendors)}
            </Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Vendu</Text>
            <Text style={[styles.stockValue, { color: COLORS.orange }]}>
              {formatQuantity(article.QuantityOrderedByCustomers)}
            </Text>
          </View>
        </View>
      )}
    </Wrapper>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  uomBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  uomText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  barcodeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  detailsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  stockRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  stockItem: {
    flex: 1,
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});

export default ArticleCard;
