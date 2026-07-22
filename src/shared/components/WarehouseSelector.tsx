import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Menu, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import { useWarehouses } from '@shared/hooks';

interface IWarehouseSelectorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  excludeCode?: string;
  allowedCodes?: string[];
  error?: string;
  allowAllOption?: boolean;
  allOptionLabel?: string;
}

const WarehouseSelector = ({
  value,
  onChange,
  label = 'Entrepot',
  excludeCode,
  allowedCodes,
  error,
  allowAllOption = false,
  allOptionLabel = 'Tous les entrepots',
}: IWarehouseSelectorProps) => {
  const [visible, setVisible] = useState(false);
  const { warehouses, isLoading } = useWarehouses();

  const filteredWarehouses = warehouses
    .filter((wh) => !excludeCode || wh.WarehouseCode !== excludeCode)
    .filter((wh) => !allowedCodes || allowedCodes.includes(wh.WarehouseCode));

  const selectedWarehouse = warehouses.find((wh) => wh.WarehouseCode === value);
  const displayText = selectedWarehouse
    ? `${selectedWarehouse.WarehouseCode} - ${selectedWarehouse.WarehouseName}`
    : allowAllOption
      ? allOptionLabel
      : 'Selectionner un entrepot';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Pressable
            style={[styles.selector, error ? styles.selectorError : null]}
            onPress={() => setVisible(true)}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="warehouse"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.selectorText,
                    !selectedWarehouse && !allowAllOption && styles.placeholder,
                  ]}
                  numberOfLines={1}
                >
                  {displayText}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={COLORS.textSecondary}
                />
              </>
            )}
          </Pressable>
        }
        contentStyle={styles.menuContent}
      >
        <ScrollView style={styles.menuScroll}>
          {allowAllOption && (
            <Menu.Item
              key="__all__"
              title={allOptionLabel}
              onPress={() => {
                onChange('');
                setVisible(false);
              }}
              titleStyle={!value ? styles.selectedItem : undefined}
            />
          )}

          {filteredWarehouses.map((wh) => (
            <Menu.Item
              key={wh.WarehouseCode}
              title={`${wh.WarehouseCode} - ${wh.WarehouseName}`}
              onPress={() => {
                onChange(wh.WarehouseCode);
                setVisible(false);
              }}
              titleStyle={
                wh.WarehouseCode === value ? styles.selectedItem : undefined
              }
            />
          ))}
        </ScrollView>
      </Menu>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
      marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 7,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    gap: 10,
  },
  selectorError: {
    borderColor: COLORS.danger,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  placeholder: {
    color: COLORS.placeholder,
  },
  menuContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  menuScroll: {
    maxHeight: 300,
  },
  selectedItem: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
});

export default WarehouseSelector;
