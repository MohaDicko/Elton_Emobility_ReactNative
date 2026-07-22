// ─── AppModal — Modal de confirmation (obligatoire avant tout POST SAP) ─────
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button } from 'react-native-paper';
import { COLORS } from '@core/config/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface IAppModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

// ─── Composant ──────────────────────────────────────────────────────────────
const AppModal = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
}: IAppModalProps) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onCancel}
            style={styles.cancelButton}
            contentStyle={styles.buttonContent}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            buttonColor={danger ? COLORS.danger : COLORS.primary}
            textColor={COLORS.white}
            style={styles.confirmButton}
            contentStyle={styles.buttonContent}
          >
            {confirmLabel}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.surface,
    margin: 24,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    borderRadius: 10,
    borderColor: COLORS.border,
  },
  confirmButton: {
    borderRadius: 10,
  },
  buttonContent: {
    height: 44,
    paddingHorizontal: 4,
  },
});

export default AppModal;
