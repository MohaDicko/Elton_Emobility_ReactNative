// ─── Auth Layout — Stack simple sans drawer ──────────────────────────────────
import React from 'react';
import { Stack } from 'expo-router';

const AuthLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    />
  );
};

export default AuthLayout;
