import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { COLORS } from '@core/config/theme';

export type KpiStatus = 'ok' | 'warning' | 'critical' | 'info';

export interface IModuleKpi {
  label: string;
  value: string | number | null;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  status?: KpiStatus;
  sub?: string;
}

interface IProps {
  kpis: IModuleKpi[];
  title?: string;
  onKpiPress?: (kpi: IModuleKpi, index: number) => void;
  pressableIndexes?: number[];
}

const STATUS_COLORS: Record<KpiStatus, string> = {
  ok: COLORS.primary,
  warning: COLORS.orange,
  critical: COLORS.danger,
  info: COLORS.blue,
};

const Pulse = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 750 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.skeleton, style]} />;
};

const KpiCard = ({
  kpi,
  index,
  isPressable,
  onPress,
  cardWidth,
}: {
  kpi: IModuleKpi;
  index: number;
  isPressable: boolean;
  onPress?: () => void;
  cardWidth: number;
}) => {
  const color = STATUS_COLORS[kpi.status ?? 'info'];
  const isLoading = kpi.value === null;

  const content = (
    <>
      <View style={[styles.topBar, { backgroundColor: color }]} />
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={kpi.icon} size={18} color={color} />
      </View>
      {isLoading ? <Pulse /> : <Text style={[styles.value, { color }]}>{kpi.value}</Text>}
      <Text style={styles.label} numberOfLines={2}>
        {kpi.label}
      </Text>
      {kpi.sub ? <Text style={styles.sub}>{kpi.sub}</Text> : null}
    </>
  );

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      {isPressable ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.cardPressed]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={[styles.card, { width: cardWidth }]}>{content}</View>
      )}
    </Animated.View>
  );
};

export const ModuleKpiStrip = ({ kpis, title, onKpiPress, pressableIndexes = [] }: IProps) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(144, Math.max(126, Math.round((width - 56) / 2.8)));

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            kpi={kpi}
            index={index}
            isPressable={pressableIndexes.includes(index)}
            onPress={onKpiPress ? () => onKpiPress(kpi, index) : undefined}
            cardWidth={cardWidth}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDisabled,
    letterSpacing: 1.1,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  row: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    minHeight: 122,
  },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  skeleton: {
    height: 24,
    width: 52,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },
  value: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    lineHeight: 15,
  },
  sub: { fontSize: 11, color: COLORS.textDisabled, marginTop: 3 },
});
