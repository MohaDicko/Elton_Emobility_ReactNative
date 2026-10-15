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
} from './demoData';

// Stockage dynamique en mémoire pour les modifications des testeurs
let localArticles = [...MOCK_ELTON_ARTICLES];
let localInventories = JSON.parse(JSON.stringify(MOCK_ELTON_INVENTORIES));
let localPurchaseOrders = JSON.parse(JSON.stringify(MOCK_ELTON_PURCHASE_ORDERS));
let localActivities: any[] = [];

export function handleMockFallback(url: string, method: string = 'GET', data?: any) {
  const cleanUrl = url.split('?')[0];

  // 1. Grilles de Prix
  if (cleanUrl.includes('/PriceLists')) {
    return { data: { value: MOCK_ELTON_PRICE_LISTS } };
  }

  // 2. Dépôts
  if (cleanUrl.includes('/Warehouses')) {
    return { data: { value: MOCK_ELTON_WAREHOUSES } };
  }

  // 3. Fournisseurs
  if (cleanUrl.includes('/BusinessPartners')) {
    return { data: { value: MOCK_ELTON_SUPPLIERS } };
  }

  // 3b. Authentification & Utilisateurs (Fallback Vercel)
  if (cleanUrl.includes('GA_AUTH_USER')) {
    return {
      data: {
        value: [
          {
            Code: 'ADMIN',
            Name: 'Administrateur',
            U_IsAdmin: 'Y',
            U_MustChangePwd: 'N',
            U_WhsCode: '01',
          },
        ],
      },
    };
  }

  if (cleanUrl.includes('/GA_USERS')) {
    return { data: { U_WhsCode: '01', U_IsAdmin: 'Y' } };
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

  // 5. Liste d'Articles
  if (cleanUrl.endsWith('/Items')) {
    let result = [...localArticles];
    // Filtre simple par code-barres si présent dans l'URL
    const barcodeMatch = url.match(/BarCode eq '([^']+)'/);
    if (barcodeMatch) {
      result = result.filter((a) => a.BarCode === barcodeMatch[1]);
    }
    return { data: { value: result } };
  }

  // 6. Inventaires (Module 6)
  if (cleanUrl.endsWith('/InventoryCountings') || cleanUrl.includes('GA_INV_OPEN_LIST_WHS')) {
    return { data: { value: localInventories } };
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

  // 7. Commandes Fournisseurs
  if (cleanUrl.endsWith('/PurchaseOrders')) {
    return { data: { value: localPurchaseOrders } };
  }

  const poDetailMatch = cleanUrl.match(/\/PurchaseOrders\((\d+)\)/);
  if (poDetailMatch) {
    const docEntry = parseInt(poDetailMatch[1], 10);
    const po = localPurchaseOrders.find((p: any) => p.DocEntry === docEntry) || localPurchaseOrders[0];
    return { data: po };
  }

  // 8. Réceptions
  if (cleanUrl.includes('/PurchaseDeliveryNotes')) {
    return { status: 201, data: { DocEntry: 7001, DocNum: 7001 } };
  }

  // 9. Sorties
  if (cleanUrl.includes('/InventoryGenExits')) {
    return { status: 201, data: { DocEntry: 9001, DocNum: 9001 } };
  }

  // 10. Journal d'Activité
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

  // Fallback par défaut pour les autres endpoints
  return { data: { value: [] } };
}
