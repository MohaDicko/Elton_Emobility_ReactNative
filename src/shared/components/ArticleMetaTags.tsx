// ─── ArticleMetaTags — Famille · S/Famille · PCB · UdM ───────────────────────
// Affiche les caractéristiques SAP de l'article sous forme de mini stat-cards.
// Chaque card : cercle icône coloré + valeur + label.
// Cards masquées si la valeur SAP est null ou vide.
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@core/config/theme';
import type { IArticle } from '@shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IMetaCard {
  key: string;
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface IProps {
  article: IArticle;
}

// ─── Composant ───────────────────────────────────────────────────────────────

const ArticleMetaTags = ({ article }: IProps) => {
  // Construire les cards depuis les champs SAP — masquer si null/vide
  const cards: IMetaCard[] = [
    {
      key: 'rayon',
      label: 'RAYON',
      value: article.U_rayon ?? '',
      icon: 'store-outline',
      color: COLORS.primary,
    },
    {
      key: 'sousfam',
      label: 'S/FAMILLE',
      value: article.U_sous_fam ?? '',
      icon: 'tag-outline',
      color: COLORS.orange,
    },
    {
      key: 'pcb',
      label: 'PCB',
      value: article.U_PCB ? `×${article.U_PCB}` : '',
      icon: 'package-variant-closed',
      color: COLORS.blue,
    },
    {
      key: 'udm',
      label: 'UdM',
      value: article.InventoryUOM ?? '',
      icon: 'scale-balance',
      color: COLORS.purple,
    },
  ].filter((c) => c.value.trim() !== '');

  if (cards.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {cards.map((card) => (
        <View key={card.key} style={styles.card}>
          {/* Cercle icône */}
          <View style={[styles.iconCircle, { backgroundColor: card.color + '22' }]}>
            <MaterialCommunityIcons name={card.icon as any} size={16} color={card.color} />
          </View>

          {/* Valeur */}
          <Text
            style={styles.value}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {card.value}
          </Text>

          {/* Label */}
          <Text style={styles.label}>{card.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 1,
    paddingBottom: 2,
  },
  card: {
    width: 84,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
    // Ombre légère
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  label: {
    fontSize: 9,
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});

export default ArticleMetaTags;
