import React from 'react';
import { Stack } from 'expo-router';

const CommandeLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/*
        recap = modal : glisse depuis le bas par-dessus index.tsx
        → l'utilisateur peut vérifier, puis fermer pour continuer à ajouter des articles
        → router.back() depuis recap revient exactement là où on était dans index
      */}
      <Stack.Screen
        name="recap"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
};

export default CommandeLayout;
