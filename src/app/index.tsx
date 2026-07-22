// ─── Entry Point — Auth Guard : redirige vers login ou home ──────────────────
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';

const IndexScreen = () => {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Afficher un loader pendant la restauration de session
  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Rediriger selon l'état d'authentification
  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default IndexScreen;
