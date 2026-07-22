// ─── Sélecteur de fournisseur — liste initiale + recherche serveur ────────────
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Menu, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import { useSuppliers, useSupplierSearch } from '../hooks/useCommande';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ISupplierSelectorProps {
  value: string;
  onChange: (cardCode: string, cardName: string) => void;
  error?: string;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const SupplierSelector = ({ value, onChange, error }: ISupplierSelectorProps) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ── Liste initiale (top 500, chargée une fois) ──
  const { data: initialList = [], isLoading: isLoadingList } = useSuppliers();

  // ── Recherche serveur — active dès 2 caractères ──
  const { data: searchResults = [], isFetching: isSearching } = useSupplierSearch(debouncedSearch);

  // Debounce 350ms — évite un appel SAP à chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Bascule : si l'utilisateur tape ≥ 2 chars → résultats SAP serveur
  //           sinon → liste initiale pré-chargée
  const isSearchMode = debouncedSearch.length >= 2;
  const displayedSuppliers = isSearchMode ? searchResults : initialList;
  const isLoading = isSearchMode ? isSearching : isLoadingList;

  const selectedSupplier = initialList.find((s) => s.CardCode === value)
    ?? searchResults.find((s) => s.CardCode === value);

  const displayText = selectedSupplier
    ? `${selectedSupplier.CardCode} — ${selectedSupplier.CardName ?? 'Sans nom'}`
    : 'Sélectionner un fournisseur';

  const handleClose = () => {
    setVisible(false);
    setSearch('');
    setDebouncedSearch('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fournisseur</Text>

      <Menu
        visible={visible}
        onDismiss={handleClose}
        anchor={
          <Pressable
            style={[styles.selector, error ? styles.selectorError : null]}
            onPress={() => setVisible(true)}
          >
            {isLoadingList && !selectedSupplier ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="truck-delivery-outline"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.selectorText,
                    !selectedSupplier && styles.placeholder,
                  ]}
                  numberOfLines={1}
                >
                  {displayText}
                </Text>
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
        {/* Champ de recherche */}
        <View style={styles.searchWrapper}>
          <Searchbar
            placeholder="Rechercher par nom ou code…"
            value={search}
            onChangeText={setSearch}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
              style={styles.searchSpinner}
            />
          )}
        </View>

        {/* Indicateur mode recherche */}
        {isSearchMode && (
          <Text style={styles.searchModeHint}>
            {isSearching
              ? 'Recherche en cours…'
              : `${searchResults.length} résultat${searchResults.length !== 1 ? 's' : ''} pour "${debouncedSearch}"`}
          </Text>
        )}

        {/* Liste des fournisseurs */}
        <ScrollView style={styles.menuScroll}>
          {displayedSuppliers.slice(0, 50).map((s) => (
            <Menu.Item
              key={s.CardCode}
              title={`${s.CardCode} — ${s.CardName ?? 'Sans nom'}`}
              onPress={() => {
                onChange(s.CardCode, s.CardName ?? '');
                handleClose();
              }}
              titleStyle={s.CardCode === value ? styles.selectedItem : undefined}
            />
          ))}

          {!isLoading && displayedSuppliers.length === 0 && (
            <View style={styles.emptyMenu}>
              <MaterialCommunityIcons
                name="magnify-close"
                size={24}
                color={COLORS.textDisabled}
              />
              <Text style={styles.emptyText}>
                {isSearchMode
                  ? `Aucun fournisseur trouvé pour "${debouncedSearch}"`
                  : 'Aucun fournisseur disponible'}
              </Text>
            </View>
          )}
        </ScrollView>
      </Menu>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    height: 52,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    gap: 10,
  },
  selectorError: {
    borderColor: COLORS.danger,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  placeholder: {
    color: COLORS.placeholder,
  },
  menuContent: {
    backgroundColor: COLORS.surface,
    maxWidth: 360,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  searchBar: {
    flex: 1,
    margin: 8,
    elevation: 0,
    backgroundColor: COLORS.background,
    height: 40,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 40,
  },
  searchSpinner: {
    marginRight: 4,
  },
  searchModeHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontStyle: 'italic',
  },
  menuScroll: {
    maxHeight: 250,
  },
  selectedItem: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  emptyMenu: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
});

export default SupplierSelector;
