export type Stock =  {
    businessId: string;
    currentMarketValue: number;
    quantity: number;
}

export type StockHolder = {
    holderId: string;
    holderType: string;
    bankAccount: string;
}
