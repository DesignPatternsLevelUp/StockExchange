export type SharesTransaction = {
    transactionId: number;
    quantity: number;
    pricePerShare: number;
    companyId: number;
    buyer: {
        bankAccount: string,
        ownerId: number,
    },
    seller: {
        bankAccount: string,
        ownerId: number,
    }
}