# ELTON OIL COMPANY — Application Mobilité SAP Business One
## Cahier des Charges & État des Lieux de l'Implémentation

> **Fiche Mémo Projet — Pour développeurs et assistants IA**  
> Ce document résume les spécifications fonctionnelles, l'état d'implémentation de chaque module et la cartographie technique du projet sans nécessiter de parcourir l'ensemble de la base de code.

---

### 1. Vue d'ensemble du Projet
- **Client :** ELTON OIL COMPANY
- **Application :** Application mobile métier pour la gestion des opérations en magasin, boutique et station-service, interconnectée en temps réel avec l'ERP **SAP Business One**.
- **Stack technique :** React Native (0.83), Expo (SDK 55), Expo Router (v55), TypeScript (5.9), TanStack React Query (v5), Zustand (v5), React Native Paper (v5).
- **Backend ERP :** SAP Business One Service Layer (OData v3 / REST) sur port 50000.

---

### 2. Spécifications Fonctionnelles & État de Réalisation

| Module CDC | Libellé | Statut Mobile | Détail de l'implémentation | Fichiers clés |
| :--- | :--- | :---: | :--- | :--- |
| **Module 1** | **Gestion des Utilisateurs & Accès** | ✅ **100% Fait** | - Distinction profil Administrateur et Utilisateur Standard.<br>- Création, paramétrage et réinitialisation des mots de passe.<br>- Affectation d'un magasin unique limitant strictement les données.<br>- Verrouillage de sécurité strict de la route `/admin` (redirection automatique des non-admins). | [`src/app/(main)/admin/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/admin/)<br>[`src/features/admin/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/admin/) |
| **Module 2** | **Suivi des Activités** | ✅ **100% Fait** | - Administrateur : visibilité sur l'ensemble des activités de tous les utilisateurs.<br>- Utilisateur standard : visibilité restreinte à ses propres opérations.<br>- Traçabilité automatique des commandes, réceptions, sorties et changements de prix. | [`src/app/(main)/activite/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/activite/)<br>[`src/features/activite/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/activite/) |
| **Module 3** | **Commandes Fournisseurs** | ✅ **100% Fait** | - Sélection du tiers fournisseur dans SAP.<br>- Scan de code-barres et recherche par code/libellé.<br>- Affichage complet : code SAP, description, code-barres, groupe, rayon, PCB.<br>- Saisie quantités et création automatique du bon de commande (`PurchaseOrders`). | [`src/app/(main)/commande/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/commande/)<br>[`src/features/commande/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/commande/) |
| **Module 4** | **Réception de Marchandises** | ✅ **100% Fait** | - Commandes d'achat ouvertes filtrées automatiquement sur le magasin de l'utilisateur.<br>- Traitement de réceptions totales ou partielles.<br>- Création automatique de la réception (`PurchaseDeliveryNotes`) basée sur la commande d'achat. | [`src/app/(main)/reception/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/reception/)<br>[`src/features/reception/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/reception/) |
| **Module 5** | **Sortie de Marchandises** | ✅ **100% Fait** | - Mouvements de sortie de stock bridés au magasin de l'utilisateur.<br>- **Motif de sortie obligatoire** (`CASSE`, `PERIME`, `ECONOMAT`, etc.).<br>- Création automatique du document SAP (`InventoryGenExits`). | [`src/app/(main)/sortie/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/sortie/)<br>[`src/features/sortie/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/sortie/) |
| **Module 6** | **Gestion des Inventaires** | ✅ **100% Fait** | - Documents d'inventaire spécifiques au magasin.<br>- **Affichage dynamique strict** : seuls les articles déjà comptés apparaissent à l'ouverture (avec sélecteur d'onglets *Comptés* / *Tous*).<br>- **Recherche et scan restreints** : tout article hors document est immédiatement bloqué.<br>- **Règle de doublons** : choix bloquant entre *Remplacer* ou *Additionner* la quantité.<br>- Validation manuelle explicite vers SAP. | [`src/app/(main)/inventaire/[docEntry].tsx`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/inventaire/[docEntry].tsx)<br>[`src/features/inventaire/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/inventaire/) |
| **Module 7** | **Étiquettes de Prix (Mobile)** | ✅ **100% Fait** | - Sélection des articles par scan ou recherche textuelle.<br>- Saisie du nombre d'exemplaires souhaité par article.<br>- Génération d'une planche standard A4 de 21 étiquettes (3 colonnes × 7 rangées).<br>- Impression directe et partage PDF. | [`src/app/(main)/etiquettes/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/etiquettes/)<br>[`src/features/etiquettes/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/etiquettes/) |
| **Module 8** | **Liste de Prix (Mobile)** | ✅ **100% Fait** | - Modification des prix de vente depuis l'application.<br>- Application en fonction de la liste de prix rattachée à la boutique/magasin.<br>- Synchronisation automatique des nouveaux tarifs dans SAP B1 via `PATCH /Items('ItemCode')` (`ItemPrices`).<br>- Comparatif ancien/nouveau prix avec calcul d'écart en % et F CFA. | [`src/app/(main)/prix/index.tsx`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/app/(main)/prix/index.tsx)<br>[`src/features/prix/`](file:///c:/Users/tinkpad/Desktop/Projet%20SAFIR/App-Mobile-Global-Action/src/features/prix/) |
| **Module 9** | **Add-On SAP Back-Office (PC)** | ⚪ *Hors Mobile* | Développé séparément en C# / .NET / SAP SDK pour l'interface de bureau SAP B1 Desktop (sélection croisée par format, grille tarifaire, groupe d'articles, plage Du/Au). | *Projet externe Back-Office SAP* |

---

### 3. Organisation de l'Arborescence du Code

```text
App-Mobile-Global-Action/
├── src/
│   ├── app/                      # Routes Expo Router (Navigation)
│   │   ├── (auth)/login.tsx      # Authentification (support mode démo et comptes SAP)
│   │   ├── (main)/
│   │   │   ├── home.tsx          # Tableau de bord magasin & KPIs
│   │   │   ├── commande/         # Module 3 : Commandes Fournisseurs
│   │   │   ├── reception/        # Module 4 : Réceptions Marchandises
│   │   │   ├── sortie/           # Module 5 : Sorties de stock
│   │   │   ├── inventaire/       # Module 6 : Inventaires terrain
│   │   │   ├── etiquettes/       # Module 7 : Impression étiquettes A4
│   │   │   ├── prix/             # Module 8 : Mise à jour des Prix de vente
│   │   │   ├── activite/         # Module 2 : Journal d'activité
│   │   │   ├── admin/            # Module 1 : Gestion des utilisateurs
│   │   │   └── plus.tsx          # Menu des modules complémentaires
│   ├── core/
│   │   ├── api/                  # Axios apiClient et ENDPOINTS SAP Service Layer
│   │   ├── auth/                 # authStore Zustand & logique de connexion
│   │   └── config/               # constants.ts & theme.ts
│   ├── features/                 # Logique métier, services et hooks React Query
│   │   ├── commande/
│   │   ├── reception/
│   │   ├── sortie/
│   │   ├── inventaire/
│   │   ├── etiquettes/
│   │   ├── prix/                 # prixService.ts, usePrix.ts, types.ts
│   │   ├── activite/
│   │   └── admin/
│   └── shared/                   # Composants réutilisables (ArticleSearchBar, BarcodeScanner, WarehouseSelector, etc.)
├── CAHIER_DES_CHARGES_ELTON.md   # Ce document de référence
├── README.md                     # Documentation technique générale
└── package.json                  # Dépendances et scripts Expo
```

---

### 4. Identifiants & Configuration pour Tests Rapides
- **Mode Local / Démo (sans serveur SAP requis) :**
  - **Administrateur :** Identifiant `admin` / Mot de passe `admin` (accès complet aux 8 modules).
  - **Opérateur Magasin :** Identifiant `demo` / Mot de passe `demo` (accès restreint au magasin `01`).
- **Mode Connecté SAP Production :**
  - Configuré via `.env` : `EXPO_PUBLIC_SAP_BASE_URL`, `EXPO_PUBLIC_SAP_COMPANY_DB`, `EXPO_PUBLIC_SAP_USER`, `EXPO_PUBLIC_SAP_PASSWORD`.
