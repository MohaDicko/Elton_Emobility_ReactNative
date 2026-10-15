// ─── Écran de connexion applicative (@GA_USERS) ──────────────────────────────
// L'auth SAP (compte service) est transparente — gérée dans sapAuth.ts.
// L'utilisateur saisit uniquement son identifiant et mot de passe applicatifs.
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';
import { DEMO_MODE } from '@core/config/constants';
import { APP_ASSETS } from '@core/constants/assets';

// ─── Composant ──────────────────────────────────────────────────────────────
const LoginScreen = () => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [userCode, setUserCode]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (setter: (v: string) => void) => (value: string) => {
    if (error) clearError();
    setter(value);
  };

  const handleLogin = async () => {
    try {
      await login(userCode.trim(), password);
      const user = useAuthStore.getState().user;
      if (user?.mustChangePwd) {
        router.replace('/(auth)/change-password');
      } else {
        router.replace('/(main)/home');
      }
    } catch {
      // Erreur affichée via authStore.error
    }
  };

  const isFormValid = userCode.trim().length > 0 && password.trim().length > 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fond dégradé */}
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
        {/* ── Logo + titre ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.logoContainer}>
          <View style={styles.logoCard}>
            <Image
              source={APP_ASSETS.logo}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* ── Formulaire ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.formCard}>

          <TextInput
            label="Identifiant"
            value={userCode}
            onChangeText={handleChange(setUserCode)}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="account" color={COLORS.primary} />}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <TextInput
            label="Mot de passe"
            value={password}
            onChangeText={handleChange(setPassword)}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock" color={COLORS.primary} />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword(!showPassword)}
                color={COLORS.textSecondary}
              />
            }
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* Erreur */}
          {error ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}> {error}</Text>
            </Animated.View>
          ) : null}

          {/* Bouton connexion */}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || !isFormValid}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
            icon="login"
            buttonColor={COLORS.primaryDark}
          >
            SE CONNECTER
          </Button>

          {/* Mode démo — données locales uniquement */}
          {DEMO_MODE && (
            <Button
              mode="text"
              onPress={() => {
                useAuthStore.setState({
                  isAuthenticated: true,
                  user: {
                    userCode: 'DEMO-USER',
                    userName: 'Utilisateur Standard Démo',
                    isAdmin: false,
                    mustChangePwd: false,
                    warehouseCode: '01',
                  },
                });
                router.replace('/(main)/home');
              }}
              style={{ marginTop: 4 }}
              textColor="rgba(255,255,255,0.5)"
              icon="bug"
            >
              ACCÈS DÉMO FRONTEND
            </Button>
          )}
        </Animated.View>

        {/* Footer */}
        <Animated.Text entering={FadeIn.delay(400)} style={styles.footer}>
          Powered by SAFIR CONSULTING
        </Animated.Text>
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

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    marginBottom: 16,
  },
  logo: {
    width: 200,
    height: 120,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    fontWeight: '500',
  },

  // Formulaire
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

  // Erreur
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

  // Bouton
  loginButton: {
    marginTop: 8,
    borderRadius: 14,
  },
  loginButtonContent: {
    height: 54,
  },
  loginButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Footer
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 24,
    letterSpacing: 0.5,
  },
});

export default LoginScreen;
