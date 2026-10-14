// ─── Tests d'Intégration : Synchronisation des Prix SAP (Module 8) ───────────────
import { apiClient } from '@core/api/client';
import { prixService } from '@features/prix/services/prixService';
import { activiteService } from '@features/activite/services/activiteService';

describe('Intégration — Cycle de Synchronisation de Prix avec SAP Service Layer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('doit récupérer la liste des grilles tarifaires configurées depuis SAP', async () => {
    const mockPriceListsResponse = {
      data: {
        value: [
          { PriceListNo: 1, PriceListName: 'Tarif Général' },
          { PriceListNo: 2, PriceListName: 'Prix Vente Boutique' },
        ],
      },
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue(mockPriceListsResponse);

    const priceLists = await prixService.getPriceLists();

    expect(priceLists).toHaveLength(2);
    expect(priceLists[1].PriceListNo).toBe(2);
    expect(priceLists[1].PriceListName).toBe('Prix Vente Boutique');
  });

  it('doit récupérer les prix d’un article pour toutes les listes SAP', async () => {
    const mockItemPricesResponse = {
      data: {
        ItemPrices: [
          { PriceList: 1, Price: 1000, Currency: 'XOF' },
          { PriceList: 2, Price: 1200, Currency: 'XOF' },
        ],
      },
    };

    jest.spyOn(apiClient, 'get').mockResolvedValue(mockItemPricesResponse);

    const itemPrices = await prixService.getItemPrices('ART_TEST_01');

    expect(itemPrices).toHaveLength(2);
    expect(itemPrices[1].PriceList).toBe(2);
    expect(itemPrices[1].Price).toBe(1200);
  });

  it('doit envoyer le PATCH de mise à jour tarifaire à SAP et consigner l’activité', async () => {
    const patchSpy = jest.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} });
    const logSpy = jest.spyOn(activiteService, 'logActivity').mockResolvedValue(undefined);

    await prixService.updateItemPrice({
      itemCode: 'ART_TEST_01',
      priceList: 2,
      newPrice: 1500,
    });

    // 1. Vérification de l'appel PATCH à SAP B1 Service Layer
    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(patchSpy).toHaveBeenCalledWith(
      "/Items('ART_TEST_01')",
      {
        ItemPrices: [
          {
            PriceList: 2,
            Price: 1500,
          },
        ],
      }
    );

    // 2. Vérification de la traçabilité dans le journal d'activité
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: expect.stringContaining('1500 F CFA'),
        U_TypeDoc: 'Prix',
        U_DocNum: '2',
      })
    );
  });
});
