import { APIGatewayEvent } from "aws-lambda";
import { SharesTransaction } from "../../definitions/SharesTransaction";
import { APIEndpointContext, APIRequestEndpointRequestError, APIRequestEnpointBase } from "../../helpers/APIRequestHandler";
import { commercialBankUrl } from "../../integrations/commercialBank";
import { ShareService, TransactionService } from "../../services";
import { TransactionStatus } from "../../database/models";

const EXCHANGE_ACCOUNT = "";
const EXCHANGE_COMMISION = 1.00;

async function transferBuyerSellerFunds(context: APIEndpointContext<SharesTransaction, TransactionStatus>) {
    let response = await fetch(`${commercialBankUrl}/transfers`, {
        method: 'POST',
        body: JSON.stringify({
            amount: (context.request.pricePerShare * context.request.quantity),
            from: context.request.buyer.bankAccount,
            to: context.request.seller.bankAccount
        })
    });
    
    if (response.status !== 200) {
        let transaction = await TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.FAILED);
        context.outcome = transaction.status;
    } else {
        context.data.transactionStatus = TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.FUNDS_TRANSFERED);
    }
}

async function transferTransactionFee(context: APIEndpointContext<SharesTransaction, TransactionStatus>) {
    let response = await fetch(`${commercialBankUrl}/transfers`, {
        method: 'POST',
        body: JSON.stringify({
            amount: EXCHANGE_COMMISION,
            from: context.request.buyer.bankAccount,
            to: EXCHANGE_ACCOUNT
        })
    });

    if (response.status !== 200) {
        let transaction = await TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.FAILED);
        context.outcome = transaction.status;
    }
}

async function transferShares(context: APIEndpointContext<SharesTransaction, TransactionStatus>) {
    let sellerShares, buyShares
    if (context.data.transactionStatus === TransactionStatus.FUNDS_TRANSFERED) {
        [sellerShares, buyShares] = await Promise.allSettled([
            ShareService.removeSharesFromOwner(
                context.request.seller.ownerId,
                context.request.companyId,
                context.request.quantity), 
            ShareService.addSharesToOwner(
                context.request.buyer.ownerId,
                context.request.companyId,
                context.request.quantity)
        ]);

        if (sellerShares.status === 'fulfilled' && buyShares.status === 'fulfilled') {
            TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.EXCHANGE_COMPLETE);
        } else if (sellerShares.status === 'rejected' || buyShares.status === 'fulfilled') {
            TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.BUYER_STOCKS_INC);
        } else if (sellerShares.status === 'fulfilled' || buyShares.status === 'rejected') {
            TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.SELLER_STOCKS_DEC);
        }
    } else if (context.data.transactionStatus === TransactionStatus.BUYER_STOCKS_INC) {
        [sellerShares] = await Promise.allSettled([
            ShareService.removeSharesFromOwner(
                context.request.seller.ownerId,
                context.request.companyId,
                context.request.quantity)
        ]);

        if (sellerShares.status === 'fulfilled') {
            TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.EXCHANGE_COMPLETE);
        }
    } else if (context.data.transactionStatus === TransactionStatus.SELLER_STOCKS_DEC) {
        [buyShares] = await Promise.allSettled([
            ShareService.addSharesToOwner(
                context.request.buyer.ownerId,
                context.request.companyId,
                context.request.quantity)
        ]);

        if (buyShares.status === 'fulfilled') {
            TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.EXCHANGE_COMPLETE);
        }
    } else {
        TransactionService.setTransactionStatus(context.request.transactionId, TransactionStatus.FAILED);
    }
    
}

class BuySharesEndpoint extends APIRequestEnpointBase<SharesTransaction, TransactionStatus> {
    constructor(event: APIGatewayEvent) {
        super(event);
        this.steps.push(transferBuyerSellerFunds);
        // this.steps.push(transferTransactionFee);
        this.steps.push(transferShares)
    }

    public override async APIRequestErrorHandler(error: APIRequestEndpointRequestError) {
        let transaction = await TransactionService.setTransactionStatus(this.context.request.transactionId, TransactionStatus.FAILED);
        this.context.outcome = transaction.status;
    }
}
