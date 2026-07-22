# Requêtes SAP B1 — Configuration Production
## Application GlobalAction Mobile

Ce document liste toutes les configurations SAP à effectuer lors de la mise en production.
À exécuter **une seule fois** par un administrateur SAP habilité.

---

## Section 0 — Table utilisateurs @GA_USERS (UDT)

### Objectif
Stocker les comptes utilisateurs de l'application mobile.
L'authentification SAP (compte service) est séparée — elle est gérée automatiquement par l'app.

### Création de la table via SAP Desktop Client

1. Ouvrir SAP B1 Desktop → **Administration → Personnalisation système → Tables définies par l'utilisateur**
2. Créer une nouvelle table :
   - **Nom de l'objet** : `GA_USERS`
   - **Description** : `Utilisateurs GlobalAction Mobile`
   - **Type d'objet** : `Sans documents SAP`

3. Ajouter les **champs définis par l'utilisateur** (via Administration → Champs définis par l'utilisateur → Gérer les UDF → Tables d'utilisateurs → @GA_USERS) :

| Nom du champ | Description | Type | Longueur |
|-------------|-------------|------|---------|
| `U_Password` | Mot de passe SHA-256 (hex) | Alphanumérique | 64 |
| `U_Active`   | Compte actif (Y/N) | Alphanumérique | 1 |

> Les champs `Code` (identifiant de connexion) et `Name` (nom affiché) sont **automatiquement créés** par SAP sur toute table UDT.

### Saisie des utilisateurs

Aller dans **Administration → Personnalisation système → Valeurs définies par l'utilisateur → @GA_USERS** et ajouter les utilisateurs :

| Code | Name | U_Password | U_Active |
|------|------|-----------|---------|
| `ADMIN` | Administrateur | `<sha256_du_mdp>` | `Y` |
| `USER1` | Prénom Nom | `<sha256_du_mdp>` | `Y` |

### Générer un hash SHA-256 (PowerShell)

```powershell
# Remplacer "MonMotDePasse" par le vrai mot de passe
$password = "MonMotDePasse"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
$hashHex = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""
Write-Host "SHA-256 : $hashHex"
```

> ⚠️ Ne jamais stocker le mot de passe en clair. Seul le hash SHA-256 (64 caractères hexadécimaux) va dans `U_Password`.

---

## Section 1 — Champs définis par l'utilisateur (UDF) — Traçabilité

### Objectif
Tracer le nom de l'utilisateur mobile sur chaque document créé depuis l'app.

### Champ à créer : `U_UtilisateurMob`

Via SAP Desktop → **Administration → Champs définis par l'utilisateur → Gérer les UDF** :

| Table SAP | Document OData | Champ | Type | Longueur |
|-----------|---------------|-------|------|---------|
| `OPOR` | PurchaseOrders (Commandes fournisseurs) | `U_UtilisateurMob` | Alphanumérique | 50 |
| `OPDN` | PurchaseDeliveryNotes (Réceptions) | `U_UtilisateurMob` | Alphanumérique | 50 |
| `OWTR` | StockTransfers (Transferts de stock) | `U_UtilisateurMob` | Alphanumérique | 50 |
| `OIGE` | InventoryGenExits (Sorties de marchandises) | `U_UtilisateurMob` | Alphanumérique | 50 |
| `OIGN` | InventoryGenEntries (Entrées de marchandises) | `U_UtilisateurMob` | Alphanumérique | 50 |
| `OINC` | InventoryCountings (Inventaires) | `U_UtilisateurMob` | Alphanumérique | 50 |

> Une fois les UDF créés, l'application les renseigne automatiquement à chaque création de document.

---

## Prérequis API

### 1. Authentification
Avant toute requête, obtenir une session SAP :

```
POST https://<SERVEUR>:<PORT>/b1s/v1/Login
Content-Type: application/json

{
  "CompanyDB": "<BASE_DE_DONNEES>",
  "UserName": "<UTILISATEUR>",
  "Password": "<MOT_DE_PASSE>"
}
```

> Réponse : cookie `B1SESSION` à conserver pour toutes les requêtes suivantes.
> Remplacer `<SERVEUR>`, `<PORT>`, `<BASE_DE_DONNEES>`, `<UTILISATEUR>`, `<MOT_DE_PASSE>` par les valeurs de production.

---

## Query 1 — GA_VENTES_HEBDO

**Rôle** : Calcul des ventes totales par article sur une période donnée.
Utilisée par le module **Aide à la Commande** pour calculer la vente moyenne hebdomadaire de chaque article.
Remplace plus de 80 appels OData individuels par **une seule requête SQL**.

