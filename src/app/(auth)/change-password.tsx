// ─── Écran Changement de mot de passe obligatoire (première connexion) ─────────
import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@core/auth/authStore';
import { adminService } from '@features/admin/services/adminService';
import { COLORS } from '@core/config/theme';

// ─── Composant ────────────────────────────────────────────────────────────────

const ChangePasswordScreen = () => {
  const user = useAuthStore((s) => s.user);
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const isValid =
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setIsLoading(true);
    setError(null);
    try {
      await adminService.changeOwnPassword(user.userCode, newPassword, user.isResetMode ?? false);
      // Met à jour le flag en mémoire (SecureStore mis à jour au prochain login)
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, mustChangePwd: false } : null,
      }));
      router.replace('/(main)/home');
    } catch {
      setError('Impossible de changer le mot de passe. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, '#5DD87A']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.iconContainer}>
          <MaterialCommunityIcons name="lock-reset" size={56} color={COLORS.white} />
          <Text style={styles.title}>Changement de mot de passe</Text>
          <Text style={styles.subtitle}>
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe
            avant de continuer.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.formCard}>
          <TextInput
            label="Nouveau mot de passe"
            value={newPassword}
            onChangeText={(v) => { setError(null); setNewPassword(v); }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock" color={COLORS.primary} />}
            right={
              <TextInput.Icon
                icon={showNew ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowNew(!showNew)}
                color={COLORS.textSecondary}
              />
            }
            secureTextEntry={!showNew}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <TextInput
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={(v) => { setError(null); setConfirmPassword(v); }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock-check" color={COLORS.primary} />}
            right={
              <TextInput.Icon
                icon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowConfirm(!showConfirm)}
                color={COLORS.textSecondary}
              />
            }
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* Règle longueur */}
          {newPassword.length > 0 && newPassword.length < 6 && (
            <Text style={styles.hint}>Minimum 6 caractères</Text>
          )}

          {/* Mots de passe différents */}
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={styles.hint}>Les mots de passe ne correspondent pas</Text>
          )}

          {/* Erreur réseau */}
          {error && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}> {error}</Text>
            </Animated.View>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading || !isValid}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="check-circle"
            buttonColor={COLORS.primaryDark}
          >
            VALIDER LE MOT DE PASSE
          </Button>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  inputOutline: {
    borderRadius: 12,
  },
  hint: {
    fontSize: 12,
    color: COLORS.orange,
    marginBottom: 8,
    marginLeft: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    marginTop: 8,
    borderRadius: 14,
  },
  buttonContent: {
    height: 54,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default ChangePasswordScreen;
