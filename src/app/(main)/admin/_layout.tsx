import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@core/auth/authStore';

const AdminLayout = () => {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);

  // Restriction stricte de l'accès Administrateur selon le rôle défini dans SAP
  if (!isAdmin) {
    return <Redirect href="/(main)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default AdminLayout;
