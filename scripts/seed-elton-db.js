/**
 * Script de peuplement complet de la base de données SQLite de test ELTON OIL COMPANY
 * Base : elton_test.sqlite
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'elton_test.sqlite');

function hashPwd(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

console.log('🔄 Initialisation et peuplement complet de la base :', DB_PATH);

const db = new DatabaseSync(DB_PATH);

// 1. Recréation / Vérification du schéma
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    ItemCode TEXT PRIMARY KEY,
    ItemName TEXT NOT NULL,
    BarCode TEXT,
    QuantityOnStock REAL DEFAULT 0,
    QuantityOrderedFromVendors REAL DEFAULT 0,
    QuantityOrderedByCustomers REAL DEFAULT 0,
    ItemsGroupCode INTEGER DEFAULT 100,
    InventoryUOM TEXT DEFAULT 'Bidon',
    U_rayon TEXT DEFAULT 'Lubrifiants',
    U_sous_fam TEXT DEFAULT 'Huiles Moteur',
    U_PCB REAL DEFAULT 1,
    Frozen TEXT DEFAULT 'tNO',
    Mainsupplier TEXT DEFAULT 'F0001',
    ItemType TEXT DEFAULT 'itItems'
  );

  CREATE TABLE IF NOT EXISTS item_prices (
    ItemCode TEXT,
    PriceList INTEGER,
    Price REAL,
    Currency TEXT DEFAULT 'XOF',
    PRIMARY KEY (ItemCode, PriceList)
  );

  CREATE TABLE IF NOT EXISTS item_warehouses (
    ItemCode TEXT,
    WarehouseCode TEXT,
    InStock REAL DEFAULT 0,
    Committed REAL DEFAULT 0,
    Ordered REAL DEFAULT 0,
    PRIMARY KEY (ItemCode, WarehouseCode)
  );

  CREATE TABLE IF NOT EXISTS price_lists (
    PriceListNo INTEGER PRIMARY KEY,
    PriceListName TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    WarehouseCode TEXT PRIMARY KEY,
    WarehouseName TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_partners (
    CardCode TEXT PRIMARY KEY,
    CardName TEXT NOT NULL,
    CardType TEXT DEFAULT 'cSupplier'
  );

  CREATE TABLE IF NOT EXISTS inventory_countings (
    DocEntry INTEGER PRIMARY KEY,
    DocNum INTEGER NOT NULL,
    CountDate TEXT NOT NULL,
    DocumentStatus TEXT DEFAULT 'cdsOpen',
    Remarks TEXT
  );

  CREATE TABLE IF NOT EXISTS inventory_counting_lines (
    DocEntry INTEGER,
    LineNum INTEGER,
    ItemCode TEXT,
    ItemDescription TEXT,
    WarehouseCode TEXT,
    Freeze TEXT DEFAULT 'tNO',
    Counted TEXT DEFAULT 'tNO',
    CountedQuantity REAL DEFAULT 0,
    PRIMARY KEY (DocEntry, LineNum)
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    DocEntry INTEGER PRIMARY KEY,
    DocNum INTEGER NOT NULL,
    CardCode TEXT,
    CardName TEXT,
    DocDate TEXT,
    DocDueDate TEXT,
    DocTotal REAL,
    NumAtCard TEXT,
    Comments TEXT,
    DocumentStatus TEXT DEFAULT 'bost_Open'
  );

  CREATE TABLE IF NOT EXISTS purchase_order_lines (
    DocEntry INTEGER,
    LineNum INTEGER,
    ItemCode TEXT,
    ItemDescription TEXT,
    Quantity REAL,
    OpenQty REAL,
    Price REAL,
    WarehouseCode TEXT,
    PRIMARY KEY (DocEntry, LineNum)
  );

  CREATE TABLE IF NOT EXISTS inventory_gen_exits (
    DocEntry INTEGER PRIMARY KEY AUTOINCREMENT,
    DocNum INTEGER,
    DocDate TEXT,
    Comments TEXT,
    U_MotifSortie TEXT,
    U_UtilisateurMob TEXT
  );

  CREATE TABLE IF NOT EXISTS ga_mob_activity (
    DocEntry INTEGER PRIMARY KEY AUTOINCREMENT,
    U_TypeDoc TEXT,
    U_DocNum TEXT,
    U_DocDate TEXT,
    U_UtilisateurMob TEXT,
    U_WhsCode TEXT,
    U_Commentaire TEXT
  );

  CREATE TABLE IF NOT EXISTS ga_users (
    Code TEXT PRIMARY KEY,
    Name TEXT,
    U_Password TEXT,
    U_IsAdmin TEXT DEFAULT 'N',
    U_MustChangePwd TEXT DEFAULT 'N',
    U_WhsCode TEXT DEFAULT '01'
  );
`);

// 2. Nettoyage pour re-seed propre
db.exec(`
  DELETE FROM ga_users;
  DELETE FROM warehouses;
  DELETE FROM price_lists;
  DELETE FROM business_partners;
  DELETE FROM items;
  DELETE FROM item_prices;
  DELETE FROM item_warehouses;
  DELETE FROM inventory_countings;
  DELETE FROM inventory_counting_lines;
  DELETE FROM purchase_orders;
  DELETE FROM purchase_order_lines;
  DELETE FROM inventory_gen_exits;
  DELETE FROM ga_mob_activity;
`);

// 3. Utilisateurs applicatifs (@GA_USERS)
console.log('👤 Insertion des utilisateurs...');
const insertUser = db.prepare(`
  INSERT INTO ga_users (Code, Name, U_Password, U_IsAdmin, U_MustChangePwd, U_WhsCode)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Mots de passe pré-hachés SHA-256
// 'Admin123!' et 'admin' pour ADMIN
insertUser.run('ADMIN', 'Administrateur Général Elton', hashPwd('Admin123!'), 'Y', 'N', '01');
insertUser.run('RESP_MAG', 'Mamadou Diop (Magasin Central)', hashPwd('Elton2026!'), 'N', 'N', '01');
insertUser.run('OP_VDN', 'Aïssatou Ndiaye (Station VDN)', hashPwd('Elton2026!'), 'N', 'N', '02');
insertUser.run('OP_AUTOROUTE', 'Cheikh Seck (Station Autoroute)', hashPwd('Elton2026!'), 'N', 'N', '03');
insertUser.run('DEMO', 'Utilisateur Démo', hashPwd('123456'), 'Y', 'N', '01');

// 4. Magasins / Stations Elton
console.log('⛽ Insertion des magasins et stations...');
db.exec(`
  INSERT INTO warehouses (WarehouseCode, WarehouseName) VALUES
  ('01', 'Magasin Central Elton (Dakar Hann)'),
  ('02', 'Station Elton VDN'),
  ('03', 'Station Elton Autoroute'),
  ('04', 'Station Elton Almadies'),
  ('05', 'Station Elton Thiès Ville');
`);

// 5. Listes de prix
console.log('🏷️ Insertion des listes de prix...');
db.exec(`
  INSERT INTO price_lists (PriceListNo, PriceListName) VALUES
  (1, 'Tarif Général Station / Détail (TTC)'),
  (2, 'Tarif Flottes & Entreprises (HT)'),
  (3, 'Tarif Promo Lubrifiants & Boutiques');
`);

// 6. Fournisseurs
console.log('🤝 Insertion des fournisseurs...');
db.exec(`
  INSERT INTO business_partners (CardCode, CardName, CardType) VALUES
  ('F0001', 'TOTALENERGIES LUBRICANTS SENEGAL', 'cSupplier'),
  ('F0002', 'VIVO ENERGY SENEGAL (SHELL)', 'cSupplier'),
  ('F0003', 'ELTON DISTRIBUTION DIRECTE', 'cSupplier'),
  ('F0004', 'CASTROL AFRIQUE DE L''OUEST', 'cSupplier'),
  ('F0005', 'MOTUL SENEGAL SARL', 'cSupplier');
`);

// 7. Articles du catalogue Elton Oil
console.log('📦 Insertion du catalogue articles...');
const articles = [
  // Huiles moteur Synthétiques & Diesel
  { code: 'ELT-SYN-5W40', name: 'Elton Synthèse Platine 5W40 5L', barcode: '370001001001', stock: 45, pcb: 4, p1: 28500, p2: 24000, p3: 26000, uom: 'Bidon 5L', fam: 'Huiles Synthèse', sup: 'F0001' },
  { code: 'ELT-SYN-5W30', name: 'Elton Éco Synthèse 5W30 C3 5L', barcode: '370001001010', stock: 32, pcb: 4, p1: 29500, p2: 25000, p3: 27000, uom: 'Bidon 5L', fam: 'Huiles Synthèse', sup: 'F0001' },
  { code: 'ELT-DSL-15W40', name: 'Elton Diesel Force 15W40 5L', barcode: '370001001002', stock: 80, pcb: 4, p1: 19500, p2: 16500, p3: 18000, uom: 'Bidon 5L', fam: 'Huiles Diesel', sup: 'F0001' },
  { code: 'ELT-DSL-TURBO', name: 'Elton Turbo Diesel HD 15W40 20L', barcode: '370001001011', stock: 15, pcb: 1, p1: 68000, p2: 58000, p3: 62000, uom: 'Fût 20L', fam: 'Huiles Poids Lourds', sup: 'F0001' },
  { code: 'ELT-MOT-20W50', name: 'Elton Moteur Classic 20W50 1L', barcode: '370001001003', stock: 120, pcb: 12, p1: 4500, p2: 3800, p3: 4200, uom: 'Bidon 1L', fam: 'Huiles Minérales', sup: 'F0001' },
  { code: 'ELT-MOT-20W50-5L', name: 'Elton Moteur Classic 20W50 5L', barcode: '370001001012', stock: 65, pcb: 4, p1: 17500, p2: 14800, p3: 16000, uom: 'Bidon 5L', fam: 'Huiles Minérales', sup: 'F0001' },
  { code: 'ELT-MOTO-2T', name: 'Elton Super Moto 2T 1L', barcode: '370001001013', stock: 90, pcb: 12, p1: 3200, p2: 2700, p3: 2900, uom: 'Bidon 1L', fam: 'Motos & Scooters', sup: 'F0003' },
  { code: 'ELT-MOTO-4T', name: 'Elton Performance 4T 10W40 1L', barcode: '370001001014', stock: 75, pcb: 12, p1: 4800, p2: 4100, p3: 4400, uom: 'Bidon 1L', fam: 'Motos & Scooters', sup: 'F0003' },

  // Liquides techniques & Refroidissement
  { code: 'ELT-COOL-VERT', name: 'Elton Liquide Refroidissement Vert -25°C 4L', barcode: '370001001004', stock: 35, pcb: 6, p1: 8500, p2: 7200, p3: 7900, uom: 'Bidon 4L', fam: 'Refroidissement', sup: 'F0003' },
  { code: 'ELT-COOL-ROUGE', name: 'Elton Antigel Organique Rouge 5L', barcode: '370001001015', stock: 28, pcb: 4, p1: 11500, p2: 9800, p3: 10500, uom: 'Bidon 5L', fam: 'Refroidissement', sup: 'F0003' },
  { code: 'ELT-BRK-DOT4', name: 'Elton Liquide de Frein DOT4 500ml', barcode: '370001001005', stock: 60, pcb: 24, p1: 3500, p2: 2900, p3: 3200, uom: 'Flacon 500ml', fam: 'Freinage', sup: 'F0002' },
  { code: 'ELT-BRK-DOT5', name: 'Elton Liquide Frein Racing DOT 5.1 500ml', barcode: '370001001016', stock: 24, pcb: 24, p1: 5200, p2: 4400, p3: 4800, uom: 'Flacon 500ml', fam: 'Freinage', sup: 'F0002' },

  // Huiles de transmission
  { code: 'ELT-TRM-80W90', name: 'Elton Boîte & Pont 80W90 2L', barcode: '370001001017', stock: 40, pcb: 6, p1: 9000, p2: 7600, p3: 8200, uom: 'Bidon 2L', fam: 'Transmissions', sup: 'F0001' },
  { code: 'ELT-ATF-DEX3', name: 'Elton Fluide Boîte Auto ATF Dexron III 1L', barcode: '370001001018', stock: 55, pcb: 12, p1: 5500, p2: 4700, p3: 5000, uom: 'Bidon 1L', fam: 'Transmissions', sup: 'F0002' },

  // Filtration
  { code: 'ELT-FLT-OIL01', name: 'Filtre à Huile Universel H1 (Petits Moteurs)', barcode: '370001001006', stock: 95, pcb: 10, p1: 5000, p2: 4200, p3: 4500, uom: 'Unité', fam: 'Filtration', sup: 'F0003' },
  { code: 'ELT-FLT-OIL02', name: 'Filtre à Huile HD2 (Diesel & 4x4)', barcode: '370001001019', stock: 48, pcb: 10, p1: 6500, p2: 5500, p3: 5900, uom: 'Unité', fam: 'Filtration', sup: 'F0003' },
  { code: 'ELT-FLT-AIR01', name: 'Filtre à Air Spécial Poussière A1', barcode: '370001001007', stock: 0, pcb: 10, p1: 7500, p2: 6000, p3: 6800, uom: 'Unité', fam: 'Filtration', sup: 'F0003' }, // Rupture volontaire pour tester les alertes KPIs
  { code: 'ELT-FLT-GAS01', name: 'Filtre à Gasoil Haute Efficacité F1', barcode: '370001001020', stock: 35, pcb: 10, p1: 8000, p2: 6800, p3: 7400, uom: 'Unité', fam: 'Filtration', sup: 'F0003' },

  // Entretien & Boutique
  { code: 'ELT-LAV-GLAS', name: 'Lave-Glace Démoustiquant Toutes Saisons 5L', barcode: '370001001008', stock: 50, pcb: 4, p1: 4000, p2: 3200, p3: 3600, uom: 'Bidon 5L', fam: 'Entretien', sup: 'F0003' },
  { code: 'ELT-DEG-400ML', name: 'Dégraissant & Nettoyant Freins Spray 400ml', barcode: '370001001021', stock: 70, pcb: 12, p1: 3000, p2: 2400, p3: 2700, uom: 'Aérosol 400ml', fam: 'Entretien', sup: 'F0004' },
  { code: 'ELT-ADD-DSL', name: 'Additif Nettoyant Injecteurs Diesel 250ml', barcode: '370001001022', stock: 42, pcb: 12, p1: 6000, p2: 5100, p3: 5500, uom: 'Flacon 250ml', fam: 'Additifs', sup: 'F0005' },
  { code: 'ELT-EAU-DEMIN', name: 'Eau Déminéralisée Batterie & Radiateur 1L', barcode: '370001001023', stock: 0, pcb: 12, p1: 1200, p2: 950, p3: 1100, uom: 'Bouteille 1L', fam: 'Entretien', sup: 'F0003' }, // Deuxième article en rupture
];

const insertItem = db.prepare(`
  INSERT INTO items (ItemCode, ItemName, BarCode, QuantityOnStock, U_PCB, Mainsupplier, InventoryUOM, U_sous_fam)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertPrice = db.prepare(`
  INSERT INTO item_prices (ItemCode, PriceList, Price, Currency) VALUES (?, ?, ?, 'XOF')
`);
const insertWhs = db.prepare(`
  INSERT INTO item_warehouses (ItemCode, WarehouseCode, InStock, Committed, Ordered) VALUES (?, ?, ?, ?, ?)
`);

articles.forEach(art => {
  insertItem.run(art.code, art.name, art.barcode, art.stock, art.pcb, art.sup, art.uom, art.fam);
  insertPrice.run(art.code, 1, art.p1);
  insertPrice.run(art.code, 2, art.p2);
  insertPrice.run(art.code, 3, art.p3);

  // Ventilation dans les magasins
  // 01 Magasin Central (50%)
  insertWhs.run(art.code, '01', Math.floor(art.stock * 0.5), 0, 10);
  // 02 Station VDN (25%)
  insertWhs.run(art.code, '02', Math.floor(art.stock * 0.25), 0, 5);
  // 03 Station Autoroute (15%)
  insertWhs.run(art.code, '03', Math.floor(art.stock * 0.15), 0, 0);
  // 04 Station Almadies (10%)
  insertWhs.run(art.code, '04', Math.floor(art.stock * 0.10), 0, 0);
  // 05 Station Thiès
  insertWhs.run(art.code, '05', 0, 0, 0);
});

// 8. Documents d'Inventaire en cours
console.log('📋 Insertion des inventaires...');
db.exec(`
  INSERT INTO inventory_countings (DocEntry, DocNum, CountDate, DocumentStatus, Remarks)
  VALUES
  (101, 101, datetime('now'), 'cdsOpen', 'Inventaire Mensuel Station VDN & Dépôt Hann'),
  (102, 102, datetime('now', '-2 days'), 'cdsOpen', 'Contrôle Tournant Lubrifiants Station Autoroute');

  INSERT INTO inventory_counting_lines (DocEntry, LineNum, ItemCode, ItemDescription, WarehouseCode, Freeze, Counted, CountedQuantity)
  VALUES
  (101, 0, 'ELT-SYN-5W40', 'Elton Synthèse Platine 5W40 5L', '01', 'tNO', 'tYES', 30),
  (101, 1, 'ELT-DSL-15W40', 'Elton Diesel Force 15W40 5L', '01', 'tNO', 'tNO', 0),
  (101, 2, 'ELT-COOL-VERT', 'Elton Liquide Refroidissement Vert -25°C 4L', '01', 'tNO', 'tNO', 0),
  (101, 3, 'ELT-FLT-OIL01', 'Filtre à Huile Universel H1', '01', 'tNO', 'tYES', 65),
  (101, 4, 'ELT-MOT-20W50', 'Elton Moteur Classic 20W50 1L', '01', 'tNO', 'tYES', 80),
  (101, 5, 'ELT-FLT-AIR01', 'Filtre à Air Spécial Poussière A1', '01', 'tNO', 'tNO', 0),

  (102, 0, 'ELT-SYN-5W30', 'Elton Éco Synthèse 5W30 C3 5L', '03', 'tNO', 'tYES', 8),
  (102, 1, 'ELT-DSL-TURBO', 'Elton Turbo Diesel HD 15W40 20L', '03', 'tNO', 'tNO', 0);
`);

// 9. Commandes Fournisseurs ouvertes (BC en attente de réception)
console.log('🚚 Insertion des commandes fournisseurs (réceptions)...');
db.exec(`
  INSERT INTO purchase_orders (DocEntry, DocNum, CardCode, CardName, DocDate, DocDueDate, DocTotal, NumAtCard, Comments, DocumentStatus)
  VALUES
  (501, 501, 'F0001', 'TOTALENERGIES LUBRICANTS SENEGAL', date('now', '-3 days'), date('now', '+4 days'), 1850000, 'BC-ELT-2026-08', 'Commande réapprovisionnement huiles moteur', 'bost_Open'),
  (502, 502, 'F0003', 'ELTON DISTRIBUTION DIRECTE', date('now', '-1 days'), date('now', '+6 days'), 920000, 'BC-ELT-2026-09', 'Réassort filtration et liquides de refroidissement', 'bost_Open'),
  (503, 503, 'F0002', 'VIVO ENERGY SENEGAL (SHELL)', date('now'), date('now', '+7 days'), 450000, 'BC-ELT-2026-10', 'Commande liquides de freins DOT4', 'bost_Open');

  INSERT INTO purchase_order_lines (DocEntry, LineNum, ItemCode, ItemDescription, Quantity, OpenQty, Price, WarehouseCode)
  VALUES
  (501, 0, 'ELT-SYN-5W40', 'Elton Synthèse Platine 5W40 5L', 50, 50, 22000, '01'),
  (501, 1, 'ELT-DSL-15W40', 'Elton Diesel Force 15W40 5L', 40, 40, 15000, '01'),

  (502, 0, 'ELT-COOL-VERT', 'Elton Liquide Refroidissement Vert -25°C 4L', 60, 60, 6500, '01'),
  (502, 1, 'ELT-FLT-OIL01', 'Filtre à Huile Universel H1', 100, 100, 3800, '02'),
  (502, 2, 'ELT-FLT-AIR01', 'Filtre à Air Spécial Poussière A1', 50, 50, 5200, '01'),

  (503, 0, 'ELT-BRK-DOT4', 'Elton Liquide de Frein DOT4 500ml', 120, 120, 2600, '02');
`);

// 10. Sorties de stock récentes
console.log('📤 Insertion des sorties de marchandises...');
db.exec(`
  INSERT INTO inventory_gen_exits (DocNum, DocDate, Comments, U_MotifSortie, U_UtilisateurMob) VALUES
  (9001, datetime('now', '-5 days'), 'Bidon percé lors de la manutention dépôt', 'Casse', 'RESP_MAG'),
  (9002, datetime('now', '-2 days'), 'Lubrification pont élévateur atelier station VDN', 'Consommation interne', 'OP_VDN'),
  (9003, datetime('now', '-1 days'), 'Flacon DOT4 date dépassée retiré du rayon', 'Périmé', 'OP_AUTOROUTE');
`);

// 11. Journal d'activité mobile
console.log("📝 Insertion de l'historique d'activité mobile...");
db.exec(`
  INSERT INTO ga_mob_activity (U_TypeDoc, U_DocNum, U_DocDate, U_UtilisateurMob, U_WhsCode, U_Commentaire) VALUES
  ('SORTIE', '9001', datetime('now', '-5 days'), 'RESP_MAG', '01', 'Sortie casse 1x ELT-SYN-5W40'),
  ('INVENTAIRE', '101', datetime('now', '-3 days'), 'OP_VDN', '02', 'Comptage partiel 4 articles'),
  ('SORTIE', '9002', datetime('now', '-2 days'), 'OP_VDN', '02', 'Consommation interne atelier VDN'),
  ('PRIX', 'ELT-SYN-5W40', datetime('now', '-1 days'), 'ADMIN', '01', 'Mise à jour tarif générale station : 28500 FCFA'),
  ('RECEPTION', '7001', datetime('now', '-1 days'), 'RESP_MAG', '01', 'Réception partielle BC-ELT-2026-08');
`);

console.log('✅ Base de test ELTON OIL peuplée avec succès !');
console.log('----------------------------------------------------');
console.log('Comptes disponibles pour se connecter :');
console.log('  👑 ADMIN (Administrateur)       : MDP = Admin123!');
console.log('  👨‍💼 RESP_MAG (Magasin Central)  : MDP = Elton2026!');
console.log('  👩‍🔧 OP_VDN (Station VDN)        : MDP = Elton2026!');
console.log('  👨‍🔧 OP_AUTOROUTE (Station Auto) : MDP = Elton2026!');
console.log('  🧪 DEMO (Mode démo)             : MDP = 123456');
console.log('----------------------------------------------------');
