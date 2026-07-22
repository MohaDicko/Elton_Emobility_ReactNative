// ─── AppHeader — En-tête de module avec retour ──────────────────────────────
import React from 'react';
import { StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IAppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

// ─── Composant ──────────────────────────────────────────────────────────────
const AppHeader = ({
  title,
  showBack = true,
  onBack,
  rightIcon,
  onRightPress,
}: IAppHeaderProps) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <Appbar.Header style={styles.header} elevated>
      {showBack ? <Appbar.BackAction onPress={handleBack} /> : null}
      <Appbar.Content title={title} titleStyle={styles.title} />
      {rightIcon ? <Appbar.Action icon={rightIcon} onPress={onRightPress} /> : null}
    </Appbar.Header>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});

export default AppHeader;
