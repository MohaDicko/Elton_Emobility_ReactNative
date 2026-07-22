// ─── Résumé panier + bouton envoi ────────────────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '@core/config/theme';
import { AppButton } from '@shared/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ICartSummaryProps {
  itemCount: number;
  onSendPress: () => void;
  loading?: boolean;
  supplierCount?: number; // Si fourni, affiche "VALIDER (X COMMANDE(S))" au lieu de "ENVOYER"
}

// ─── Composant ───────────────────────────────────────────────────────────────

const CartSummary = ({ itemCount, onSendPress, loading = false, supplierCount }: ICartSummaryProps) => {
  if (itemCount === 0) return null;

  const buttonLabel = supplierCount !== undefined
    ? `VALIDER (${supplierCount} COMMANDE${supplierCount > 1 ? 'S' : ''})`
    : `ENVOYER LA COMMANDE (${itemCount})`;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.label}>Mon panier</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </View>
      </View>

      <View style={styles.buttonWrapper}>
        <AppButton
          label={buttonLabel}
          onPress={onSendPress}
          variant="primary"
          loading={loading}
          fullWidth
          icon={supplierCount !== undefined ? 'arrow-right' : 'send'}
        />
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  badge: {
    backgroundColor: COLORS.orange,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  buttonWrapper: {
    width: '100%',
  },
});

export default CartSummary;
