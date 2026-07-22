// ─── Root Layout — Providers racine de l'application ──────────────────────────
import React from 'react';
import { Slot } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { StyleSheet } from 'react-native';
import { appTheme } from '@core/config/theme';

// ─── Configuration React Query ──────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min avant de considérer les données comme périmées
      retry: 1,                         // 1 seul retry sur erreur réseau
      refetchOnWindowFocus: false,      // Pas de refetch auto (app mobile)
    },
  },
});

// ─── Layout racine ──────────────────────────────────────────────────────────
const RootLayout = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={appTheme}>
          <StatusBar style="dark" />
          <Slot />
          <Toast />
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RootLayout;
