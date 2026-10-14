// ─── Toutes les URLs SAP Service Layer — NE JAMAIS mettre d'URL en dur ailleurs ──

/** Champs article communs pour tous les $select */
const ITEM_FIELDS = 'ItemCode,ItemName,BarCode,QuantityOnStock,QuantityOrderedFromVendors,QuantityOrderedByCustomers,ItemsGroupCode,InventoryUOM,U_rayon,U_sous_fam,U_PCB,Frozen,Mainsupplier';

export const ENDPOINTS = {
  // Auth SAP (compte service)
  LOGIN: '/Login',
  LOGOUT: '/Logout',
  // Auth applicative — vérification identifiants dans UDT @GA_USERS
  SQL_AUTH_USER: "/SQLQueries('GA_AUTH_USER')/List",
  // Récupération admin — U_ResetBySAP='Y' requis, sans vérification de mot de passe
  SQL_RESET_ADMIN: "/SQLQueries('GA_RESET_ADMIN')/List",

  // Articles
  ITEMS: '/Items',
  ITEM_BY_CODE: (code: string) => `/Items('${code}')`,
  // Pas de $select : SAP inclut automatiquement ItemWarehouseInfoCollection
  // ET ItemPrices sur un GET par clé — un $select explicite exclurait ItemPrices
  ITEM_BY_CODE_WITH_STOCK: (code: string) => `/Items('${code}')`,
  ITEMS_BY_BARCODE: (barcode: string) =>
    `/Items?$filter=BarCode eq '${barcode}' and Frozen eq 'tNO' and ItemType eq 'itItems'&$top=5`,
  ITEMS_SEARCH: (term: string) =>
    `/Items?$filter=startswith(ItemName,'${term}') and Frozen eq 'tNO' and ItemType eq 'itItems'&$top=15`,
  ITEMS_SEARCH_BY_CODE: (term: string) =>
    `/Items?$filter=startswith(ItemCode,'${term}') and Frozen eq 'tNO' and ItemType eq 'itItems'&$top=15`,
  ITEM_WAREHOUSES: (code: string) =>
    `/ItemWarehouseInfo?$filter=ItemCode eq '${code}'`,

  // Codes-barres (entité séparée — multi-barcodes par article)
  BARCODES: '/BarCodes',
  BARCODE_BY_VALUE: (barcode: string) =>
    `/BarCodes?$filter=Barcode eq '${barcode}'&$select=AbsEntry,ItemNo,Barcode,FreeText,UoMEntry`,

  // Entrepôts
  WAREHOUSES: '/Warehouses?$select=WarehouseCode,WarehouseName',

  // Familles d'articles
  ITEM_GROUPS: '/ItemGroups?$select=Number,GroupName',

  // Listes de prix SAP B1
  PRICE_LISTS: '/PriceLists?$select=PriceListNo,PriceListName&$orderby=PriceListNo',

  // Fournisseurs (BusinessPartners de type Supplier)
  // Liste initiale — top 500 pour couvrir la majorité sans pagination
  SUPPLIERS: "/BusinessPartners?$filter=CardType eq 'cSupplier'&$select=CardCode,CardName&$orderby=CardName&$top=500",
  // Recherche serveur — substringof couvre les occurrences en milieu de chaîne (OData v3 SAP B1)
  SUPPLIERS_SEARCH: (term: string) => {
    const safe = term.replace(/'/g, "''");
    return `/BusinessPartners?$filter=CardType eq 'cSupplier' and (substringof('${safe}',CardName) or substringof('${safe}',CardCode))&$select=CardCode,CardName&$orderby=CardName&$top=50`;
  },
  // Fiche fournisseur par code — pour résoudre le CardName à partir du Mainsupplier de l'article
  SUPPLIER_BY_CODE: (code: string) => `/BusinessPartners('${encodeURIComponent(code)}')`,

  // Commandes fournisseurs
  PURCHASE_ORDERS: '/PurchaseOrders',
  PURCHASE_ORDERS_OPEN: "/PurchaseOrders?$filter=DocumentStatus eq 'bost_Open'&$select=DocEntry,DocNum,CardCode,CardName,DocDate,DocDueDate,DocTotal,NumAtCard,Comments,DocumentStatus&$orderby=DocDate desc",
  // SAP B1 inclut DocumentLines automatiquement sur GET par clé — $expand inutile et rejeté
  PURCHASE_ORDER_DETAIL: (entry: number) => `/PurchaseOrders(${entry})`,

  // Réception marchandises
  PURCHASE_DELIVERY_NOTES: '/PurchaseDeliveryNotes',

  // Sortie marchandises
  INVENTORY_GEN_EXITS: '/InventoryGenExits',

  // Inventaire
  INVENTORY_COUNTINGS: '/InventoryCountings',
  // Documents ouverts — DocumentStatus confirmé Postman ('cdsOpen' = En attente)
  INVENTORY_COUNTINGS_OPEN:
    "/InventoryCountings?$filter=DocumentStatus eq 'cdsOpen'&$orderby=CountDate desc&$top=50",
  // Documents ouverts d'un magasin — magasin porté par les lignes (OINC + INC1).
  // Lambda OData any() rejetée par SAP sur InventoryCountings (erreur 201, Postman 2026-05-17) → SQL
  SQL_INV_OPEN_LIST_WHS: "/SQLQueries('GA_INV_OPEN_LIST_WHS')/List",
  // GET par clé : lignes incluses automatiquement — pas de $expand (Règle 1 CLAUDE.md)
  INVENTORY_COUNTING_DETAIL: (entry: number) => `/InventoryCountings(${entry})`,
  INVENTORY_POSTINGS: '/InventoryPostings',
  // Emplacements (bins) — résolution BinEntry → BinCode
  BIN_LOCATIONS: '/BinLocations?$select=AbsEntry,BinCode&$top=500',

  // Dashboard KPIs — $inlinecount=allpages&$top=1 → count sans données
  DASHBOARD_BC_OPEN_COUNT:
    "/PurchaseOrders?$filter=DocumentStatus eq 'bost_Open'&$inlinecount=allpages&$top=1&$select=DocEntry",
  DASHBOARD_EXITS_MONTH_COUNT: (dateFrom: string) =>
    `/InventoryGenExits?$filter=DocDate ge '${dateFrom}'&$inlinecount=allpages&$top=1&$select=DocEntry`,

  // Ventes (calcul vente hebdo — stratégie batched)
  // Étape 1 : headers filtrés sur la fenêtre Lun→Dim × N semaines
  // $expand=DocumentLines BLOQUÉ sur /Invoices collection (erreur 201 SAP) → batch fetch par clé
  // dateFrom/dateTo fournis par getWeekRange(N_WEEKS) — alignés sur semaines calendaires
  AR_INVOICE_HEADERS: (dateFrom: string, dateTo: string, top: number) =>
    `/Invoices?$filter=DocDate ge '${dateFrom}' and DocDate le '${dateTo}'&$select=DocEntry,DocDate&$orderby=DocDate desc&$top=${top}`,
  // Étape 2 : détail par clé — DocumentLines incluses automatiquement, sans $expand
  AR_INVOICE_DETAIL: (docEntry: number) => `/Invoices(${docEntry})`,

  // Ventes hebdo — requête SQL unique via SQLQueries (remplace le batch de 81 appels)
  // $top=500 obligatoire — SAP pagine à 20 par défaut même sur SQLQueries/List
  SQL_VENTES_HEBDO: "/SQLQueries('GA_VENTES_HEBDO')/List?$top=500",
  // Variante filtrée magasin (WhsCode requis)
  SQL_VENTES_HEBDO_WHS: "/SQLQueries('GA_VENTES_HEBDO_WHS')/List?$top=500",

  // Ventes hebdo pour UN article spécifique (remplace getWeeklySales batch 80+ appels)
  // GA_VENTES_ART_MOB : query dédiée mobile — ne pas modifier GA_VENTES_ARTICLE (utilisée ailleurs)
  SQL_VENTES_ARTICLE: "/SQLQueries('GA_VENTES_ART_MOB')/List",
  // Variante filtrée magasin (ItemCode + WhsCode requis)
  SQL_VENTES_ARTICLE_WHS: "/SQLQueries('GA_VENTES_ART_MOB_WHS')/List",
  // KPI Reception par magasin (fallback SQL car certains Service Layer refusent any(...) sur DocumentLines)
  SQL_KPI_REC_OPEN_WHS: "/SQLQueries('GA_KPI_REC_OPEN_WHS')/List",
  SQL_KPI_REC_SUP_WHS: "/SQLQueries('GA_KPI_REC_SUP_WHS')/List",
  SQL_KPI_REC_OVD_WHS: "/SQLQueries('GA_KPI_REC_OVD_WHS')/List",
  SQL_KPI_SORTIE_MOIS_WHS: "/SQLQueries('GA_KPI_SORTIE_MOIS_WHS')/List",
  SQL_KPI_SORTIE_MOTIF_WHS: "/SQLQueries('GA_KPI_SORTIE_MOTIF_WHS')/List",
  SQL_KPI_RUPTURE_WHS: "/SQLQueries('GA_KPI_RUPTURE_WHS')/List",
  SQL_KPI_INVENTAIRE_LAST_DOC_WHS: "/SQLQueries('GA_KPI_INV_LAST_DOC_WHS')/List",
  SQL_KPI_INVENTAIRE_OPEN_WHS: "/SQLQueries('GA_KPI_INV_OPEN_WHS')/List",

  // Gestion des utilisateurs applicatifs (UDO GA_USERS — sans @ car UDO, pas UDT brut)
  // POST /GA_USERS → création | PATCH /GA_USERS('code') → mise à jour
  GA_USERS: '/GA_USERS',
  GA_USER_BY_CODE: (code: string) => `/GA_USERS('${encodeURIComponent(code)}')`,
  // Lecture via SQLQuery — $select et $orderby non garantis sur UDO SAP B1
  SQL_LIST_USERS: "/SQLQueries('GA_LIST_USERS')/List",

  // Journal d'activité mobile — UDT GA_MOB_ACTIVITY "no object" (SAP 9.1 PL05+)
  // Préfixe U_ (pas @) — les UDTs "no object" s'exposent via /U_NOMTABLE
  // L'app écrit 1 ligne par document créé (POST) — lecture simple sans UNION SQL
  GA_MOB_ACTIVITY: '/U_GA_MOB_ACTIVITY',
  GA_MOB_ACTIVITY_BY_USER: (userName: string) =>
    `/U_GA_MOB_ACTIVITY?$filter=U_UtilisateurMob eq '${userName.replace(/'/g, "''")}'&$orderby=U_DocDate desc&$top=200`,
  GA_MOB_ACTIVITY_ALL: '/U_GA_MOB_ACTIVITY?$orderby=U_DocDate desc&$top=500',

  // Aide à la commande — articles actifs triés par stock croissant
  ITEMS_LOW_STOCK: (top: number) =>
    `/Items?$filter=Frozen eq 'tNO' and ItemType eq 'itItems'` +
    `&$select=ItemCode,ItemName,BarCode,QuantityOnStock,QuantityOrderedFromVendors,InventoryUOM,Mainsupplier` +
    `&$orderby=QuantityOnStock asc&$top=${top}`,
};
