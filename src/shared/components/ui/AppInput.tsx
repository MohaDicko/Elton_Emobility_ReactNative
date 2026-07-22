// ─── AppInput — Champ texte stylisé ─────────────────────────────────────────
import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IAppInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureEntry?: boolean;
  rightIcon?: string;
  onRightIconPress?: () => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  onSubmitEditing?: () => void;
}

// ─── Composant ──────────────────────────────────────────────────────────────
const AppInput = ({
  label,
  value,
  onChangeText,
  error,
  secureEntry = false,
  rightIcon,
  onRightIconPress,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  disabled = false,
  onSubmitEditing,
}: IAppInputProps) => {
  return (
    <>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        mode="outlined"
        style={styles.input}
        outlineStyle={[styles.outline, error ? styles.outlineError : undefined]}
        error={!!error}
        secureTextEntry={secureEntry}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        disabled={disabled}
        onSubmitEditing={onSubmitEditing}
        right={
          rightIcon ? (
            <TextInput.Icon icon={rightIcon} onPress={onRightIconPress} />
          ) : undefined
        }
      />
      {error ? (
        <HelperText type="error" visible={!!error} style={styles.helperText}>
          {error}
        </HelperText>
      ) : null}
    </>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.surface,
    fontSize: 16,
  },
  outline: {
    borderRadius: 10,
  },
  outlineError: {
    borderColor: COLORS.danger,
  },
  helperText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: -4,
  },
});

export default AppInput;
