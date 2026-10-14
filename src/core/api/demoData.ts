/**
 * Données de démonstration autonomes pour ELTON OIL COMPANY
 * Permet à l'application de fonctionner 24h/24 sur Vercel sans backend externe
 */

export interface IMockArticle {
  ItemCode: string;
  ItemName: string;
  BarCode: string;
  QuantityOnStock: number;
  QuantityOrderedFromVendors: number;
  QuantityOrderedByCustomers: number;
  ItemsGroupCode: number;
  InventoryUOM: string;
  U_rayon: string;
  U_sous_fam: string;
  U_PCB: number;
  Frozen: string;
  Mainsupplier: string;
  ItemPrices: { PriceList: number; Price: number; Currency: string }[];
  ItemWarehouseInfoCollection: { WarehouseCode: string; InStock: number; Committed: number; Ordered: number }[];
}

export const MOCK_ELTON_ARTICLES: IMockArticle[] = [
  {
    ItemCode: 'ELT-SYN-5W40',
    ItemName: 'Elton Synthèse Platine 5W40 5L',
    BarCode: '370001001001',
    QuantityOnStock: 45,
    QuantityOrderedFromVendors: 50,
    QuantityOrderedByCustomers: 5,
    ItemsGroupCode: 100,
    InventoryUOM: 'Bidon 5L',
    U_rayon: 'Lubrifiants',
    U_sous_fam: 'Huiles Synthèse',
    U_PCB: 4,
    Frozen: 'tNO',
    Mainsupplier: 'F0001',
    ItemPrices: [
      { PriceList: 1, Price: 28500, Currency: 'XOF' },
      { PriceList: 2, Price: 24000, Currency: 'XOF' },
      { PriceList: 3, Price: 26000, Currency: 'XOF' },
    ],
    ItemWarehouseInfoCollection: [
      { WarehouseCode: '01', InStock: 30, Committed: 0, Ordered: 30 },
      { WarehouseCode: '02', InStock: 15, Committed: 0, Ordered: 20 },
    ],
  },
  {
    ItemCode: 'ELT-DSL-15W40',
    ItemName: 'Elton Diesel Force 15W40 5L',
    BarCode: '370001001002',
    QuantityOnStock: 80,
    QuantityOrderedFromVendors: 40,
    QuantityOrderedByCustomers: 10,
    ItemsGroupCode: 100,
    InventoryUOM: 'Bidon 5L',
    U_rayon: 'Lubrifiants',
    U_sous_fam: 'Huiles Diesel',
    U_PCB: 4,
    Frozen: 'tNO',
    Mainsupplier: 'F0001',
    ItemPrices: [
      { PriceList: 1, Price: 19500, Currency: 'XOF' },
      { PriceList: 2, Price: 16500, Currency: 'XOF' },
      { PriceList: 3, Price: 18000, Currency: 'XOF' },
    ],
    ItemWarehouseInfoCollection: [
      { WarehouseCode: '01', InStock: 50, Committed: 0, Ordered: 20 },
      { WarehouseCode: '02', InStock: 30, Committed: 0, Ordered: 20 },
    ],
  },
  {
    ItemCode: 'ELT-MOT-20W50',
    ItemName: 'Elton Moteur Classic 20W50 1L',
    BarCode: '370001001003',
    QuantityOnStock: 120,
    QuantityOrderedFromVendors: 0,
    QuantityOrderedByCustomers: 15,
    ItemsGroupCode: 100,
    InventoryUOM: 'Bidon 1L',
    U_rayon: 'Lubrifiants',
    U_sous_fam: 'Huiles Minérales',
    U_PCB: 12,
    Frozen: 'tNO',
    Mainsupplier: 'F0001',
    ItemPrices: [
      { PriceList: 1, Price: 4500, Currency: 'XOF' },
      { PriceList: 2, Price: 3800, Currency: 'XOF' },
      { PriceList: 3, Price: 4200, Currency: 'XOF' },
    ],
    ItemWarehouseInfoCollection: [
      { WarehouseCode: '01', InStock: 80, Committed: 0, Ordered: 0 },
      { WarehouseCode: '02', InStock: 40, Committed: 0, Ordered: 0 },
    ],
  },
  {
    ItemCode: 'ELT-COOL-VERT',
    ItemName: 'Elton Liquide Refroidissement Vert 4L',
    BarCode: '370001001004',
    QuantityOnStock: 35,
    QuantityOrderedFromVendors: 20,
    QuantityOrderedByCustomers: 0,
    ItemsGroupCode: 102,
    InventoryUOM: 'Bidon 4L',
    U_rayon: 'Entretien',
    U_sous_fam: 'Refroidissement',
    U_PCB: 6,
    Frozen: 'tNO',
    Mainsupplier: 'F0002',
    ItemPrices: [
      { PriceList: 1, Price: 8500, Currency: 'XOF' },
      { PriceList: 2, Price: 7200, Currency: 'XOF' },
      { PriceList: 3, Price: 7900, Currency: 'XOF' },
    ],
    ItemWarehouseInfoCollection: [
      { WarehouseCode: '01', InStock: 25, Committed: 0, Ordered: 10 },
      { WarehouseCode: '02', InStock: 10, Committed: 0, Ordered: 10 },
    ],
  },
  {
    ItemCode: 'ELT-BRK-DOT4',
    ItemName: 'Elton Liquide de Frein DOT4 500ml',
    BarCode: '370001001005',
    QuantityOnStock: 60,
    QuantityOrderedFromVendors: 0,
    QuantityOrderedByCustomers: 0,
    ItemsGroupCode: 102,
    InventoryUOM: 'Flacon 500ml',
    U_rayon: 'Entretien',
    U_sous_fam: 'Freinage',
    U_PCB: 24,
    Frozen: 'tNO',
    Mainsupplier: 'F0002',
    ItemPrices: [
      { PriceList: 1, Price: 3500, Currency: 'XOF' },
      { PriceList: 2, Price: 2900, Currency: 'XOF' },
      { PriceList: 3, Price: 3200, Currency: 'XOF' },
    ],
    ItemWarehouseInfoCollection: [
      { WarehouseCode: '01', InStock: 40, Committed: 0, Ordered: 0 },
      { WarehouseCode: '02', InStock: 20, Committed: 0, Ordered: 0 },
    ],
  },
  {
    ItemCode: 'ELT-FLT-OIL01',
    ItemName: 'Filtre à Huile Universel H1',
    BarCode: '370001001006',
    QuantityOnStock: 95,
    QuantityOrderedFromVendors: 50,
    QuantityOrderedByCustomers: 2,
    ItemsGroupCode: 103,
    InventoryUOM: 'Pièce',
    U_rayon: 'Filtration',
    U_sous_fam: 'Filtres Huile',
    U_PCB: 10,
    Frozen: 'tNO',
    Mainsupplier: 'F0003',
    ItemPrices: [
      { PriceList: 1, Price: 5000, Currency: 'XOF' },
      { PriceList: 2, Price: 4200, Currency: 'XOF' },
      { PriceList: 3, Price: 4500, Currency: 'XOF' },
    ],
    ItemWarehouseInfoCollection: [
      { WarehouseCode: '01', InStock: 65, Committed: 0, Ordered: 30 },
      { WarehouseCode: '02', InStock: 30, Committed: 0, Ordered: 20 },
    ],
  },
];

