// ─── QuantityStepper — Saisie quantité avec boutons +/- ─────────────────────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, TextInput } from 'react-native-paper';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IQuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

// ─── Composant ──────────────────────────────────────────────────────────────
const QuantityStepper = ({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  label,
}: IQuantityStepperProps) => {
  const handleDecrement = () => {
    const next = value - step;
    if (next >= min) onChange(next);
  };

  const handleIncrement = () => {
    const next = value + step;
    if (next <= max) onChange(next);
  };

  const handleTextChange = (text: string) => {
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    } else if (text === '') {
      onChange(0);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.stepper}>
        <IconButton
          icon="minus"
          mode="contained"
          containerColor={COLORS.background}
          iconColor={COLORS.textPrimary}
          size={20}
          onPress={handleDecrement}
          disabled={value <= min}
          style={styles.button}
        />
        <TextInput
          value={String(value)}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          outlineStyle={styles.inputOutline}
          textAlign="center"
        />
        <IconButton
          icon="plus"
          mode="contained"
          containerColor={COLORS.primary}
          iconColor={COLORS.white}
          size={20}
          onPress={handleIncrement}
          disabled={value >= max}
          style={styles.button}
        />
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  input: {
    width: 80,
    height: 48,
    backgroundColor: COLORS.surface,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputOutline: {
    borderRadius: 10,
  },
});

export default QuantityStepper;
