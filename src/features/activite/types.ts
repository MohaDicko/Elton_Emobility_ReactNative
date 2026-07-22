export type ActiviteTypeDocT =
  | 'Commande'
  | 'Reception'
  | 'Sortie'
  | 'Entree'
  | 'Transfert'
  | 'Inventaire'
  | 'R\u00E9ception'
  | 'Entr\u00E9e'
  | 'RÃ©ception'
  | 'EntrÃ©e';

export interface IActiviteItem {
  Code: string;
  U_TypeDoc: ActiviteTypeDocT;
  U_DocNum: string;
  U_DocEntry?: number;
  U_DocDate: string;
  U_Tiers: string;
  U_UtilisateurMob: string;
}

export interface IActivityLog {
  Name: string;
  U_TypeDoc: string;
  U_DocNum: string;
  U_DocEntry: number;
  U_DocDate: string;
  U_Tiers: string;
  U_UtilisateurMob: string;
}
