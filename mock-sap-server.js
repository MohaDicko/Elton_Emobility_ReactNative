/**
 * Serveur Mock SAP Service Layer avec Base SQLite locale
 * Spécifique pour les tests de l'application ELTON OIL COMPANY
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'elton_test.sqlite');
const PORT = 50000;

// ─── Initialisation de la Base de Données SQLite ──────────────────────────────
function initDatabase() {
  const isNew = !fs.existsSync(DB_PATH);
  const db = new DatabaseSync(DB_PATH);

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

  // Seeding des données initiales si nouvelle base
  const countItems = db.prepare('SELECT count(*) as total FROM items').get().total;
  if (countItems === 0) {
    console.log('🌱 Insertion des données de test ELTON OIL...');

    // Dépôts
    db.exec(`
      INSERT INTO warehouses (WarehouseCode, WarehouseName) VALUES
      ('01', 'Magasin Central Elton (Dakar)'),
      ('02', 'Station Elton VDN'),
      ('03', 'Station Elton Autoroute');
    `);

    // Listes de Prix
    db.exec(`
      INSERT INTO price_lists (PriceListNo, PriceListName) VALUES
      (1, 'Tarif Général Station / Détail'),
      (2, 'Tarif Gros / Flottes Entreprises'),
      (3, 'Tarif Promo Lubrifiants');
    `);

    // Fournisseurs
    db.exec(`
      INSERT INTO business_partners (CardCode, CardName, CardType) VALUES
      ('F0001', 'TOTALENERGIES LUBRICANTS SENEGAL', 'cSupplier'),
      ('F0002', 'SHELL / VIVO ENERGY AFRIQUE', 'cSupplier'),
      ('F0003', 'ELTON DISTRIBUTION DIRECTE', 'cSupplier');
    `);

    // Articles Elton Oil
    const articles = [
      { code: 'ELT-SYN-5W40', name: 'Elton Synthèse Platine 5W40 5L', barcode: '370001001001', stock: 45, pcb: 4, p1: 28500, p2: 24000, p3: 26000 },
      { code: 'ELT-DSL-15W40', name: 'Elton Diesel Force 15W40 5L', barcode: '370001001002', stock: 80, pcb: 4, p1: 19500, p2: 16500, p3: 18000 },
      { code: 'ELT-MOT-20W50', name: 'Elton Moteur Classic 20W50 1L', barcode: '370001001003', stock: 120, pcb: 12, p1: 4500, p2: 3800, p3: 4200 },
      { code: 'ELT-COOL-VERT', name: 'Elton Liquide Refroidissement Vert 4L', barcode: '370001001004', stock: 35, pcb: 6, p1: 8500, p2: 7200, p3: 7900 },
      { code: 'ELT-BRK-DOT4', name: 'Elton Liquide de Frein DOT4 500ml', barcode: '370001001005', stock: 60, pcb: 24, p1: 3500, p2: 2900, p3: 3200 },
      { code: 'ELT-FLT-OIL01', name: 'Filtre à Huile Universel H1', barcode: '370001001006', stock: 95, pcb: 10, p1: 5000, p2: 4200, p3: 4500 },
      { code: 'ELT-FLT-AIR01', name: 'Filtre à Air Spécial Poussière', barcode: '370001001007', stock: 30, pcb: 10, p1: 7500, p2: 6000, p3: 6800 },
      { code: 'ELT-LAV-GLAS', name: 'Lave-Glace Dégraissant 5L', barcode: '370001001008', stock: 50, pcb: 4, p1: 4000, p2: 3200, p3: 3600 }
    ];

    const insertItem = db.prepare(`
      INSERT INTO items (ItemCode, ItemName, BarCode, QuantityOnStock, U_PCB, Mainsupplier)
      VALUES (?, ?, ?, ?, ?, 'F0001')
    `);
    const insertPrice = db.prepare(`
      INSERT INTO item_prices (ItemCode, PriceList, Price) VALUES (?, ?, ?)
    `);
    const insertWhs = db.prepare(`
      INSERT INTO item_warehouses (ItemCode, WarehouseCode, InStock) VALUES (?, ?, ?)
    `);

    articles.forEach(art => {
      insertItem.run(art.code, art.name, art.barcode, art.stock, art.pcb);
      insertPrice.run(art.code, 1, art.p1);
      insertPrice.run(art.code, 2, art.p2);
      insertPrice.run(art.code, 3, art.p3);
      insertWhs.run(art.code, '01', art.stock * 0.7);
      insertWhs.run(art.code, '02', art.stock * 0.3);
    });

    // Document d'Inventaire en cours (DocEntry: 101)
    db.exec(`
      INSERT INTO inventory_countings (DocEntry, DocNum, CountDate, DocumentStatus, Remarks)
      VALUES (101, 101, datetime('now'), 'cdsOpen', 'Inventaire Mensuel Station & Dépôt');

      INSERT INTO inventory_counting_lines (DocEntry, LineNum, ItemCode, ItemDescription, WarehouseCode, Freeze, Counted, CountedQuantity)
      VALUES
      (101, 0, 'ELT-SYN-5W40', 'Elton Synthèse Platine 5W40 5L', '01', 'tNO', 'tYES', 30),
      (101, 1, 'ELT-DSL-15W40', 'Elton Diesel Force 15W40 5L', '01', 'tNO', 'tNO', 0),
      (101, 2, 'ELT-COOL-VERT', 'Elton Liquide Refroidissement Vert 4L', '01', 'tNO', 'tNO', 0),
      (101, 3, 'ELT-FLT-OIL01', 'Filtre à Huile Universel H1', '01', 'tNO', 'tYES', 65);
    `);

    // Commande Fournisseur ouverte (DocEntry: 501)
    db.exec(`
      INSERT INTO purchase_orders (DocEntry, DocNum, CardCode, CardName, DocDate, DocDueDate, DocTotal, NumAtCard, Comments, DocumentStatus)
      VALUES (501, 501, 'F0001', 'TOTALENERGIES LUBRICANTS SENEGAL', date('now'), date('now', '+7 days'), 1850000, 'BC-ELT-2026-08', 'Commande réapprovisionnement lubrifiants', 'bost_Open');

      INSERT INTO purchase_order_lines (DocEntry, LineNum, ItemCode, ItemDescription, Quantity, OpenQty, Price, WarehouseCode)
      VALUES
      (501, 0, 'ELT-SYN-5W40', 'Elton Synthèse Platine 5W40 5L', 50, 50, 22000, '01'),
      (501, 1, 'ELT-DSL-15W40', 'Elton Diesel Force 15W40 5L', 40, 40, 15000, '01');
    `);

    console.log('✅ Base de test SQLite ELTON initialisée avec succès !');
  }

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO ga_users (Code, Name, U_Password, U_IsAdmin, U_MustChangePwd, U_WhsCode)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('ADMIN', 'Administrateur Elton', crypto.createHash('sha256').update('Admin123!').digest('hex'), 'Y', 'N', '01');
  insertUser.run('RESP_MAG', 'Responsable magasin', crypto.createHash('sha256').update('Resp123!').digest('hex'), 'N', 'N', '01');

  const insertExtraItem = db.prepare(`
    INSERT OR IGNORE INTO items (ItemCode, ItemName, BarCode, QuantityOnStock, U_PCB, Mainsupplier)
    VALUES (?, ?, ?, ?, ?, 'F0001')
  `);
  const insertExtraPrice = db.prepare(`
    INSERT OR IGNORE INTO item_prices (ItemCode, PriceList, Price) VALUES (?, ?, ?)
  `);
  const insertExtraWarehouse = db.prepare(`
    INSERT OR IGNORE INTO item_warehouses (ItemCode, WarehouseCode, InStock) VALUES (?, '01', ?)
  `);
  [
    ['ELT-GREASE-01', 'Elton Graisse Multi-Usage 1kg', '370001001009', 25, 12, 6500],
    ['ELT-FLUID-01', 'Elton Liquide Hydraulique 1L', '370001001010', 40, 12, 5500],
  ].forEach(([code, name, barcode, stock, pcb, price]) => {
    insertExtraItem.run(code, name, barcode, stock, pcb);
    insertExtraPrice.run(code, 1, price);
    insertExtraWarehouse.run(code, stock);
  });

  const activityCount = db.prepare('SELECT count(*) AS total FROM ga_mob_activity').get().total;
  if (activityCount < 4) {
    const insertActivity = db.prepare(`
      INSERT INTO ga_mob_activity
        (U_TypeDoc, U_DocNum, U_DocDate, U_UtilisateurMob, U_WhsCode, U_Commentaire)
      VALUES (?, ?, datetime('now'), ?, ?, ?)
    `);
    for (let index = activityCount; index < 4; index += 1) {
      insertActivity.run('SYSTEME', `INIT-${index + 1}`, 'ADMIN', '01', 'Activité initiale de test');
    }
  }

  return db;
}

const db = initDatabase();

// ─── Serveur HTTP Mock SAP Service Layer ──────────────────────────────────────
const server = http.createServer((req, res) => {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, B1SESSION');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsedBody = {};
    if (body) {
      try { parsedBody = JSON.parse(body); } catch (_) {}
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // Helper pour répondre en JSON
    const sendJson = (status, data, extraHeaders = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
      res.end(JSON.stringify(data));
    };

    // Helper OData format
    const sendOData = (status, rows) => {
      sendJson(status, { 'odata.metadata': 'mock-metadata', value: rows });
    };

    try {
      // 1. Authentification SAP
      if (pathname === '/b1s/v1/Login') {
        res.setHeader('Set-Cookie', 'B1SESSION=mock-sap-session-token-elton; Path=/; HttpOnly');
        sendJson(200, {
          SessionId: 'mock-sap-session-token-elton',
          Version: '10.00.220',
          SessionTimeout: 30
        });
        return;
      }

      if (pathname === '/b1s/v1/Logout') {
        sendJson(204, {});
        return;
      }

      // 2. Warehouses
      if (pathname === '/b1s/v1/Warehouses') {
        const rows = db.prepare('SELECT WarehouseCode, WarehouseName FROM warehouses').all();
        sendOData(200, rows);
        return;
      }

      // 3. PriceLists
      if (pathname === '/b1s/v1/PriceLists') {
        const rows = db.prepare('SELECT PriceListNo, PriceListName FROM price_lists ORDER BY PriceListNo').all();
        sendOData(200, rows);
        return;
      }

      // 4. BusinessPartners (Suppliers)
      if (pathname === '/b1s/v1/BusinessPartners') {
        const rows = db.prepare("SELECT CardCode, CardName, CardType FROM business_partners WHERE CardType = 'cSupplier'").all();
        sendOData(200, rows);
        return;
      }

      // 4b. Utilisateurs applicatifs
      if (pathname === '/b1s/v1/GA_USERS') {
        if (req.method === 'GET') {
          const rows = db.prepare('SELECT Code, Name, U_IsAdmin, U_MustChangePwd, U_WhsCode FROM ga_users ORDER BY Code').all();
          sendOData(200, rows);
          return;
        }
        if (req.method === 'POST') {
          db.prepare(`
            INSERT INTO ga_users (Code, Name, U_Password, U_IsAdmin, U_MustChangePwd, U_WhsCode)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            parsedBody.Code,
            parsedBody.Name || parsedBody.Code,
            parsedBody.U_Password || '',
            parsedBody.U_IsAdmin || 'N',
            parsedBody.U_MustChangePwd || 'Y',
            parsedBody.U_WhsCode || '01'
          );
          sendJson(201, parsedBody);
          return;
        }
      }

      const userDetailMatch = pathname.match(/^\/b1s\/v1\/GA_USERS\('([^']+)'\)$/);
      if (userDetailMatch) {
        const userCode = decodeURIComponent(userDetailMatch[1]);
        if (req.method === 'GET') {
          const user = db.prepare('SELECT * FROM ga_users WHERE Code = ?').get(userCode);
          if (!user) {
            sendJson(404, { error: { message: { value: 'Utilisateur non trouvé' } } });
            return;
          }
          sendJson(200, user);
          return;
        }
        if (req.method === 'PATCH') {
          const allowedFields = ['Name', 'U_Password', 'U_IsAdmin', 'U_MustChangePwd', 'U_WhsCode'];
          const updates = allowedFields.filter(field => parsedBody[field] !== undefined);
          if (updates.length > 0) {
            const assignments = updates.map(field => `${field} = ?`).join(', ');
            db.prepare(`UPDATE ga_users SET ${assignments} WHERE Code = ?`).run(
              ...updates.map(field => parsedBody[field]),
              userCode
            );
          }
          sendJson(204, {});
          return;
        }
      }

      // 5. Items (Collection)
      if (pathname === '/b1s/v1/Items' && req.method === 'GET') {
        const filter = url.searchParams.get('$filter') || '';
        let query = "SELECT * FROM items WHERE Frozen = 'tNO'";
        const params = [];

        // Filtre BarCode
        const barcodeMatch = filter.match(/BarCode eq '([^']+)'/);
        if (barcodeMatch) {
          query += ' AND BarCode = ?';
          params.push(barcodeMatch[1]);
        }

        // Filtre startswith ItemName
        const nameMatch = filter.match(/startswith\(ItemName,'([^']+)'\)/);
        if (nameMatch) {
          query += ' AND ItemName LIKE ?';
          params.push(`${nameMatch[1]}%`);
        }

        // Filtre startswith ItemCode
        const codeMatch = filter.match(/startswith\(ItemCode,'([^']+)'\)/);
        if (codeMatch) {
          query += ' AND ItemCode LIKE ?';
          params.push(`${codeMatch[1]}%`);
        }

        const rows = db.prepare(query).all(...params);
        sendOData(200, rows);
        return;
      }

      // 6. Item Detail GET & PATCH
      const itemDetailMatch = pathname.match(/^\/b1s\/v1\/Items\('([^']+)'\)$/);
      if (itemDetailMatch) {
        const itemCode = decodeURIComponent(itemDetailMatch[1]);

        if (req.method === 'GET') {
          const item = db.prepare('SELECT * FROM items WHERE ItemCode = ?').get(itemCode);
          if (!item) {
            sendJson(404, { error: { code: -2028, message: { value: 'Article non trouvé' } } });
            return;
          }

          const prices = db.prepare('SELECT PriceList, Price, Currency FROM item_prices WHERE ItemCode = ?').all(itemCode);
          const warehouses = db.prepare('SELECT WarehouseCode, InStock, Committed, Ordered FROM item_warehouses WHERE ItemCode = ?').all(itemCode);

          item.ItemPrices = prices;
          item.ItemWarehouseInfoCollection = warehouses;
          sendJson(200, item);
          return;
        }

        if (req.method === 'PATCH') {
          // Mise à jour de prix (Module 8 Elton)
          if (parsedBody.ItemPrices && Array.isArray(parsedBody.ItemPrices)) {
            const updatePrice = db.prepare(`
              INSERT INTO item_prices (ItemCode, PriceList, Price, Currency)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(ItemCode, PriceList) DO UPDATE SET Price = excluded.Price
            `);
            parsedBody.ItemPrices.forEach(p => {
              if (p.PriceList && p.Price !== undefined) {
                updatePrice.run(itemCode, p.PriceList, p.Price, p.Currency || 'XOF');
              }
            });
          }
          sendJson(204, {});
          return;
        }
      }

      // 7. InventoryCountings (Inventaires Module 6 Elton)
      if (pathname === '/b1s/v1/InventoryCountings' && req.method === 'GET') {
        const rows = db.prepare("SELECT * FROM inventory_countings WHERE DocumentStatus = 'cdsOpen'").all();
        sendOData(200, rows);
        return;
      }

      const invDetailMatch = pathname.match(/^\/b1s\/v1\/InventoryCountings\((\d+)\)$/);
      if (invDetailMatch) {
        const docEntry = parseInt(invDetailMatch[1], 10);

        if (req.method === 'GET') {
          const doc = db.prepare('SELECT * FROM inventory_countings WHERE DocEntry = ?').get(docEntry);
          if (!doc) {
            sendJson(404, { error: { message: { value: 'Document d’inventaire non trouvé' } } });
            return;
          }
          const lines = db.prepare('SELECT * FROM inventory_counting_lines WHERE DocEntry = ? ORDER BY LineNum').all(docEntry);
          doc.InventoryCountingLines = lines;
          sendJson(200, doc);
          return;
        }

        if (req.method === 'PATCH') {
          if (parsedBody.InventoryCountingLines && Array.isArray(parsedBody.InventoryCountingLines)) {
            const updateLine = db.prepare(`
              UPDATE inventory_counting_lines
              SET Counted = ?, CountedQuantity = ?
              WHERE DocEntry = ? AND LineNum = ?
            `);
            parsedBody.InventoryCountingLines.forEach(l => {
              updateLine.run(l.Counted || 'tYES', l.CountedQuantity, docEntry, l.LineNum);
            });
          }
          sendJson(204, {});
          return;
        }
      }

      // 8. PurchaseOrders (Commandes Fournisseurs)
      if (pathname === '/b1s/v1/PurchaseOrders' && req.method === 'GET') {
        const rows = db.prepare("SELECT * FROM purchase_orders WHERE DocumentStatus = 'bost_Open'").all();
        sendJson(200, { 'odata.metadata': 'mock-metadata', 'odata.count': rows.length, value: rows });
        return;
      }

      if (pathname === '/b1s/v1/PurchaseOrders' && req.method === 'POST') {
        const docEntry = Date.now() % 100000;
        db.prepare(`
          INSERT INTO purchase_orders
            (DocEntry, DocNum, CardCode, DocDate, DocDueDate, DocTotal, NumAtCard, Comments, DocumentStatus)
          VALUES (?, ?, ?, date('now'), ?, ?, ?, ?, 'bost_Open')
        `).run(
          docEntry,
          docEntry,
          parsedBody.CardCode || '',
          parsedBody.DocDueDate || null,
          parsedBody.DocTotal || 0,
          parsedBody.NumAtCard || '',
          parsedBody.Comments || ''
        );
        const insertLine = db.prepare(`
          INSERT INTO purchase_order_lines
            (DocEntry, LineNum, ItemCode, ItemDescription, Quantity, OpenQty, Price, WarehouseCode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        (parsedBody.DocumentLines || []).forEach((line, index) => {
          insertLine.run(
            docEntry,
            index,
            line.ItemCode || '',
            line.ItemDescription || '',
            line.Quantity || 0,
            line.Quantity || 0,
            line.UnitPrice || line.Price || 0,
            line.WarehouseCode || '01'
          );
        });
        sendJson(201, { DocEntry: docEntry, DocNum: docEntry });
        return;
      }

      const poDetailMatch = pathname.match(/^\/b1s\/v1\/PurchaseOrders\((\d+)\)$/);
      if (poDetailMatch) {
        const docEntry = parseInt(poDetailMatch[1], 10);
        const po = db.prepare('SELECT * FROM purchase_orders WHERE DocEntry = ?').get(docEntry);
        if (!po) {
          sendJson(404, { error: { message: { value: 'Commande non trouvée' } } });
          return;
        }
        po.DocumentLines = db.prepare('SELECT * FROM purchase_order_lines WHERE DocEntry = ?').all(docEntry);
        sendJson(200, po);
        return;
      }

      // 9. PurchaseDeliveryNotes (Création Réception Fournisseur)
      if (pathname === '/b1s/v1/PurchaseDeliveryNotes' && req.method === 'POST') {
        // Enregistre et clôture partiellement les PO lines
        if (parsedBody.DocumentLines) {
          const updatePoLine = db.prepare(`
            UPDATE purchase_order_lines
            SET OpenQty = MAX(0, OpenQty - ?)
            WHERE DocEntry = ? AND LineNum = ?
          `);
          parsedBody.DocumentLines.forEach(l => {
            if (l.BaseEntry && l.BaseLine !== undefined) {
              updatePoLine.run(l.Quantity || 0, l.BaseEntry, l.BaseLine);
            }
          });
        }
        sendJson(201, { DocEntry: Date.now() % 100000, DocNum: 7001 });
        return;
      }

      // 10. InventoryGenExits (Sorties de Marchandises)
      if (pathname === '/b1s/v1/InventoryGenExits' && req.method === 'POST') {
        const insertExit = db.prepare(`
          INSERT INTO inventory_gen_exits (DocNum, DocDate, Comments, U_MotifSortie, U_UtilisateurMob)
          VALUES (?, datetime('now'), ?, ?, ?)
        `);
        const resInsert = insertExit.run(
          Date.now() % 100000,
          parsedBody.Comments || '',
          parsedBody.U_MotifSortie || 'Consommation interne',
          parsedBody.U_UtilisateurMob || 'DEMO'
        );
        sendJson(201, { DocEntry: Number(resInsert.lastInsertRowid), DocNum: 9001 });
        return;
      }

      if (pathname === '/b1s/v1/InventoryGenExits' && req.method === 'GET') {
        const rows = db.prepare('SELECT * FROM inventory_gen_exits ORDER BY DocEntry DESC').all();
        sendJson(200, { 'odata.metadata': 'mock-metadata', 'odata.count': rows.length, value: rows });
        return;
      }

      if (pathname === '/b1s/v1/BarCodes' && req.method === 'GET') {
        const rows = db.prepare('SELECT ItemCode, BarCode FROM items WHERE BarCode IS NOT NULL').all();
        sendOData(200, rows);
        return;
      }

      // 11. Journal d'activité mobile
      if (pathname === '/b1s/v1/U_GA_MOB_ACTIVITY') {
        if (req.method === 'POST') {
          const insertAct = db.prepare(`
            INSERT INTO ga_mob_activity (U_TypeDoc, U_DocNum, U_DocDate, U_UtilisateurMob, U_WhsCode, U_Commentaire)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          insertAct.run(
            parsedBody.U_TypeDoc || 'PRIX',
            parsedBody.U_DocNum || '',
            parsedBody.U_DocDate || new Date().toISOString(),
            parsedBody.U_UtilisateurMob || 'ADMIN',
            parsedBody.U_WhsCode || '01',
            parsedBody.U_Commentaire || ''
          );
          sendJson(201, { DocEntry: 1 });
          return;
        }

        if (req.method === 'GET') {
          const rows = db.prepare('SELECT * FROM ga_mob_activity ORDER BY DocEntry DESC LIMIT 100').all();
          sendOData(200, rows);
          return;
        }
      }

      // 12. Requêtes SQL SAP (SQLQueries)
      if (pathname.startsWith('/b1s/v1/SQLQueries')) {
        if (pathname.includes("GA_AUTH_USER")) {
          const params = parsedBody.ParamList || '';
          const userCode = (params.match(/UserCode='([^']*)'/) || [])[1];
          const hashedPassword = (params.match(/HashedPwd='([^']*)'/) || [])[1];
          const rows = db.prepare(`
            SELECT Code, Name, U_IsAdmin, U_MustChangePwd, U_WhsCode
            FROM ga_users
            WHERE Code = ? AND U_Password = ?
          `).all(userCode, hashedPassword);
          sendOData(200, rows);
          return;
        }
        sendOData(200, []);
        return;
      }

      // Par défaut
      sendJson(404, { error: { message: { value: `Route non gérée: ${pathname}` } } });
    } catch (err) {
      console.error('Erreur Mock SAP:', err);
      sendJson(500, { error: { message: { value: err.message } } });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Mock SAP Service Layer démarré sur le port ${PORT}`);
  console.log(`📁 Base de données SQLite : ${DB_PATH}`);
  console.log('====================================================');
});
