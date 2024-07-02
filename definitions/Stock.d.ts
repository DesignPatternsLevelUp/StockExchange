export type Stock =  {
    businessId: string;
    currentMarketValue: number;
    quantity: number;
}

export type StockHolder = {
    quantity: number;
    holderId: string;
    holderType: string;
    bankAccount: string;
}
