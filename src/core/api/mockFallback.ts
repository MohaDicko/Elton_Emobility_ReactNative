/**
 * Gestionnaire de secours (fallback) autonome Elton Oil
 * Permet à l'application de fonctionner 24/7 sur Vercel même sans serveur SAP connecté
 */
import {
  MOCK_ELTON_ARTICLES,
  MOCK_ELTON_PRICE_LISTS,
  MOCK_ELTON_WAREHOUSES,
  MOCK_ELTON_SUPPLIERS,
  MOCK_ELTON_INVENTORIES,
  MOCK_ELTON_PURCHASE_ORDERS,
  MOCK_ELTON_USERS,
} from './demoData';

// Stockage dynamique en mémoire pour les interactions des testeurs sur Vercel
let localArticles = [...MOCK_ELTON_ARTICLES];
let localInventories = JSON.parse(JSON.stringify(MOCK_ELTON_INVENTORIES));
let localPurchaseOrders = JSON.parse(JSON.stringify(MOCK_ELTON_PURCHASE_ORDERS));
let localUsers = [...MOCK_ELTON_USERS];
let localExits = [
  { DocEntry: 9001, DocNum: 9001, DocDate: new Date().toISOString(), Comments: 'Bidon percé lors de la manutention dépôt', U_MotifSortie: 'Casse', U_UtilisateurMob: 'RESP_MAG' },
  { DocEntry: 9002, DocNum: 9002, DocDate: new Date().toISOString(), Comments: 'Lubrification pont élévateur atelier station VDN', U_MotifSortie: 'Consommation interne', U_UtilisateurMob: 'OP_VDN' },
  { DocEntry: 9003, DocNum: 9003, DocDate: new Date().toISOString(), Comments: 'Flacon DOT4 date dépassée retiré du rayon', U_MotifSortie: 'Périmé', U_UtilisateurMob: 'OP_AUTOROUTE' },
];
let localActivities: any[] = [
  { DocEntry: 1, U_TypeDoc: 'PRIX', U_DocNum: 'ELT-SYN-5W40', U_DocDate: new Date(Date.now() - 3600000).toISOString(), U_UtilisateurMob: 'ADMIN', U_WhsCode: '01', U_Commentaire: 'Validation tarifaire mobile station' },
  { DocEntry: 2, U_TypeDoc: 'SORTIE', U_DocNum: '9001', U_DocDate: new Date(Date.now() - 86400000).toISOString(), U_UtilisateurMob: 'RESP_MAG', U_WhsCode: '01', U_Commentaire: 'Sortie casse 1x ELT-SYN-5W40' },
  { DocEntry: 3, U_TypeDoc: 'INVENTAIRE', U_DocNum: '101', U_DocDate: new Date(Date.now() - 2 * 86400000).toISOString(), U_UtilisateurMob: 'OP_VDN', U_WhsCode: '02', U_Commentaire: 'Comptage tournant lubrifiants' },
  { DocEntry: 4, U_TypeDoc: 'RECEPTION', U_DocNum: '7001', U_DocDate: new Date(Date.now() - 3 * 86400000).toISOString(), U_UtilisateurMob: 'RESP_MAG', U_WhsCode: '01', U_Commentaire: 'Réception partielle BC-ELT-2026-08' },
];

