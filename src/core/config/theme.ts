// ─── Charte graphique SoftPrice / Global Action ───────────────────────────────
// Couleurs extraites du logo client SoftPrice

export const COLORS = {
  // ── Couleur principale ──────────────────────────────────────────────────────
  primary: '#2DB34A',       // Vert SoftPrice (texte logo)
  primaryLight: '#4DC96A',
  primaryDark: '#1E8A35',

  // ── Accents ─────────────────────────────────────────────────────────────────
  orange: '#F47920',        // Orange (arc du panier)
  pink: '#E91D8C',          // Rose / Magenta
  purple: '#7B3FA0',        // Violet
  blue: '#4A9FD5',          // Bleu
  greenLight: '#8BC34A',    // Vert clair

  // ── États ───────────────────────────────────────────────────────────────────
  danger: '#F05A28',        // Rouge-orange (erreur, suppression)
  warning: '#F47920',       // Orange (avertissement)
  success: '#2DB34A',       // Vert (succès)
  info: '#4A9FD5',          // Bleu (information)

  // ── Neutres ─────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  background: '#F5F7FA',    // Fond général de l'app
  surface: '#FFFFFF',       // Cartes, modaux
  border: '#E0E0E0',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  placeholder: '#9CA3AF',
} as const;

export type ColorKey = keyof typeof COLORS;

// ── Thème react-native-paper ─────────────────────────────────────────────────
import { MD3LightTheme } from 'react-native-paper';

export const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    primaryContainer: COLORS.primaryLight,
    secondary: COLORS.orange,
    secondaryContainer: '#FFE0C2',
    error: COLORS.danger,
    background: COLORS.background,
    surface: COLORS.surface,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
  },
};
