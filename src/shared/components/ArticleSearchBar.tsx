// ─── Barre de recherche article — texte, code article, scan code-barres ──────
import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import { AppInput } from '@shared/components/ui';
import { useArticleSearch } from '@shared/hooks';
import type { IArticle } from '@shared/types';
import { formatQuantity } from '@shared/utils';
import BarcodeScanner from './BarcodeScanner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IArticleSearchBarProps {
  onArticleSelect: (article: IArticle) => void;
  placeholder?: string;
  disabled?: boolean;
  hideStock?: boolean;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const ArticleSearchBar = ({
  onArticleSelect,
  placeholder = 'Rechercher ou scanner un article...',
  disabled = false,
  hideStock = false,
}: IArticleSearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (disabled) {
      setSearchTerm('');
      setShowResults(false);
      setScannerVisible(false);
    }
  }, [disabled]);

  // Détection automatique du mode (text | code | barcode)
  const { articles, isSearching, searchMode } = useArticleSearch(searchTerm);

  const handleTextChange = (text: string) => {
    if (disabled) return;
    setSearchTerm(text);
    setShowResults(text.length >= 2);
  };

  const handleArticlePress = useCallback(
    (article: IArticle) => {
      onArticleSelect(article);
      setSearchTerm('');
      setShowResults(false);
    },
    [onArticleSelect]
  );

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      if (disabled) return;
      setScannerVisible(false);
      setSearchTerm(barcode);

      // Import direct du service pour la recherche immédiate par code-barres
      const { itemService } = await import('@shared/services');
      const article = await itemService.searchByBarcode(barcode);

      if (article) {
        handleArticlePress(article);
      } else {
        // Pas trouvé → afficher le code dans la barre pour recherche manuelle
        setShowResults(true);
      }
    },
    [disabled, handleArticlePress]
  );

  // Indicateur du mode de recherche actif
  const modeLabel =
    searchMode === 'barcode'
      ? 'Code-barres'
      : searchMode === 'code'
        ? 'Code article'
        : 'Nom';

  const renderArticleItem = (item: IArticle) => (
    <Pressable
      key={item.ItemCode}
      style={styles.resultItem}
      onPress={() => handleArticlePress(item)}
    >
      <View style={styles.resultLeft}>
        <Text style={styles.resultCode}>{item.ItemCode}</Text>
        {item.Frozen === 'tYES' && (
          <View style={styles.frozenBadge}>
            <Text style={styles.frozenBadgeText}>INACTIF</Text>
          </View>
        )}
        <Text style={styles.resultName} numberOfLines={1}>
          {item.ItemName}
        </Text>
      </View>
      {!hideStock && (
        <View style={styles.resultRight}>
          <Text
            style={[
              styles.resultStock,
              { color: item.QuantityOnStock > 0 ? COLORS.primary : COLORS.danger },
            ]}
          >
            {formatQuantity(item.QuantityOnStock)}
          </Text>
          <Text style={styles.resultStockLabel}>en stock</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <AppInput
        label={placeholder}
        value={searchTerm}
        onChangeText={handleTextChange}
        rightIcon="barcode-scan"
        onRightIconPress={() => {
          if (!disabled) setScannerVisible(true);
        }}
        disabled={disabled}
      />

      {/* Indicateur de mode + recherche */}
      {!disabled && searchTerm.length >= 2 && (
        <View style={styles.modeRow}>
          <View style={styles.modeBadge}>
            <Text style={styles.modeText}>{modeLabel}</Text>
          </View>
          {isSearching && (
            <Text style={styles.searchingText}>Recherche en cours...</Text>
          )}
        </View>
      )}

      {/* Résultats dropdown — défilable, hauteur max fixe */}
      {!disabled && showResults && articles.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {articles.map(renderArticleItem)}
          </ScrollView>
        </View>
      )}

      {/* Aucun résultat */}
      {!disabled && showResults && !isSearching && searchTerm.length >= 2 && articles.length === 0 && (
        <View style={styles.noResult}>
          <MaterialCommunityIcons
            name="magnify-close"
            size={20}
            color={COLORS.textSecondary}
          />
          <Text style={styles.noResultText}>Aucun article trouvé</Text>
        </View>
      )}

      {/* Scanner */}
      <BarcodeScanner
        visible={!disabled && scannerVisible}
        onScan={handleBarcodeScan}
        onClose={() => setScannerVisible(false)}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
    gap: 8,
  },
  modeBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  resultsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginTop: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 280,
  },
  resultsList: {
    borderRadius: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 52,
  },
  resultLeft: {
    flex: 1,
    marginRight: 12,
  },
  resultCode: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resultName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultStock: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultStockLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  noResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  noResultText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  frozenBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
  },
  frozenBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
});

export default ArticleSearchBar;
