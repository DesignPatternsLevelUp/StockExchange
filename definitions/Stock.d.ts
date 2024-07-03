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

export type StockTransfer = {
    fromUserId: string;
    toUserId: string;
    businessId: string;
    quantity: number
}
