import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';
import { APP_ASSETS } from '@core/constants/assets';
import { useDashboardKpis } from '@features/home/hooks/useDashboardKpis';
import { WarehouseSelector } from '@shared/components';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IKpiDef {
  key: string;
  label: string;
  sub: string;
  icon: IconName;
  color: string;
  route: string;
}

interface IQuickAction {
  key: string;
  label: string;
  icon: IconName;
  route: string;
  color: string;
}

const KPI_DEFS: IKpiDef[] = [
  {
    key: 'bcOpen',
    label: 'BC en attente',
    sub: 'A receptionner',
    icon: 'clock-outline',
    color: COLORS.orange,
    route: '/(main)/reception',
  },
  {
    key: 'exitsMonth',
    label: 'Sorties du mois',
    sub: 'Casse / Perimes',
    icon: 'alert-circle-outline',
    color: COLORS.danger,
    route: '/(main)/sortie',
  },
  {
    key: 'ruptureCount',
    label: 'Articles en rupture',
    sub: 'Stock <= 0',
    icon: 'package-variant-remove',
    color: COLORS.danger,
    route: '/(main)/commande',
  },
  {
    key: 'inventaireOpen',
    label: 'Inventaires ouverts',
    sub: 'En cours de comptage',
    icon: 'clipboard-list-outline',
    color: COLORS.blue,
    route: '/(main)/inventaire',
  },
];

const QUICK_ACTIONS: IQuickAction[] = [
  { key: 'commande', label: 'Commande', icon: 'cart-outline', route: '/(main)/commande', color: COLORS.primary },
  { key: 'reception', label: 'Reception', icon: 'inbox-arrow-down-outline', route: '/(main)/reception', color: COLORS.blue },
  { key: 'sortie', label: 'Sortie', icon: 'archive-arrow-up-outline', route: '/(main)/sortie', color: COLORS.orange },
  { key: 'inventaire', label: 'Inventaire', icon: 'clipboard-list-outline', route: '/(main)/inventaire', color: COLORS.primary },
  { key: 'prix', label: 'Prix', icon: 'tag-multiple-outline', route: '/(main)/prix', color: COLORS.warning },
  { key: 'etiquettes', label: 'Etiquettes', icon: 'printer-outline', route: '/(main)/etiquettes', color: COLORS.pink },
  { key: 'activite', label: 'Activite', icon: 'history', route: '/(main)/activite', color: COLORS.purple },
];

const initials = (name?: string) =>
  name ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'U';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon apres-midi';
  return 'Bonsoir';
};

const SkeletonPulse = ({ style }: { style: object }) => {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 800 }), -1, true);
  }, [opacity]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, anim]} />;
};

const KpiCard = ({
  def,
  value,
  isLoading,
  delay,
  cardWidth,
}: {
  def: IKpiDef;
  value: number | null;
  isLoading: boolean;
  delay: number;
  cardWidth: number;
}) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <Pressable
      onPress={() => router.push(def.route as never)}
      style={({ pressed }) => [styles.kpiCard, { width: cardWidth }, pressed && styles.pressed]}
    >
      <View style={[styles.kpiBar, { backgroundColor: def.color }]} />
      <View style={styles.kpiTopRow}>
        <View style={[styles.kpiIconWrap, { backgroundColor: `${def.color}18` }]}>
          <MaterialCommunityIcons name={def.icon} size={18} color={def.color} />
        </View>
        {isLoading ? (
          <SkeletonPulse style={styles.kpiSkeleton} />
        ) : (
          <Text style={[styles.kpiValue, { color: def.color }]}>
            {value === null ? '—' : value}
          </Text>
        )}
      </View>
      <Text style={styles.kpiLabel}>{def.label}</Text>
      <Text style={styles.kpiSub}>{def.sub}</Text>
    </Pressable>
  </Animated.View>
);

