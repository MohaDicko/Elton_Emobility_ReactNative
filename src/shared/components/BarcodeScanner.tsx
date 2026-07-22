// ─── Scanner code-barres — caméra + saisie manuelle ─────────────────────────
import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { COLORS } from '@core/config/theme';
import { AppButton, AppInput } from '@shared/components/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IBarcodeScannerProps {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const BarcodeScanner = ({ visible, onScan, onClose }: IBarcodeScannerProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Throttle : ignore les scans identiques dans un délai de 2s
  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const now = Date.now();
      if (
        result.data === lastScanRef.current &&
        now - lastScanTimeRef.current < 2000
      ) {
        return;
      }

      lastScanRef.current = result.data;
      lastScanTimeRef.current = now;
      onScan(result.data);
    },
    [onScan]
  );

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim();
    if (trimmed.length > 0) {
      onScan(trimmed);
      setManualCode('');
    }
  };

  // ── Permission non encore demandée ──
  if (!permission) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            iconColor={COLORS.white}
            size={28}
            onPress={onClose}
          />
          <Text style={styles.headerTitle}>Scanner un code-barres</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Zone caméra */}
        {permission.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'code128', 'code39'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            {/* Overlay guide de scan */}
            <View style={styles.overlay}>
              <View style={styles.scanGuide} />
            </View>
            <Text style={styles.scanHint}>
              Placez le code-barres dans le cadre
            </Text>
          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              L'accès à la caméra est nécessaire pour scanner les codes-barres.
            </Text>
            <AppButton
              label="Autoriser la caméra"
              onPress={requestPermission}
              variant="primary"
            />
          </View>
        )}

        {/* Saisie manuelle */}
        <View style={styles.manualContainer}>
          <Text style={styles.manualLabel}>Ou saisir manuellement :</Text>
          <View style={styles.manualRow}>
            <View style={styles.manualInput}>
              <AppInput
                label="Code-barres"
                value={manualCode}
                onChangeText={setManualCode}
                keyboardType="numeric"
                onSubmitEditing={handleManualSubmit}
              />
            </View>
            <Pressable style={styles.manualButton} onPress={handleManualSubmit}>
              <IconButton
                icon="check-circle"
                iconColor={COLORS.white}
                size={28}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: COLORS.textPrimary,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanGuide: {
    width: 280,
    height: 160,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanHint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  manualContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  manualLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
  },
  manualButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BarcodeScanner;