export const MOCK_ELTON_PRICE_LISTS = [
  { PriceListNo: 1, PriceListName: 'Tarif Général Station / Détail' },
  { PriceListNo: 2, PriceListName: 'Tarif Gros / Flottes Entreprises' },
  { PriceListNo: 3, PriceListName: 'Tarif Promo Lubrifiants' },
];

export const MOCK_ELTON_WAREHOUSES = [
  { WarehouseCode: '01', WarehouseName: 'Magasin Central Elton (Dakar)' },
  { WarehouseCode: '02', WarehouseName: 'Station Elton VDN' },
  { WarehouseCode: '03', WarehouseName: 'Station Elton Autoroute' },
];

export const MOCK_ELTON_SUPPLIERS = [
  { CardCode: 'F0001', CardName: 'TOTALENERGIES LUBRICANTS SENEGAL', CardType: 'cSupplier' },
  { CardCode: 'F0002', CardName: 'SHELL / VIVO ENERGY AFRIQUE', CardType: 'cSupplier' },
  { CardCode: 'F0003', CardName: 'ELTON DISTRIBUTION DIRECTE', CardType: 'cSupplier' },
];

export const MOCK_ELTON_INVENTORIES = [
  {
    DocEntry: 101,
    DocNum: 101,
    CountDate: new Date().toISOString(),
    DocumentStatus: 'cdsOpen',
    Remarks: 'Inventaire Mensuel Station & Dépôt',
    InventoryCountingLines: [
      {
        DocEntry: 101,
        LineNum: 0,
        ItemCode: 'ELT-SYN-5W40',
        ItemDescription: 'Elton Synthèse Platine 5W40 5L',
        WarehouseCode: '01',
        Freeze: 'tNO',
        Counted: 'tYES',
        CountedQuantity: 30,
      },
      {
        DocEntry: 101,
        LineNum: 1,
        ItemCode: 'ELT-DSL-15W40',
        ItemDescription: 'Elton Diesel Force 15W40 5L',
        WarehouseCode: '01',
        Freeze: 'tNO',
        Counted: 'tNO',
        CountedQuantity: 0,
      },
      {
        DocEntry: 101,
        LineNum: 2,
        ItemCode: 'ELT-COOL-VERT',
        ItemDescription: 'Elton Liquide Refroidissement Vert 4L',
        WarehouseCode: '01',
        Freeze: 'tNO',
        Counted: 'tNO',
        CountedQuantity: 0,
      },
      {
        DocEntry: 101,
        LineNum: 3,
        ItemCode: 'ELT-FLT-OIL01',
        ItemDescription: 'Filtre à Huile Universel H1',
        WarehouseCode: '01',
        Freeze: 'tNO',
        Counted: 'tYES',
        CountedQuantity: 65,
      },
    ],
  },
];

export const MOCK_ELTON_PURCHASE_ORDERS = [
  {
    DocEntry: 501,
    DocNum: 501,
    CardCode: 'F0001',
    CardName: 'TOTALENERGIES LUBRICANTS SENEGAL',
    DocDate: new Date().toISOString().split('T')[0],
    DocDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    DocTotal: 1850000,
    NumAtCard: 'BC-ELT-2026-08',
    Comments: 'Commande réapprovisionnement lubrifiants',
    DocumentStatus: 'bost_Open',
    DocumentLines: [
      {
        DocEntry: 501,
        LineNum: 0,
        ItemCode: 'ELT-SYN-5W40',
        ItemDescription: 'Elton Synthèse Platine 5W40 5L',
        Quantity: 50,
        OpenQty: 50,
        Price: 22000,
        WarehouseCode: '01',
      },
      {
        DocEntry: 501,
        LineNum: 1,
        ItemCode: 'ELT-DSL-15W40',
        ItemDescription: 'Elton Diesel Force 15W40 5L',
        Quantity: 40,
        OpenQty: 40,
        Price: 15000,
        WarehouseCode: '01',
      },
    ],
  },
];
