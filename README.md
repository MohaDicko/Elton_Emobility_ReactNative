# GlobalActionMobile

Application mobile Expo / React Native pour les operations magasin connectees a SAP Business One Service Layer.

## Fonctionnalites principales

- Authentification utilisateur mobile via SAP.
- Tableau de bord magasin avec KPIs.
- Commande produits et suggestions basees sur stock / ventes.
- Reception fournisseurs.
- Sorties de stock.
- Inventaire terrain avec scan, comptage et mise a jour des lignes SAP.
- Impression et partage PDF des etiquettes prix.
- Activite utilisateur et ecrans d'administration.

## Prerequis

- Node.js compatible avec Expo SDK 55.
- npm.
- Compte Expo / EAS configure pour produire les APK.
- Acces reseau au SAP Service Layer cible.

Installer les dependances :

```bash
npm install
```

## Configuration

L'application lit sa configuration depuis des variables d'environnement Expo.

Creer un fichier local `.env` ou `.env.production` non versionne avec les valeurs suivantes :

```bash
EXPO_PUBLIC_SAP_BASE_URL=https://serveur-sap:50000/b1s/v1
EXPO_PUBLIC_SAP_COMPANY_DB=BASE_SAP
EXPO_PUBLIC_SAP_USER=UTILISATEUR_SERVICE
EXPO_PUBLIC_SAP_PASSWORD=MOT_DE_PASSE_SERVICE
EXPO_PUBLIC_PRINT_MODE=pdf
EXPO_PUBLIC_API_TIMEOUT=15000
EXPO_PUBLIC_SESSION_REFRESH_INTERVAL=1500000
EXPO_PUBLIC_N_WEEKS=8
EXPO_PUBLIC_N_WEEKS_COVERAGE=4
EXPO_PUBLIC_ENV=production
```

Les fichiers `.env*` sont ignores par Git et ne doivent pas etre pousses.

## Lancement en developpement

Demarrer Expo :

```bash
npm run start
```

Lancer Android localement :

```bash
npm run android
```

Lancer iOS localement :

```bash
npm run ios
```

Lancer Web :

```bash
npm run web
```

## Build APK avec EAS

Le profil `preview` genere un APK Android interne.

```bash
npx eas build -p android --profile preview
```

Le profil `production` est reserve au build de production avec auto-increment.

```bash
npx eas build -p android --profile production
```

Le fichier `.easignore` exclut les fichiers locaux, secrets, dossiers generes et fichiers d'assistant afin qu'ils ne soient pas envoyes dans l'archive EAS.

## Structure du projet

```text
src/app                 Routes Expo Router
src/core                Configuration, API SAP, auth, stockage
src/features            Modules metier: commande, reception, sortie, inventaire, etiquettes
src/shared              Composants, hooks, services, types et utilitaires partages
assets                  Images et certificats necessaires a l'app
plugins                 Plugins Expo locaux
```

## Inventaire

Le module inventaire gere deux cas :

- Article deja present dans le document SAP : la ligne est mise a jour avec la quantite comptee et `Counted = tYES`.
- Article absent du document SAP : l'article est ajoute comme nouvelle ligne comptee.

La recuperation du detail d'inventaire suit la pagination SAP pour gerer les documents avec beaucoup de lignes. Le placeholder de test `A09541` est filtre et retire lors des mises a jour de comptage.

## Etiquettes

Le module etiquettes genere une planche A4 de 21 etiquettes, 3 colonnes par 7 rangees. Le rendu actuel place :

- la designation en haut,
- le logo a gauche du prix,
- le code-barres en dessous,
- PCB, code article et date en bas.

## Fichiers exclus du depot

Ne pas versionner :

- `.env`, `.env.development`, `.env.production`
- `.claude/`, `.codex/`, `.agents/`
- `node_modules/`, `.expo/`, `android/`, `ios/`
- fichiers temporaires `codex-*`

Ces exclusions sont definies dans `.gitignore` et `.easignore`.

## Verification

Verification TypeScript :

```bash
npx tsc --noEmit
```

Note : si la verification echoue sur des erreurs existantes hors du changement en cours, les corriger separement avant une release stricte.