export function handleMockFallback(url: string, method: string = 'GET', data?: any) {
  const cleanUrl = url.split('?')[0];

  // 1. Grilles de Prix
  if (cleanUrl.includes('/PriceLists')) {
    return { data: { value: MOCK_ELTON_PRICE_LISTS } };
  }

  // 2. Dépôts / Stations
  if (cleanUrl.includes('/Warehouses')) {
    return { data: { value: MOCK_ELTON_WAREHOUSES } };
  }

  // 2b. Groupes d'articles
  if (cleanUrl.includes('/ItemGroups')) {
    return {
      data: {
        value: [
          { Number: 100, GroupName: 'Lubrifiants' },
          { Number: 101, GroupName: 'Filtration' },
          { Number: 102, GroupName: 'Fluides & Refroidissement' },
          { Number: 103, GroupName: 'Entretien & Boutique' },
        ],
      },
    };
  }

  // 2c. Codes-barres
  if (cleanUrl.includes('/BarCodes')) {
    const rows = localArticles.map((it, idx) => ({
      AbsEntry: idx + 1,
      ItemNo: it.ItemCode,
      Barcode: it.BarCode,
      FreeText: it.ItemName,
    }));
    return { data: { value: rows } };
  }

  // 3. Fournisseurs
  if (cleanUrl.includes('/BusinessPartners')) {
    return { data: { value: MOCK_ELTON_SUPPLIERS } };
  }

  // 3b. Authentification applicative
  if (cleanUrl.includes('GA_AUTH_USER')) {
    return {
      data: {
        value: [
          {
            Code: 'ADMIN',
            Name: 'Administrateur Général Elton',
            U_IsAdmin: 'Y',
            U_MustChangePwd: 'N',
            U_WhsCode: '01',
          },
        ],
      },
    };
  }

  // 3c. Liste des utilisateurs pour l'Administration
  if (cleanUrl.includes('GA_LIST_USERS') || (cleanUrl.endsWith('/GA_USERS') && method.toUpperCase() === 'GET')) {
    return { data: { value: localUsers } };
  }

  // 3d. Détail d'un utilisateur
  const userDetailMatch = cleanUrl.match(/\/GA_USERS\('([^']+)'\)/);
  if (userDetailMatch) {
    const userCode = decodeURIComponent(userDetailMatch[1]);
    const u = localUsers.find((x) => x.Code.toLowerCase() === userCode.toLowerCase());
    if (method.toUpperCase() === 'PATCH' && data) {
      if (u) {
        if (data.U_WhsCode) u.U_WhsCode = data.U_WhsCode;
        if (data.U_IsAdmin) u.U_IsAdmin = data.U_IsAdmin;
      }
      return { status: 204, data: {} };
    }
    return { data: u || { Code: userCode, Name: userCode, U_WhsCode: '01', U_IsAdmin: 'Y' } };
  }

  // 3e. Création utilisateur
  if (cleanUrl.endsWith('/GA_USERS') && method.toUpperCase() === 'POST' && data) {
    localUsers.push({
      Code: data.Code,
      Name: data.Name,
      U_IsAdmin: data.U_IsAdmin || 'N',
      U_MustChangePwd: 'N',
      U_WhsCode: data.U_WhsCode || '01',
    });
    return { status: 201, data: { Code: data.Code, Name: data.Name } };
  }

  // 3f. KPIs Dashboard (Rupture & Ventes Hebdo)
  if (cleanUrl.includes('GA_KPI_RUPTURE_WHS')) {
    return { data: { value: [{ RuptureCount: 2 }] } };
  }

  if (cleanUrl.includes('GA_VENTES_HEBDO')) {
    const sales = localArticles.map((it) => ({
      ItemCode: it.ItemCode,
      WeeklySales: Math.floor(Math.random() * 8) + 2,
    }));
    return { data: { value: sales } };
  }

  // 4. Détail d'un Article
  const itemDetailMatch = cleanUrl.match(/\/Items\('([^']+)'\)/);
  if (itemDetailMatch) {
    const itemCode = decodeURIComponent(itemDetailMatch[1]);
    const art = localArticles.find((a) => a.ItemCode.toLowerCase() === itemCode.toLowerCase());

    if (method.toUpperCase() === 'PATCH' && data?.ItemPrices) {
      if (art) {
        data.ItemPrices.forEach((p: any) => {
          const existing = art.ItemPrices.find((ip) => ip.PriceList === p.PriceList);
          if (existing) existing.Price = p.Price;
          else art.ItemPrices.push({ PriceList: p.PriceList, Price: p.Price, Currency: p.Currency || 'XOF' });
        });
      }
      return { status: 204, data: {} };
    }

    if (art) {
      return { data: art };
    }
  }

  // 5. Liste d'Articles (avec support recherche et code-barres)
  if (cleanUrl.endsWith('/Items')) {
    let result = [...localArticles];
    const barcodeMatch = url.match(/BarCode eq '([^']+)'/i);
    if (barcodeMatch) {
      result = result.filter((a) => a.BarCode === barcodeMatch[1]);
    }
    const nameMatch = url.match(/startswith\(ItemName,'([^']+)'\)/i);
    if (nameMatch) {
      const q = nameMatch[1].toLowerCase();
      result = result.filter((a) => a.ItemName.toLowerCase().startsWith(q));
    }
    const codeMatch = url.match(/startswith\(ItemCode,'([^']+)'\)/i);
    if (codeMatch) {
      const q = codeMatch[1].toLowerCase();
      result = result.filter((a) => a.ItemCode.toLowerCase().startsWith(q));
    }
    return { data: { 'odata.count': result.length.toString(), value: result } };
  }

  // 6. Inventaires (Module 6)
  if (cleanUrl.endsWith('/InventoryCountings') || cleanUrl.includes('GA_INV_OPEN_LIST_WHS')) {
    return { data: { 'odata.count': localInventories.length.toString(), value: localInventories } };
  }

  const invDetailMatch = cleanUrl.match(/\/InventoryCountings\((\d+)\)/);
  if (invDetailMatch) {
    const docEntry = parseInt(invDetailMatch[1], 10);
    const inv = localInventories.find((i: any) => i.DocEntry === docEntry) || localInventories[0];

    if (method.toUpperCase() === 'PATCH' && data?.InventoryCountingLines) {
      if (inv) {
        data.InventoryCountingLines.forEach((l: any) => {
          const line = inv.InventoryCountingLines.find((il: any) => il.LineNum === l.LineNum);
          if (line) {
            line.Counted = l.Counted || 'tYES';
            line.CountedQuantity = l.CountedQuantity;
          }
        });
      }
      return { status: 204, data: {} };
    }

    return { data: inv };
  }

  // 7. Commandes Fournisseurs (Module 3)
  if (cleanUrl.endsWith('/PurchaseOrders')) {
    if (method.toUpperCase() === 'POST' && data) {
      const newDocEntry = (Date.now() % 90000) + 1000;
      const newPO = {
        DocEntry: newDocEntry,
        DocNum: newDocEntry,
        CardCode: data.CardCode || 'F0001',
        CardName: 'TOTALENERGIES LUBRICANTS SENEGAL',
        DocDate: new Date().toISOString().split('T')[0],
        DocDueDate: data.DocDueDate || new Date().toISOString().split('T')[0],
        DocTotal: data.DocTotal || 0,
        NumAtCard: data.NumAtCard || `BC-${newDocEntry}`,
        Comments: data.Comments || 'Commande Mobile Elton',
        DocumentStatus: 'bost_Open',
        DocumentLines: data.DocumentLines || [],
      };
      localPurchaseOrders.unshift(newPO);
      return { status: 201, data: { DocEntry: newDocEntry, DocNum: newDocEntry } };
    }
    return { data: { 'odata.count': localPurchaseOrders.length.toString(), value: localPurchaseOrders } };
  }

  const poDetailMatch = cleanUrl.match(/\/PurchaseOrders\((\d+)\)/);
  if (poDetailMatch) {
    const docEntry = parseInt(poDetailMatch[1], 10);
    const po = localPurchaseOrders.find((p: any) => p.DocEntry === docEntry) || localPurchaseOrders[0];
    return { data: po };
  }

  // 8. Réceptions Fournisseurs (Module 4)
  if (cleanUrl.includes('/PurchaseDeliveryNotes')) {
    if (data?.DocumentLines && Array.isArray(data.DocumentLines)) {
      data.DocumentLines.forEach((l: any) => {
        if (l.BaseEntry !== undefined) {
          const po = localPurchaseOrders.find((p: any) => p.DocEntry === l.BaseEntry);
          if (po && po.DocumentLines) {
            const line = po.DocumentLines[l.BaseLine || 0];
            if (line) line.OpenQty = Math.max(0, (line.OpenQty || line.Quantity) - (l.Quantity || 0));
          }
        }
      });
    }
    return { status: 201, data: { DocEntry: 7001, DocNum: 7001 } };
  }

  // 9. Sorties de Marchandises (Module 5)
  if (cleanUrl.includes('/InventoryGenExits')) {
    if (method.toUpperCase() === 'POST' && data) {
      const newExit = {
        DocEntry: localExits.length + 9001,
        DocNum: localExits.length + 9001,
        DocDate: new Date().toISOString(),
        Comments: data.Comments || '',
        U_MotifSortie: data.U_MotifSortie || 'Consommation interne',
        U_UtilisateurMob: data.U_UtilisateurMob || 'ADMIN',
      };
      localExits.unshift(newExit);
      return { status: 201, data: { DocEntry: newExit.DocEntry, DocNum: newExit.DocNum } };
    }
    return { data: { 'odata.count': localExits.length.toString(), value: localExits } };
  }

  // 10. Journal d'Activité (Module 2)
  if (cleanUrl.includes('/U_GA_MOB_ACTIVITY')) {
    if (method.toUpperCase() === 'POST' && data) {
      localActivities.unshift({
        DocEntry: localActivities.length + 1,
        ...data,
      });
      return { status: 201, data: { DocEntry: 1 } };
    }
    return { data: { value: localActivities } };
  }

  // Fallback par défaut pour les autres endpoints OData
  return { data: { 'odata.count': '0', value: [] } };
}