const QuickAction = ({ item, index, iconSize }: { item: IQuickAction; index: number; iconSize: number }) => {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const d = 400 + index * 50;
    scale.value = withDelay(d, withSpring(1, { damping: 14, stiffness: 130 }));
    opacity.value = withDelay(d, withTiming(1, { duration: 220 }));
  }, [index, opacity, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={() => router.push(item.route as never)}
        style={({ pressed }) => [{ alignItems: 'center', width: iconSize + 24 }, pressed && styles.pressed]}
      >
        <View style={[styles.quickIconBg, { backgroundColor: item.color, width: iconSize, height: iconSize }]}>
          <MaterialCommunityIcons name={item.icon} size={iconSize * 0.46} color={COLORS.white} />
        </View>
        <Text style={styles.quickLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const HomeScreen = () => {
  const [kpiWarehouse, setKpiWarehouse] = useState('');
  const { user, logout } = useAuthStore();
  const { kpis, loading: kpisLoading, refresh, refreshing } = useDashboardKpis(kpiWarehouse);
  const { width: screenWidth } = useWindowDimensions();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) {
        handleLogout();
      }
      return;
    }
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const isAdmin = user?.isAdmin ?? false;
  const isTablet = screenWidth >= 768;
  const kpiCardWidth = Math.floor((screenWidth - 52) / 2);
  const quickSize = isTablet ? 68 : 56;

  const kpiValues = useMemo(
    () =>
      KPI_DEFS.map((def) => ({
        def,
        value: kpis[def.key as keyof typeof kpis],
      })),
    [kpis]
  );

  const showRuptureBanner =
    typeof kpis.ruptureCount === 'number' && kpis.ruptureCount > 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View style={styles.brandBar} />
          <View style={styles.headerInner}>
            <Image source={APP_ASSETS.logo} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerMid}>
              <Text style={styles.headerGreeting}>{greeting()},</Text>
              <Text style={styles.headerName}>{user?.userName ?? 'Utilisateur'}</Text>
              <Text style={styles.headerDb}>{user?.companyDB ?? ''}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user?.userName)}</Text>
              </View>
              <TouchableOpacity
                onPress={confirmLogout}
                style={styles.headerLogoutBtn}
                activeOpacity={0.7}
                accessibilityLabel="Se déconnecter"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Filtre magasin (admin seulement) ───────────────────────────── */}
        {isAdmin && (
          <View style={styles.kpiFilterCard}>
            <WarehouseSelector
              label="Filtrer les KPIs"
              value={kpiWarehouse}
              onChange={(v) => setKpiWarehouse(v.trim().toUpperCase())}
              allowAllOption
              allOptionLabel="Tous les entrepots"
            />
            {kpiWarehouse.length > 0 && (
              <TouchableOpacity
                style={styles.resetKpiFilter}
                onPress={() => setKpiWarehouse('')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="filter-remove-outline" size={15} color={COLORS.primary} />
                <Text style={styles.resetKpiFilterText}>Tous les entrepots</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Bannière rupture ────────────────────────────────────────────── */}
        {showRuptureBanner && (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Pressable
              style={styles.ruptureBanner}
              onPress={() => router.push('/(main)/commande' as never)}
            >
              <MaterialCommunityIcons name="alert" size={16} color={COLORS.white} />
              <Text style={styles.ruptureBannerText}>
                {kpis.ruptureCount} article{(kpis.ruptureCount ?? 0) > 1 ? 's' : ''} en rupture dans votre magasin
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.white} />
            </Pressable>
          </Animated.View>
        )}

        {/* ── KPIs 2×2 ────────────────────────────────────────────────────── */}
        <Animated.Text entering={FadeIn.delay(100)} style={styles.sectionLabel}>
          APERCU DU JOUR
        </Animated.Text>

        <View style={styles.kpiGrid}>
          {kpiValues.map(({ def, value }, i) => (
            <KpiCard
              key={def.key}
              def={def}
              value={value}
              isLoading={kpisLoading}
              delay={140 + i * 60}
              cardWidth={kpiCardWidth}
            />
          ))}
        </View>

        {/* ── Actions rapides ─────────────────────────────────────────────── */}
        <Animated.Text entering={FadeIn.delay(350)} style={styles.sectionLabel}>
          ACCES RAPIDE
        </Animated.Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {QUICK_ACTIONS.map((item, index) => (
            <QuickAction key={item.key} item={item} index={index} iconSize={quickSize} />
          ))}
        </ScrollView>

        {/* ── Hero commande ───────────────────────────────────────────────── */}
        <Animated.Text entering={FadeIn.delay(500)} style={styles.sectionLabel}>
          MODULE PRINCIPAL
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(530).springify()} style={styles.heroSection}>
          <Pressable
            onPress={() => router.push('/(main)/commande' as never)}
            style={({ pressed }) => [styles.heroCard, pressed && styles.pressed]}
          >
            <View style={[styles.heroIconBg, { backgroundColor: `${COLORS.primary}15` }]}>
              <MaterialCommunityIcons name="cart-outline" size={30} color={COLORS.primary} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Commande produits</Text>
              <Text style={styles.heroSub}>Stocks · Ventes hebdo · Suggestions</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textDisabled} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 30 },

  header: {
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 6,
  },
  brandBar: { height: 4, backgroundColor: COLORS.primary },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerLogo: { width: 60, height: 36 },
  headerMid: { flex: 1 },
  headerGreeting: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  headerName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  headerDb: { fontSize: 10, color: COLORS.textDisabled, marginTop: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${COLORS.danger}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  kpiFilterCard: {
    marginHorizontal: 20,
    marginBottom: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  resetKpiFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  resetKpiFilterText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  ruptureBanner: {
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: COLORS.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruptureBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDisabled,
    letterSpacing: 1.1,
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  kpiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 118,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
  },
  kpiBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiSkeleton: { height: 26, width: 50, borderRadius: 8, backgroundColor: COLORS.border },
  kpiValue: { fontSize: 30, lineHeight: 34, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', lineHeight: 15 },
  kpiSub: { fontSize: 11, color: COLORS.textDisabled, marginTop: 3 },

  quickRow: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  quickIconBg: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 13,
  },

  heroSection: { paddingHorizontal: 20 },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  heroIconBg: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  heroSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },

  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

export default HomeScreen;
