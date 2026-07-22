// ─── AppBadge — Badge numérique ou statut ───────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IAppBadgeProps {
  value: string | number;
  color?: string;
  size?: 'small' | 'medium';
}

// ─── Composant ──────────────────────────────────────────────────────────────
const AppBadge = ({ value, color = COLORS.orange, size = 'medium' }: IAppBadgeProps) => {
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: color }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.text, isSmall && styles.textSmall]}>{value}</Text>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSmall: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
  },
  text: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 11,
  },
});

export default AppBadge;
