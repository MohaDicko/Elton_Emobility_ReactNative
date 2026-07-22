// ─── AppButton — Bouton standard avec variants ──────────────────────────────
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
type VariantT = 'primary' | 'danger' | 'outline' | 'ghost';

interface IAppButtonProps {
  label: string;
  onPress: () => void;
  variant?: VariantT;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  fullWidth?: boolean;
}

// ─── Config variants ────────────────────────────────────────────────────────
const VARIANT_CONFIG: Record<VariantT, {
  mode: 'contained' | 'outlined' | 'text';
  buttonColor?: string;
  textColor?: string;
}> = {
  primary: { mode: 'contained', buttonColor: COLORS.primary, textColor: COLORS.white },
  danger: { mode: 'contained', buttonColor: COLORS.danger, textColor: COLORS.white },
  outline: { mode: 'outlined', textColor: COLORS.primary },
  ghost: { mode: 'text', textColor: COLORS.primary },
};

// ─── Composant ──────────────────────────────────────────────────────────────
const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}: IAppButtonProps) => {
  const config = VARIANT_CONFIG[variant];

  return (
    <Button
      mode={config.mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      buttonColor={config.buttonColor}
      textColor={config.textColor}
      style={[
        styles.button,
        variant === 'outline' && styles.outlineButton,
        fullWidth && styles.fullWidth,
      ]}
      contentStyle={styles.content}
      labelStyle={styles.label}
    >
      {label}
    </Button>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
  },
  outlineButton: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    height: 48,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AppButton;