### Création

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries
Content-Type: application/json
```

Body :
```json
{
  "SqlCode": "GA_VENTES_HEBDO",
  "SqlName": "Ventes hebdo globales - GlobalAction",
  "SqlText": "SELECT T1.[ItemCode], T1.[Dscription] AS [ItemName], SUM(T1.[Quantity]) AS [TotalVendu] FROM [OINV] T0 INNER JOIN [INV1] T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[DocDate] >= :StartDate AND T0.[DocDate] <= :EndDate AND T0.[CANCELED] = 'N' GROUP BY T1.[ItemCode], T1.[Dscription]"
}
```

**Réponse attendue** : `201 Created`

---

### Mise à jour (si la query existe déjà)

```
PATCH https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_VENTES_HEBDO')
Content-Type: application/json

{
  "SqlText": "SELECT T1.[ItemCode], T1.[Dscription] AS [ItemName], SUM(T1.[Quantity]) AS [TotalVendu] FROM [OINV] T0 INNER JOIN [INV1] T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[DocDate] >= :StartDate AND T0.[DocDate] <= :EndDate AND T0.[CANCELED] = 'N' GROUP BY T1.[ItemCode], T1.[Dscription]"
}
```

**Réponse attendue** : `204 No Content`

---

### Test de validation

Exécuter la requête avec une période test :

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_VENTES_HEBDO')/List?$top=500
Content-Type: application/json

{
  "ParamList": "StartDate='2026-01-01'&EndDate='2026-03-28'"
}
```

**Réponse attendue** : `200 OK` avec une liste d'articles et leurs quantités vendues.

Exemple de résultat correct :
```json
{
  "value": [
    { "ItemCode": "A07357", "ItemName": "BISCUIT ZINA FRAISE BISKO 17G X 24", "TotalVendu": 416.0 },
    { "ItemCode": "A00835", "ItemName": "CHOCOPAIN 500G", "TotalVendu": 832.0 },
    { "ItemCode": "A01155", "ItemName": "EAU KIRENE 1.5L", "TotalVendu": 1248.0 },
    ...
  ]
}
```

**Critères de succès** :
- Code HTTP : `200 OK`
- Champ `value` présent et non vide
- Chaque entrée contient `ItemCode`, `ItemName`, `TotalVendu`
- Pas d'`odata.nextLink` si `$top=500` est bien passé (ou présent si > 500 articles vendus sur la période)

---

### Suppression (si nécessaire)

```
DELETE https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_VENTES_HEBDO')
```

**Réponse attendue** : `204 No Content`

---

## Query 2 — GA_VENTES_ARTICLE

**Rôle** : Ventes totales d'un article précis sur une période donnée.
Utilisée par le module **Commande** lors de la sélection d'un article (KPIs : Vente/Sem, Couverture, Suggestion).
Remplace 80+ appels OData individuels par **un seul appel SQL**.

### Création

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries
Content-Type: application/json
```

Body :
```json
{
  "SqlCode": "GA_VENTES_ART_MOB",
  "SqlName": "Ventes par article mobile - GlobalAction",
  "SqlText": "SELECT T1.[ItemCode], SUM(T1.[Quantity]) AS [TotalVendu] FROM [OINV] T0 INNER JOIN [INV1] T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[DocDate] >= :StartDate AND T0.[DocDate] <= :EndDate AND T1.[ItemCode] = :ItemCode AND T0.[CANCELED] = 'N' GROUP BY T1.[ItemCode]"
}
```

**Réponse attendue** : `201 Created`

---

### Mise à jour (si la query existe déjà)

```
PATCH https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_VENTES_ART_MOB')
Content-Type: application/json

{
  "SqlText": "SELECT T1.[ItemCode], SUM(T1.[Quantity]) AS [TotalVendu] FROM [OINV] T0 INNER JOIN [INV1] T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[DocDate] >= :StartDate AND T0.[DocDate] <= :EndDate AND T1.[ItemCode] = :ItemCode AND T0.[CANCELED] = 'N' GROUP BY T1.[ItemCode]"
}
```

---

### Test de validation

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_VENTES_ART_MOB')/List
Content-Type: application/json

{
  "ParamList": "StartDate='2026-01-01'&EndDate='2026-03-28'&ItemCode='A01752'"
}
```

**Réponse attendue** :
```json
{
  "value": [
    { "ItemCode": "A01752", "ItemName": "LAIT ROSE ENTIER 20CL * 21", "TotalVendu": 13.0 }
  ]
}
```

**Critères de succès** :
- Code HTTP : `200 OK`
- `value` contient exactement 1 entrée pour l'article demandé
- `TotalVendu` est cohérent avec les données SAP desktop

---

---

## Query 3 — GA_AUTH_USER

