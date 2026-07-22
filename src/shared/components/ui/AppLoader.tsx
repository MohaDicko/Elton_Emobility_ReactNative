// ─── AppLoader — Spinner plein écran ─────────────────────────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IAppLoaderProps {
  message?: string;
}

// ─── Composant ──────────────────────────────────────────────────────────────
const AppLoader = ({ message }: IAppLoaderProps) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

export default AppLoader;
