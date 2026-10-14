export interface IPriceList {
  PriceListNo: number;
  PriceListName: string;
}

export interface IItemPriceEntry {
  PriceList: number;
  PriceListName?: string;
  Price: number | null;
  Currency?: string;
}

export interface IUpdatePricePayload {
  itemCode: string;
  priceList: number;
  newPrice: number;
  oldPrice?: number;
}
