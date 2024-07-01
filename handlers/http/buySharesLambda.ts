import {APIGatewayEvent, APIGatewayProxyHandler} from 'aws-lambda'
import {commercialBankUrl} from "../../integrations/commercialBank";
import {BuySharesRequest} from "../../definitions/BuySharesRequest";
import { SharesTransaction } from '../../definitions/SharesTransaction';
import { EscrowFailedError, OwnerEntityNotAvailableError, QuantityNotAvailableError, ShareService, SharesFailedError, SharesNotAvailableError, TransactionFailedError, TransactionService } from '../../services';
import { APIRequestEnpointBase, APIEndpointContext, APIRequestEndpointRequestError } from '../../helpers/APIRequestHandler';
import { Transaction } from '../../database/models';
import { SQSMessenger } from '../../helpers/SQSMessenger';

interface Response {
    statusCode: number;
    body: string;
}

async function verifySellerInventory(context: APIEndpointContext<BuySharesRequest, Response>) {
    try {
        let share = await ShareService.getPurchasableSharesByOwnerId(context.request.sellerId, context.request.companyId);
        if ((share.numShares as number) < context.request.quantity) throw new QuantityNotAvailableError(context.request.quantity);
    } catch (error) {
        console.error(`Error ${(error as Error).message}`);
        if (error instanceof QuantityNotAvailableError) {
            context.outcome = {
                statusCode: 400,
                body: JSON.stringify({message: `Invalid transactions, seller can't meet the quantity demand`})
            };
        } else {
            throw error;
        }
    }
}

async function verifyTransactionData(context: APIEndpointContext<BuySharesRequest, Response>) {
    try {
        context.data.transaction = await TransactionService.createTransaction(context.request.buyerId, context.request.sellerId, context.request.companyId, context.request.quantity);
    } catch (error) {
        console.error(`Error ${(error as Error).message}`);
        if (error instanceof OwnerEntityNotAvailableError) {
            context.outcome = {
                statusCode: 404,
                body: JSON.stringify({message: `Invalid BuyerId: ${context.request.buyerId} or SellerId: ${context.request.sellerId}`})
            };
        } else if (error instanceof SharesNotAvailableError) {
            context.outcome = {
                statusCode: 404,
                body: JSON.stringify({message: `Couldn't find SellerId: ${context.request.sellerId} for shares of CompanyId: ${context.request.companyId}`})
            };
        }  else if (error instanceof TransactionFailedError || error instanceof EscrowFailedError || error instanceof SharesFailedError) {
            context.outcome = {
                statusCode: 500,
                body: JSON.stringify({message: `Internal server error`})
            };
        } else {
            throw error;
        }
    }
}

async function verifyBuyerHasSufficientFunds(context: APIEndpointContext<BuySharesRequest, Response>) {
    try {
        let buyer = context.data.transaction.buyer;
        let account = await fetch(`${commercialBankUrl}/accounts/${buyer.entity.bankAccount}`, { method: 'GET' });
        if (account.status === 200) {
            let data = await account.json();
            let canPerformTransaction = false; 
            // TODO: Verify buyer can make transaction
            if (canPerformTransaction) {
                context.data.transaction = await TransactionService.persistTransation(context.data.transaction) as Transaction;
                SQSMessenger.SendMessage<SharesTransaction>({
                    transactionId: context.data.transaction.id, 
                    companyId: context.data.transaction.company.id,
                    pricePerShare: context.data.transaction.pricePerShare,
                    quantity: context.data.transaction.quantity,
                    seller: {
                        bankAccount: context.data.transaction.seller.entity.bankAccount,
                        ownerId: context.data.transaction.seller.id
                    },
                    buyer: {
                        bankAccount: context.data.transaction.buyer.entity.bankAccount,
                        ownerId: context.data.transaction.buyer.id
                    },
                })
                context.outcome = {
                    statusCode: 202,
                    body: JSON.stringify({message: 'Request Accepted'}),
                }
            } else {
                context.outcome = {
                    statusCode: 400,
                    body: JSON.stringify({message: 'Insufficient Funds'})
                }
            }
        } else {
            context.outcome = {
                statusCode: 400,
                body: JSON.stringify({message: `Invalid bank Account: ${buyer.entity.bankAccount}`})
            };
        }
    } catch (error) {
        context.outcome = {
            statusCode: 502,
            body: JSON.stringify({message: 'Bank Service unavailable, try again later'})
        }
    }
}

class BuySharesEndpoint extends APIRequestEnpointBase<BuySharesRequest, Response> {
    constructor(event: APIGatewayEvent) {
        super(event);
        this.steps.push(verifyTransactionData);
        this.steps.push(verifySellerInventory);
        this.steps.push(verifyBuyerHasSufficientFunds);
    }

    public override async APIRequestErrorHandler(error: APIRequestEndpointRequestError) {
        this.context.outcome = {
            statusCode: 400,
            body: error.message
        }
    }
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    return await new BuySharesEndpoint(event).execute();
}
