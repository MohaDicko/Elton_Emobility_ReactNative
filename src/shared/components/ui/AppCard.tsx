// ─── AppCard — Carte conteneur réutilisable ─────────────────────────────────
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IAppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

// ─── Composant ──────────────────────────────────────────────────────────────
const AppCard = ({ children, onPress, style }: IAppCardProps) => {
  const content = (
    <Card style={[styles.card, style]}>
      <Card.Content style={styles.content}>
        {children}
      </Card.Content>
    </Card>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  content: {
    padding: 16,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default AppCard;