**Rôle** : Authentification des utilisateurs applicatifs via la table `@GA_USERS`.
Vérifie que le code utilisateur + mot de passe (SHA-256) correspondent à un compte actif.

### Création

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries
Content-Type: application/json
```

Body :
```json
{
  "SqlCode": "GA_AUTH_USER",
  "SqlName": "Authentification utilisateurs app - GlobalAction",
  "SqlText": "SELECT T0.[Code], T0.[Name] FROM [@GA_USERS] T0 WHERE T0.[Code] = :UserCode AND T0.[U_Password] = :HashedPwd AND T0.[U_Active] = 'Y'"
}
```

**Réponse attendue** : `201 Created`

---

### Test de validation

1. Créer un utilisateur test dans `@GA_USERS` (via SAP Desktop ou Section 0) avec `Code='TESTUSER'` et le hash SHA-256 d'un mot de passe test.
2. Exécuter :

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_AUTH_USER')/List
Content-Type: application/json

{
  "ParamList": "UserCode='TESTUSER'&HashedPwd='<sha256_hex_du_mot_de_passe>'"
}
```

**Réponse si identifiants corrects** :
```json
{
  "value": [
    { "Code": "TESTUSER", "Name": "Utilisateur Test" }
  ]
}
```

**Réponse si identifiants incorrects ou compte inactif** :
```json
{
  "value": []
}
```

**Critères de succès** :
- Code HTTP : `200 OK`
- `value` non vide → login autorisé
- `value` vide → login refusé (identifiants incorrects OU compte `U_Active = 'N'`)

---

---

## Query 4 — GA_KPI_RUPTURE_WHS

**Rôle** : Compte le nombre d'articles en rupture de stock (OnHand <= 0) dans un magasin donné.
Utilisée par le **Dashboard** pour afficher le KPI `ruptureCount` (filtré par magasin utilisateur).

### Création

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries
Content-Type: application/json
```

Body :
```json
{
  "SqlCode": "GA_KPI_RUPTURE_WHS",
  "SqlName": "KPI Ruptures par magasin - GlobalAction",
  "SqlText": "SELECT COUNT(T0.[ItemCode]) AS [Ruptures] FROM [OITW] T0 INNER JOIN [OITM] T1 ON T0.[ItemCode] = T1.[ItemCode] WHERE T0.[WhsCode] = :WhsCode AND T0.[OnHand] <= 0 AND T1.[InvntItem] = 'Y'"
}
```

**Réponse attendue** : `201 Created`

---

### Mise à jour (si la query existe déjà)

```
PATCH https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_KPI_RUPTURE_WHS')
Content-Type: application/json

{
  "SqlText": "SELECT COUNT(T0.[ItemCode]) AS [Ruptures] FROM [OITW] T0 INNER JOIN [OITM] T1 ON T0.[ItemCode] = T1.[ItemCode] WHERE T0.[WhsCode] = :WhsCode AND T0.[OnHand] <= 0 AND T1.[InvntItem] = 'Y'"
}
```

**Réponse attendue** : `204 No Content`

---

### Test de validation

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_KPI_RUPTURE_WHS')/List
Content-Type: application/json

{
  "ParamList": "WhsCode='GADAYE'"
}
```

**Réponse attendue** :
```json
{
  "value": [
    { "Ruptures": 3 }
  ]
}
```

**Critères de succès** :
- Code HTTP : `200 OK`
- Champ `Ruptures` présent dans `value[0]`
- Valeur entière >= 0

---

### Suppression (si nécessaire)

```
DELETE https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_KPI_RUPTURE_WHS')
```

**Réponse attendue** : `204 No Content`

---

## Query 5 — GA_KPI_INV_OPEN_WHS

**Rôle** : Compte le nombre de documents d'inventaire ouverts impliquant un magasin donné.
Utilisée par le **Dashboard** pour afficher le KPI `inventaireOpen`.

### Création

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries
Content-Type: application/json
```

Body :
```json
{
  "SqlCode": "GA_KPI_INV_OPEN_WHS",
  "SqlName": "KPI Inventaires ouverts par magasin - GlobalAction",
  "SqlText": "SELECT COUNT(DISTINCT T0.[DocEntry]) AS [InvOpen] FROM [OINC] T0 INNER JOIN [INC1] T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[Status] = 'O' AND T1.[WhsCode] = :WhsCode"
}
```

**Réponse attendue** : `201 Created`

---

### Mise à jour (si la query existe déjà)

```
PATCH https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_KPI_INV_OPEN_WHS')
Content-Type: application/json

