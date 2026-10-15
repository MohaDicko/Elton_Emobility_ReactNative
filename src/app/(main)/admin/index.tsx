// ─── Écran Administration — Gestion des utilisateurs @GA_USERS ───────────────
// Accessible uniquement aux codes définis dans ADMIN_USER_CODES (constants.ts).
// L'app hash automatiquement les mots de passe — l'admin ne manipule jamais de SHA-256.
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { Text, TextInput, Button, Portal, Modal, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';

import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';

import { WarehouseSelector } from '@shared/components';
import { AppModal } from '@shared/components/ui';
import { router } from 'expo-router';
import {
  useAdminUsers,
  useCreateUser,
  useToggleUserActive,
  useUpdateUserWarehouse,
  useDeleteUser,
  useResetPassword,
} from '../../../features/admin/hooks/useAdmin';
import type { IGaUser } from '../../../features/admin/services/adminService';

// ─── Types formulaires ──────────────────────────────────────────────────────

interface ICreateForm {
  code: string;
  name: string;
  password: string;
  confirmPassword: string;
  isAdmin: boolean;
  warehouseCode: string;
}

interface IResetForm {
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_CREATE_FORM: ICreateForm = {
  code: '',
  name: '',
  password: '',
  confirmPassword: '',
  isAdmin: false,
  warehouseCode: '',
};
const EMPTY_RESET_FORM: IResetForm = { newPassword: '', confirmPassword: '' };

// ─── Validation ─────────────────────────────────────────────────────────────

const validateCreateForm = (form: ICreateForm): Partial<ICreateForm> => {
  const errors: Partial<ICreateForm> = {};
  const normalizedWhs = form.warehouseCode.trim().toUpperCase();
  if (!form.code.trim()) {
    errors.code = 'Code requis';
  } else if (!/^[A-Z0-9_.]+$/i.test(form.code)) {
    errors.code = 'Lettres, chiffres, point et underscore uniquement';
  }
  if (!form.name.trim()) errors.name = 'Nom requis';
  if (!form.isAdmin && !normalizedWhs) errors.warehouseCode = 'Magasin obligatoire pour un non-admin';
  if (form.password.length < 6) errors.password = 'Minimum 6 caractères';
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
  return errors;
};

const validateResetForm = (form: IResetForm): Partial<IResetForm> => {
  const errors: Partial<IResetForm> = {};
  if (form.newPassword.length < 6) errors.newPassword = 'Minimum 6 caractères';
  if (form.newPassword !== form.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
  return errors;
};

// ─── Composant ligne utilisateur ────────────────────────────────────────────

interface IUserRowProps {
  user: IGaUser;
  isTogglingCode: string | null;
  onToggle: (user: IGaUser) => void;
  onEditWarehouse: (user: IGaUser) => void;
  onReset: (user: IGaUser) => void;
  onDelete: (user: IGaUser) => void;
}

const UserRow = ({ user, isTogglingCode, onToggle, onEditWarehouse, onReset, onDelete }: IUserRowProps) => (
  <View style={rowStyles.row}>
    {/* Ligne 1 : identité (pleine largeur) + switch actif/inactif */}
    <View style={rowStyles.topRow}>
      <View style={rowStyles.info}>
        <View style={rowStyles.nameRow}>
          <Text style={rowStyles.code}>{user.Code}</Text>
          {user.U_IsAdmin === 'Y' && <Text style={rowStyles.adminBadge}>● Admin</Text>}
        </View>
        <Text style={rowStyles.name} numberOfLines={1}>{user.Name}</Text>
        {!!user.U_WhsCode && (
          <Text style={rowStyles.warehouse} numberOfLines={1}>Magasin : {user.U_WhsCode}</Text>
        )}
      </View>
      {isTogglingCode === user.Code ? (
        <ActivityIndicator size={20} color={COLORS.primary} style={rowStyles.loader} />
      ) : (
        <Switch
          value={user.U_Active === 'Y'}
          onValueChange={() => onToggle(user)}
          thumbColor={user.U_Active === 'Y' ? COLORS.primary : COLORS.textSecondary}
          trackColor={{ false: '#ddd', true: `${COLORS.primary}55` }}
        />
      )}
    </View>

    {/* Ligne 2 : actions */}
    <View style={rowStyles.actions}>
      <Button
        mode="text"
        icon="home-city-outline"
        onPress={() => onEditWarehouse(user)}
        textColor={COLORS.blue}
        compact
      >
        Magasin
      </Button>
      <Button
        mode="text"
        icon="lock-reset"
        onPress={() => onReset(user)}
        textColor={COLORS.textSecondary}
        compact
      >
        Réinit.
      </Button>
      <Button
        mode="text"
        icon="delete-outline"
        onPress={() => onDelete(user)}
        textColor={COLORS.danger}
        compact
      >
        Suppr.
      </Button>
    </View>
  </View>
);

const rowStyles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: COLORS.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warehouse: {
    fontSize: 12,
    color: COLORS.blue,
    marginTop: 2,
    fontWeight: '600',
  },
  adminBadge: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: -8,
  },
  loader: {
    marginHorizontal: 8,
  },
});

