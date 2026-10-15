# ELTON OIL COMPANY — Cahier des charges et matrice de conformité

Ce document est la référence de recette du dépôt `App-Mobile-Global-Action`.
Une exigence ne peut être déclarée conforme que si elle est vérifiée par :

1. un test automatisé ou une preuve de recette ;
2. un environnement SAP Business One de recette lorsque l'exigence écrit dans SAP ;
3. un appareil réel lorsque l'exigence dépend de la caméra, de l'impression ou de la connectivité.

Les tests Jest et le mock SAP local valident les contrats applicatifs. Ils ne remplacent
pas la recette SAP réelle.

## Mode démonstration frontend public

Le déploiement Vercel public peut être configuré avec `EXPO_PUBLIC_DEMO_MODE=true`.
Dans ce mode, l'application utilise exclusivement des données fictives en mémoire et
bloque les appels réseau vers SAP. Les comptes `demo-admin` et `demo-user` servent
uniquement à présenter les deux vues fonctionnelles prévues par le cahier des charges.
Ce mode facilite la démonstration à distance, mais ne constitue pas une recette SAP et
ne modifie pas les règles de sécurité du déploiement connecté à SAP.

## Statuts

- **Implémenté — à certifier** : le parcours existe dans l'application, mais doit être validé sur SAP réel ou appareil réel.
- **Implémenté et testé** : le comportement est couvert par un test local vérifiable.
- **À réaliser** : aucun livrable complet n'existe dans ce dépôt.
- **Bloqué par prérequis externe** : nécessite SAP SDK, matériel, réseau ou décision métier.

## Module 1 — Utilisateurs et accès

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| ACC-1.1 | L'administrateur crée un compte | Implémenté — à certifier | Le compte est créé dans `@GA_USERS` et peut se connecter. |
| ACC-1.2 | L'administrateur réinitialise un mot de passe | Implémenté — à certifier | Le mot de passe est hashé côté application et la connexion suivante fonctionne. |
| ACC-1.3 | Rôles administrateur et standard | Implémenté — à certifier | Un standard ne peut pas ouvrir l'administration ni consulter toutes les activités. |
| ACC-1.4 | Magasin unique par utilisateur | Implémenté — à certifier | Toute lecture et écriture métier est limitée au magasin associé côté SAP, pas uniquement dans l'UI. |
| ACC-1.5 | Utilisateur inactif refusé | À certifier sur SAP | Un compte `U_Active = 'N'` est refusé même avec un mot de passe correct. |

## Module 2 — Suivi des activités

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| ACT-2.1 | Journaliser commandes, réceptions, sorties, inventaires et prix | Implémenté — à certifier | Chaque document validé crée une ligne avec utilisateur, type, date et document SAP. |
| ACT-2.2 | L'administrateur voit toutes les activités | Implémenté — à certifier | La requête SAP admin retourne l'historique complet. |
| ACT-2.3 | Le standard voit uniquement ses activités | Implémenté — à certifier | Le filtrage par utilisateur est appliqué par la requête SAP et testé avec deux comptes. |

## Module 3 — Commandes fournisseurs

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| CMD-3.1 | Sélection du fournisseur SAP | Implémenté — à certifier | Seuls les fournisseurs valides sont sélectionnables. |
| CMD-3.2 | Recherche et scan article | Implémenté — à certifier | Code SAP, description et EAN renvoient l'article attendu. |
| CMD-3.3 | Détails article | Implémenté — à certifier | Code, description, EAN, groupe, rayon et PCB sont affichés. |
| CMD-3.4 | Quantités valides | Implémenté et testé | Une quantité nulle, négative, non numérique ou supérieure au stock est refusée. |
| CMD-3.5 | Création de commande SAP | Implémenté — à certifier | Un `PurchaseOrder` correct est créé avec le bon magasin et les bonnes lignes. |

## Module 4 — Réceptions

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| REC-4.1 | Commandes ouvertes filtrées par magasin | Implémenté — à certifier | Une commande d'un autre magasin n'est jamais proposée. |
| REC-4.2 | Réception totale ou partielle | Implémenté — à certifier | La quantité reçue ne dépasse pas `OpenQty` et la quantité restante est correcte. |
| REC-4.3 | Création basée sur commande | Implémenté — à certifier | `BaseType`, `BaseEntry` et `BaseLine` sont corrects dans SAP. |