{
  "SqlText": "SELECT COUNT(DISTINCT T0.[DocEntry]) AS [InvOpen] FROM [OINC] T0 INNER JOIN [INC1] T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[Status] = 'O' AND T1.[WhsCode] = :WhsCode"
}
```

**Réponse attendue** : `204 No Content`

---

### Test de validation

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_KPI_INV_OPEN_WHS')/List
Content-Type: application/json

{
  "ParamList": "WhsCode='GADAYE'"
}
```

**Réponse attendue** :
```json
{
  "value": [
    { "InvOpen": 1 }
  ]
}
```

**Critères de succès** :
- Code HTTP : `200 OK`
- Champ `InvOpen` présent dans `value[0]`
- Valeur entière >= 0

---

### Suppression (si nécessaire)

```
DELETE https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_KPI_INV_OPEN_WHS')
```

**Réponse attendue** : `204 No Content`

---

## Query 6 — GA_INV_OPEN_LIST_WHS

**Rôle** : Liste les documents d'inventaire ouverts dont au moins une ligne appartient à un magasin donné.
Utilisée par le module **Inventaire** pour ne montrer aux utilisateurs non-admin que les inventaires de leur magasin.

> Note : la lambda OData `InventoryCountingLines/any(...)` est rejetée par SAP sur cette entité (erreur 201, confirmé Postman 2026-05-17) — d'où la requête SQL.

### Création

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries
Content-Type: application/json
```

Body :
```json
{
  "SqlCode": "GA_INV_OPEN_LIST_WHS",
  "SqlName": "Liste inventaires ouverts par magasin - GlobalAction",
  "SqlText": "SELECT DISTINCT T0.[DocEntry] AS [DocumentEntry], T0.[DocNum] AS [DocumentNumber], T0.[CountDate] FROM OINC T0 INNER JOIN INC1 T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[Status] = 'O' AND T1.[WhsCode] = :WhsCode"
}
```

**Réponse attendue** : `201 Created`

---

### Mise à jour (si la query existe déjà)

```
PATCH https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_INV_OPEN_LIST_WHS')
Content-Type: application/json

{
  "SqlText": "SELECT DISTINCT T0.[DocEntry] AS [DocumentEntry], T0.[DocNum] AS [DocumentNumber], T0.[CountDate] FROM OINC T0 INNER JOIN INC1 T1 ON T0.[DocEntry] = T1.[DocEntry] WHERE T0.[Status] = 'O' AND T1.[WhsCode] = :WhsCode"
}
```

**Réponse attendue** : `204 No Content`

---

### Test de validation

```
POST https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_INV_OPEN_LIST_WHS')/List
Content-Type: application/json

{
  "ParamList": "WhsCode='GADAYE'"
}
```

**Réponse attendue** :
```json
{
  "value": [
    { "DocumentEntry": 123, "DocumentNumber": 45, "CountDate": "2026-05-17T00:00:00Z" }
  ]
}
```

**Critères de succès** :
- Code HTTP : `200 OK`
- Chaque entrée contient `DocumentEntry`, `DocumentNumber`, `CountDate`
- Seuls les documents impliquant le magasin demandé apparaissent

---

### Suppression (si nécessaire)

```
DELETE https://<SERVEUR>:<PORT>/b1s/v1/SQLQueries('GA_INV_OPEN_LIST_WHS')
```

**Réponse attendue** : `204 No Content`

---

## Résumé complet

### UDT & UDF à créer dans SAP Desktop

| Élément | Type | Description |
|---------|------|-------------|
| `@GA_USERS` | Table UDT | Comptes utilisateurs de l'app mobile |
| `U_Password` sur `@GA_USERS` | UDF (Alpha 64) | Hash SHA-256 du mot de passe |
| `U_Active` sur `@GA_USERS` | UDF (Alpha 1) | Compte actif : `Y` ou `N` |
| `U_UtilisateurMob` sur OPOR, OPDN, OWTR, OIGE, OIGN, OINC | UDF (Alpha 50) | Traçabilité nom utilisateur |

### SQLQueries à créer via API (Postman)

| SqlCode | Rôle | Module app |
|---------|------|------------|
| `GA_AUTH_USER` | Vérification identifiants utilisateur app | Écran de connexion |
| `GA_VENTES_HEBDO` | Ventes par article sur période (tous articles) | Aide à la commande |
| `GA_VENTES_ART_MOB` | Ventes d'un article précis sur période | KPIs article (Commande) |
| `GA_KPI_RUPTURE_WHS` | Ruptures de stock par magasin | Dashboard (KPI ruptureCount) |
| `GA_KPI_INV_OPEN_WHS` | Inventaires ouverts par magasin | Dashboard (KPI inventaireOpen) |
| `GA_INV_OPEN_LIST_WHS` | Liste des inventaires ouverts par magasin | Inventaire (liste filtrée non-admin) |
