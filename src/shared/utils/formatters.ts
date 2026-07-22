// ─── Fonctions de formatage (dates, nombres, monnaie) ────────────────────────
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

/** Formate une date en dd/MM/yyyy */
export const formatDate = (date: string | Date, pattern = 'dd/MM/yyyy'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: fr });
};

/** Formate une date avec heure en dd/MM/yyyy HH:mm */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

/** Formate une date au format SAP yyyy-MM-dd */
export const formatSapDate = (date: Date = new Date()): string => {
  return format(date, 'yyyy-MM-dd');
};

/** Formate un nombre avec max 2 décimales */
export const formatQuantity = (qty: number): string => {
  return Number.isInteger(qty) ? qty.toString() : qty.toFixed(2);
};

/** Formate un montant en devise (défaut XOF — Franc CFA) */
export const formatCurrency = (amount: number, currency = 'XOF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Retourne la plage de dates pour les N dernières semaines
 * (utilisé pour le calcul des ventes moyennes hebdo)
 */
export const getWeekRange = (weeksAgo: number): { dateFrom: string; dateTo: string } => {
  const now = new Date();
  const from = startOfWeek(subWeeks(now, weeksAgo), { weekStartsOn: 1 });
  const to = endOfWeek(now, { weekStartsOn: 1 });
  return {
    dateFrom: formatSapDate(from),
    dateTo: formatSapDate(to),
  };
};