// ─── Écran principal ────────────────────────────────────────────────────────

const AdminScreen = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.isAdmin ?? false;

  // Protection défensive — rediriger si non admin (Redirect est déclaratif et fiable)
  if (!isAdmin) return <Redirect href="/(main)/home" />;

  return <AdminContent />;
};

// ─── Contenu (séparé pour éviter les hooks conditionnels) ────────────────────

const AdminContent = () => {
  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading, isError } = useAdminUsers();
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: toggleActive, isPending: isToggling, variables: toggleVars } = useToggleUserActive();
  const { mutate: updateUserWarehouse, isPending: isUpdatingWarehouse } = useUpdateUserWarehouse();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: resetPwd, isPending: isResetting } = useResetPassword();

  // ── État création ─────────────────────────────────────────────────────────
  const [createVisible, setCreateVisible] = useState(false);
  const [createForm, setCreateForm] = useState<ICreateForm>(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState<Partial<ICreateForm>>({});
  const [showPwd, setShowPwd] = useState(false);

  // ── État toggle confirmation ──────────────────────────────────────────────
  const [toggleTarget, setToggleTarget] = useState<IGaUser | null>(null);

  // ── État edition magasin ─────────────────────────────────────────
  const [warehouseTarget, setWarehouseTarget] = useState<IGaUser | null>(null);
  const [warehouseEditValue, setWarehouseEditValue] = useState('');
  const [warehouseEditError, setWarehouseEditError] = useState<string | null>(null);

  // ── État suppression confirmation ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<IGaUser | null>(null);

  // ── État reset mdp ────────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<IGaUser | null>(null);
  const [resetForm, setResetForm] = useState<IResetForm>(EMPTY_RESET_FORM);
  const [resetErrors, setResetErrors] = useState<Partial<IResetForm>>({});
  const [showResetPwd, setShowResetPwd] = useState(false);

  // ── Handlers création ─────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErrors({});
    setShowPwd(false);
    setCreateVisible(true);
  }, []);

  const handleConfirmCreate = useCallback(() => {
    // Forcer uppercase ici en dernier recours — même si onChangeText échappe au clavier Android
    const normalizedForm = {
      ...createForm,
      code: createForm.code.trim(),
      warehouseCode: createForm.warehouseCode.trim().toUpperCase(),
    };
    setCreateForm(normalizedForm);
    const errors = validateCreateForm(normalizedForm);
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    createUser(
      {
        code: normalizedForm.code,
        name: normalizedForm.name,
        password: normalizedForm.password,
        isAdmin: normalizedForm.isAdmin,
        warehouseCode: normalizedForm.warehouseCode || undefined,
      },
      { onSuccess: () => setCreateVisible(false) }
    );
  }, [createForm, createUser]);

  // ── Handlers suppression ──────────────────────────────────────────────────
  const handleRequestDelete = useCallback((u: IGaUser) => {
    // Vérifier qu'il reste au moins un autre admin si on supprime un admin
    if (u.U_IsAdmin === 'Y') {
      const otherAdmins = users.filter((x) => x.U_IsAdmin === 'Y' && x.Code !== u.Code);
      if (otherAdmins.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Suppression impossible',
          text2: 'Il doit rester au moins un administrateur.',
        });
        return;
      }
    }
    setDeleteTarget(u);
  }, [users]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteUser(
      { code: deleteTarget.Code },
      { onSuccess: () => setDeleteTarget(null) }
    );
  }, [deleteTarget, deleteUser]);

  // ── Handlers toggle ───────────────────────────────────────────────────────
  const handleConfirmToggle = useCallback(() => {
    if (!toggleTarget) return;
    toggleActive(
      { code: toggleTarget.Code, currentActive: toggleTarget.U_Active },
      { onSuccess: () => setToggleTarget(null) }
    );
  }, [toggleTarget, toggleActive]);

  // ── Handlers edition magasin ───────────────────────────────────
  const handleOpenWarehouseEdit = useCallback((u: IGaUser) => {
    setWarehouseTarget(u);
    setWarehouseEditValue((u.U_WhsCode ?? '').trim().toUpperCase());
    setWarehouseEditError(null);
  }, []);

  const handleConfirmWarehouseEdit = useCallback(() => {
    if (!warehouseTarget) return;
    const normalizedWhs = warehouseEditValue.trim().toUpperCase();
    const isAdminTarget = warehouseTarget.U_IsAdmin === 'Y';
    if (!isAdminTarget && !normalizedWhs) {
      setWarehouseEditError('Magasin obligatoire pour un non-admin');
      return;
    }
    updateUserWarehouse(
      {
        code: warehouseTarget.Code,
        warehouseCode: normalizedWhs || undefined,
      },
      {
        onSuccess: () => {
          setWarehouseTarget(null);
          setWarehouseEditValue('');
          setWarehouseEditError(null);
        },
      }
    );
  }, [warehouseTarget, warehouseEditValue, updateUserWarehouse]);

  // ── Handlers reset mdp ────────────────────────────────────────────────────
  const handleOpenReset = useCallback((u: IGaUser) => {
    setResetTarget(u);
    setResetForm(EMPTY_RESET_FORM);
    setResetErrors({});
    setShowResetPwd(false);
  }, []);

  const handleConfirmReset = useCallback(() => {
    if (!resetTarget) return;
    const errors = validateResetForm(resetForm);
    if (Object.keys(errors).length > 0) {
      setResetErrors(errors);
      return;
    }
    resetPwd(
      { code: resetTarget.Code, newPassword: resetForm.newPassword },
      { onSuccess: () => setResetTarget(null) }
    );
  }, [resetTarget, resetForm, resetPwd]);

  // ── Handlers déconnexion ──────────────────────────────────────────────────
  const logout = useAuthStore((s) => s.logout);

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.headerBrand, { backgroundColor: COLORS.purple }]} />
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.actionButtonPressed]}
            hitSlop={8}
            accessibilityLabel="Retour"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.textPrimary} />
          </Pressable>
          <View style={[styles.headerIconWrap, { backgroundColor: `${COLORS.purple}18` }]}>
            <MaterialCommunityIcons name="account-cog-outline" size={22} color={COLORS.purple} />
          </View>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Administration</Text>
            <Text style={styles.headerSub}>
              {isLoading ? '...' : `${users.length} utilisateur${users.length > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/admin/activite')}
            style={styles.activityButton}
            hitSlop={8}
            accessibilityLabel="Historique d'activité"
          >
            <MaterialCommunityIcons name="history" size={22} color={COLORS.primary} />
          </Pressable>
          <Pressable
            onPress={handleOpenCreate}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            hitSlop={4}
            accessibilityLabel="Nouvel utilisateur"
          >
            <MaterialCommunityIcons name="account-plus" size={22} color={COLORS.white} />
          </Pressable>
          <Pressable
            onPress={confirmLogout}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.actionButtonPressed]}
            hitSlop={8}
            accessibilityLabel="Se déconnecter"
          >
            <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
          </Pressable>
        </View>
      </View>

      {/* ── Liste ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : isError ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.danger} />
          <Text style={styles.errorText}> Impossible de charger les utilisateurs</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.Code}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              isTogglingCode={isToggling && toggleVars?.code === item.Code ? item.Code : null}
              onToggle={setToggleTarget}
              onEditWarehouse={handleOpenWarehouseEdit}
              onReset={handleOpenReset}
              onDelete={handleRequestDelete}
            />
          )}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={styles.list}
        />
      )}

      {/* ── Modal création ──────────────────────────────────────────── */}
      <Portal>
        <Modal
          visible={createVisible}
          onDismiss={() => setCreateVisible(false)}
          contentContainerStyle={styles.formModal}
        >
          <Text style={styles.modalTitle}>Nouvel utilisateur</Text>

          <TextInput
            label="Code (identifiant de connexion)"
            value={createForm.code}
            onChangeText={(v) => {
              setCreateErrors((e) => ({ ...e, code: undefined }));
              setCreateForm((f) => ({ ...f, code: v }));
            }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="account-key" color={COLORS.primary} />}
            autoCapitalize="none"
            autoCorrect={false}
            error={!!createErrors.code}
          />
          {createErrors.code ? <Text style={styles.fieldError}>{createErrors.code}</Text> : null}

          <TextInput
            label="Nom affiché"
            value={createForm.name}
            onChangeText={(v) => {
              setCreateErrors((e) => ({ ...e, name: undefined }));
              setCreateForm((f) => ({ ...f, name: v }));
            }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="account" color={COLORS.primary} />}
            autoCapitalize="sentences"
            error={!!createErrors.name}
          />
          {createErrors.name ? <Text style={styles.fieldError}>{createErrors.name}</Text> : null}

          <WarehouseSelector
            label={createForm.isAdmin ? 'Magasin attribue (optionnel)' : 'Magasin attribue'}
            value={createForm.warehouseCode}
            onChange={(v) => {
              setCreateErrors((e) => ({ ...e, warehouseCode: undefined }));
              setCreateForm((f) => ({ ...f, warehouseCode: v.trim().toUpperCase() }));
            }}
            error={createErrors.warehouseCode}
          />
          {createForm.isAdmin && createForm.warehouseCode.length > 0 ? (
            <Button
              mode="text"
              icon="close-circle-outline"
              onPress={() => setCreateForm((f) => ({ ...f, warehouseCode: '' }))}
              textColor={COLORS.textSecondary}
            >
              Retirer le magasin
            </Button>
          ) : null}

          <TextInput
            label="Mot de passe"
            value={createForm.password}
            onChangeText={(v) => {
              setCreateErrors((e) => ({ ...e, password: undefined }));
              setCreateForm((f) => ({ ...f, password: v }));
            }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock" color={COLORS.primary} />}
            right={
              <TextInput.Icon
                icon={showPwd ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPwd(!showPwd)}
                color={COLORS.textSecondary}
              />
            }
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            error={!!createErrors.password}
          />
          {createErrors.password ? <Text style={styles.fieldError}>{createErrors.password}</Text> : null}

          <TextInput
            label="Confirmer le mot de passe"
            value={createForm.confirmPassword}
            onChangeText={(v) => {
              setCreateErrors((e) => ({ ...e, confirmPassword: undefined }));
              setCreateForm((f) => ({ ...f, confirmPassword: v }));
            }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock-check" color={COLORS.primary} />}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            error={!!createErrors.confirmPassword}
          />
          {createErrors.confirmPassword ? (
            <Text style={styles.fieldError}>{createErrors.confirmPassword}</Text>
          ) : null}

          <View style={styles.adminToggleRow}>
            <Text style={styles.adminToggleLabel}>Droits administrateur</Text>
            <Switch
              value={createForm.isAdmin}
              onValueChange={(v) => {
                setCreateErrors((e) => ({ ...e, warehouseCode: undefined }));
                setCreateForm((f) => ({ ...f, isAdmin: v }));
              }}
              thumbColor={createForm.isAdmin ? COLORS.primary : COLORS.textSecondary}
              trackColor={{ false: '#ddd', true: `${COLORS.primary}55` }}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setCreateVisible(false)}
              style={styles.modalBtn}
              textColor={COLORS.textSecondary}
            >
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmCreate}
              loading={isCreating}
              disabled={isCreating}
              style={styles.modalBtn}
              buttonColor={COLORS.primary}
            >
              Créer
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* ── Modal edition magasin utilisateur ──────────────────────── */}
      <Portal>
        <Modal
          visible={!!warehouseTarget}
          onDismiss={() => {
            setWarehouseTarget(null);
            setWarehouseEditError(null);
          }}
          contentContainerStyle={styles.formModal}
        >
          <Text style={styles.modalTitle}>Modifier magasin utilisateur</Text>
          <Text style={styles.resetSubtitle}>
            {warehouseTarget?.Name} ({warehouseTarget?.Code})
          </Text>

          <WarehouseSelector
            label={warehouseTarget?.U_IsAdmin === 'Y' ? 'Magasin (optionnel pour admin)' : 'Magasin'}
            value={warehouseEditValue}
            onChange={(v) => {
              setWarehouseEditError(null);
              setWarehouseEditValue(v.trim().toUpperCase());
            }}
            error={warehouseEditError ?? undefined}
          />
          {warehouseTarget?.U_IsAdmin === 'Y' && warehouseEditValue.length > 0 ? (
            <Button
              mode="text"
              icon="close-circle-outline"
              onPress={() => {
                setWarehouseEditError(null);
                setWarehouseEditValue('');
              }}
              textColor={COLORS.textSecondary}
            >
              Retirer le magasin
            </Button>
          ) : null}

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setWarehouseTarget(null);
                setWarehouseEditError(null);
              }}
              style={styles.modalBtn}
              textColor={COLORS.textSecondary}
            >
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmWarehouseEdit}
              loading={isUpdatingWarehouse}
              disabled={isUpdatingWarehouse}
              style={styles.modalBtn}
              buttonColor={COLORS.primary}
            >
              Enregistrer
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* ── Modal confirmation suppression ─────────────────────────── */}
      <AppModal
        visible={!!deleteTarget}
        title="Supprimer l'utilisateur"
        message={`Supprimer définitivement "${deleteTarget?.Name}" (${deleteTarget?.Code}) ?\nCette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Modal confirmation toggle ─────────────────────────────── */}
      <AppModal
        visible={!!toggleTarget}
        title={toggleTarget?.U_Active === 'Y' ? 'Désactiver le compte' : 'Activer le compte'}
        message={
          toggleTarget?.U_Active === 'Y'
            ? `Désactiver "${toggleTarget?.Name}" ?\nL'utilisateur ne pourra plus se connecter.`
            : `Activer "${toggleTarget?.Name}" ?`
        }
        confirmLabel={toggleTarget?.U_Active === 'Y' ? 'Désactiver' : 'Activer'}
        danger={toggleTarget?.U_Active === 'Y'}
        loading={isToggling}
        onConfirm={handleConfirmToggle}
        onCancel={() => setToggleTarget(null)}
      />

      {/* ── Modal reset mot de passe ──────────────────────────────── */}
      <Portal>
        <Modal
          visible={!!resetTarget}
          onDismiss={() => setResetTarget(null)}
          contentContainerStyle={styles.formModal}
        >
          <Text style={styles.modalTitle}>Réinitialiser le mot de passe</Text>
          <Text style={styles.resetSubtitle}>{resetTarget?.Name} ({resetTarget?.Code})</Text>

          <TextInput
            label="Nouveau mot de passe"
            value={resetForm.newPassword}
            onChangeText={(v) => {
              setResetErrors((e) => ({ ...e, newPassword: undefined }));
              setResetForm((f) => ({ ...f, newPassword: v }));
            }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock" color={COLORS.primary} />}
            right={
              <TextInput.Icon
                icon={showResetPwd ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowResetPwd(!showResetPwd)}
                color={COLORS.textSecondary}
              />
            }
            secureTextEntry={!showResetPwd}
            autoCapitalize="none"
            error={!!resetErrors.newPassword}
          />
          {resetErrors.newPassword ? (
            <Text style={styles.fieldError}>{resetErrors.newPassword}</Text>
          ) : null}

          <TextInput
            label="Confirmer le nouveau mot de passe"
            value={resetForm.confirmPassword}
            onChangeText={(v) => {
              setResetErrors((e) => ({ ...e, confirmPassword: undefined }));
              setResetForm((f) => ({ ...f, confirmPassword: v }));
            }}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            left={<TextInput.Icon icon="lock-check" color={COLORS.primary} />}
            secureTextEntry={!showResetPwd}
            autoCapitalize="none"
            error={!!resetErrors.confirmPassword}
          />
          {resetErrors.confirmPassword ? (
            <Text style={styles.fieldError}>{resetErrors.confirmPassword}</Text>
          ) : null}

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setResetTarget(null)}
              style={styles.modalBtn}
              textColor={COLORS.textSecondary}
            >
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmReset}
              loading={isResetting}
              disabled={isResetting}
              style={styles.modalBtn}
              buttonColor={COLORS.danger}
            >
              Réinitialiser
            </Button>
          </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
  },

  // En-tête
  header: {
    backgroundColor: COLORS.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  headerBrand: { height: 4 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  activityButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '12',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.border}40`,
  },
  logoutButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.danger}14`,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  // Liste
  list: {
    paddingBottom: 32,
  },
  loader: {
    marginTop: 60,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },

  // Modaux
  formModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  adminToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  adminToggleLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  resetSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  input: {
    marginBottom: 4,
    backgroundColor: COLORS.surface,
  },
  inputOutline: {
    borderRadius: 10,
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.danger,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
  },
});

export default AdminScreen;
