import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IModule {
  key: string;
  title: string;
  sub: string;
  icon: IconName;
  color: string;
  route: string;
  adminOnly?: boolean;
}

const MODULES: IModule[] = [
  {
    key: 'sortie',
    title: 'Sortie',
    sub: 'Casse · Périmés · Économats',
    icon: 'export',
    color: COLORS.danger,
    route: '/(main)/sortie',
  },
  {
    key: 'etiquettes',
    title: 'Etiquettes',
    sub: 'Impression mobile A4',
    icon: 'printer-outline',
    color: COLORS.pink,
    route: '/(main)/etiquettes',
  },
  {
    key: 'prix',
    title: 'Liste de Prix',
    sub: 'Tarifs boutique · Synchronisation SAP',
    icon: 'tag-multiple-outline',
    color: COLORS.orange,
    route: '/(main)/prix',
  },
  {
    key: 'activite',
    title: 'Mon Activite',
    sub: 'Journal des operations',
    icon: 'history',
    color: COLORS.blue,
    route: '/(main)/activite',
  },
  {
    key: 'admin',
    title: 'Administration',
    sub: 'Gestion des utilisateurs',
    icon: 'account-cog-outline',
    color: COLORS.purple,
    route: '/(main)/admin',
    adminOnly: true,
  },
];

const ModuleCard = ({ mod, delay }: { mod: IModule; delay: number }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.cardWrap}>
    <Pressable
      onPress={() => router.push(mod.route as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${mod.color}18` }]}>
        <MaterialCommunityIcons name={mod.icon} size={28} color={mod.color} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{mod.title}</Text>
        <Text style={styles.cardSub}>{mod.sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textDisabled} />
    </Pressable>
  </Animated.View>
);

const PlusScreen = () => {
  const { user, logout } = useAuthStore();
  const isAdmin = user?.isAdmin ?? false;

  const visible = MODULES.filter((m) => !m.adminOnly || isAdmin);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerBrand} />
        <View style={styles.headerContent}>
          <View style={styles.headerAvatar}>
            <Text style={styles.avatarText}>
              {(user?.userName ?? 'U').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{user?.userName ?? 'Utilisateur'}</Text>
            <Text style={styles.headerCode}>{user?.userCode ?? ''}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>MODULES</Text>

        {visible.map((mod, i) => (
          <ModuleCard key={mod.key} mod={mod} delay={60 + i * 60} />
        ))}

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Deconnexion</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerBrand: { height: 4, backgroundColor: COLORS.primary },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  headerName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  headerCode: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDisabled,
    letterSpacing: 1.1,
    marginBottom: 14,
  },

  cardWrap: { marginBottom: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  logoutBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF2F2',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.danger },

  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

export default PlusScreen;