## Module 5 — Sorties de marchandises

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| SOR-5.1 | Sortie limitée au magasin utilisateur | Implémenté — à certifier | SAP refuse toute ligne d'un autre magasin. |
| SOR-5.2 | Motif obligatoire | Implémenté et testé | Une chaîne vide ou composée d'espaces est refusée. |
| SOR-5.3 | Création `InventoryGenExits` | Implémenté — à certifier | Le document SAP contient motif, utilisateur, entrepôt et quantités. |

## Module 6 — Inventaires

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| INV-6.1 | Documents limités au magasin | Implémenté — à certifier | Un document d'un autre magasin est inaccessible. |
| INV-6.2 | Affichage initial des articles comptés | Implémenté — à certifier | L'écran initial n'affiche que les lignes déjà comptées. |
| INV-6.3 | Recherche/scan limité au document | Implémenté — à certifier | Un article absent du document est bloqué. |
| INV-6.4 | Doublon remplacer/additionner | Implémenté — à certifier | La validation est bloquée tant que le choix n'est pas explicite. |
| INV-6.5 | Validation SAP explicite | Implémenté — à certifier | Aucun `PATCH` n'est envoyé avant le bouton de validation. |

## Module 7 — Étiquettes mobiles

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| LAB-7.1 | Recherche et scan | Implémenté — à certifier | Un article peut être ajouté par texte ou EAN. |
| LAB-7.2 | Nombre d'exemplaires | Implémenté — à certifier | Le PDF contient exactement le nombre demandé. |
| LAB-7.3 | Format ELTON | Implémenté — à certifier | Le gabarit A4 est validé par impression et visa métier ELTON. |
| LAB-7.4 | Impression Bluetooth | Bloqué par prérequis externe | Le modèle d'imprimante et son protocole doivent être fournis avant intégration native. |

## Module 8 — Listes de prix

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| PRX-8.1 | Modifier un prix | Implémenté — à certifier | L'ancien et le nouveau prix sont affichés avant confirmation. |
| PRX-8.2 | Liste liée au magasin | À certifier sur SAP | La liste utilisée provient d'une configuration SAP officielle du magasin. |
| PRX-8.3 | Synchroniser SAP | Implémenté — à certifier | Après `PATCH`, une relecture SAP confirme la valeur finale. |

## Module 9 — Add-On SAP Desktop

| ID | Exigence | Statut | Critère d'acceptation |
|---|---|---|---|
| ADD-9.1 | Add-On SAP B1 .NET/SDK | À réaliser | Un projet séparé installé dans SAP B1 permet l'ouverture de l'écran. |
| ADD-9.2 | Utilisateurs habilités | Bloqué par prérequis externe | Les rôles SAP et la liste des utilisateurs autorisés sont fournis. |
| ADD-9.3 | Format d'étiquette | À réaliser | L'utilisateur sélectionne un modèle et obtient le rendu validé. |
| ADD-9.4 | Liste de prix, groupe et plage Du/Au | À réaliser | Les quatre filtres sont combinables et produisent le bon lot. |

## Exigences techniques

- Application multiplateforme Expo/React Native : **implémentée — à certifier** sur Android et iOS.
- SAP Service Layer : **implémenté — à certifier** sur un SAP Business One de recette réel.
- Responsive smartphone/tablette : **à certifier** sur appareils physiques.
- Caméra et scan EAN : **implémentés — à certifier** sur appareils physiques.
- Terminaux Zebra/Honeywell : **bloqué par prérequis externe** jusqu'au choix du modèle et du SDK.
- Bluetooth : **bloqué par prérequis externe** jusqu'au choix de l'imprimante.

## Prérequis de clôture

La conformité globale ne pourra être déclarée qu'après fourniture de :

1. une instance SAP B1 de recette et ses requêtes/UDO/UDT ;
2. la configuration magasin → liste de prix ;
3. les règles d'habilitation prix et impression ;
4. les modèles et imprimantes retenus ;
5. les appareils Android/iOS de recette ;
6. le périmètre, le SDK et la version .NET de l'Add-On SAP.
