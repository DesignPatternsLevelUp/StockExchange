import {APIGatewayProxyHandler} from 'aws-lambda'
import {parseInput} from '../../helpers/APIGatewayInputParser';
import {Payment} from "../../definitions/Payments";
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {query, withClient} from "../../helpers/DBquery";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const transaction = parseInput<Payment>(event);
    if (!transaction) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Poorly formatted request'})
    }
    switch (transaction.type) {
        case 'incoming_payment':
            transaction.creditAccountName = 'us';
            const isDividend = transaction.reference === 'dividends';
            const bankAccount = transaction.debitAccountName;
            const amount = transaction.amount;
            if (isDividend) {
                const [business] = await withClient(client => query<{id: string}>(client, `
                SELECT "id" FROM "Companies" WHERE "bankAccount" = $1`, [bankAccount])) ?? [];
                if (!business) break;
                await new SQSClient({
                    region: process.env.REGION,
                }).send(new SendMessageCommand({QueueUrl: process.env.payDividendsQueueUrl, MessageBody: JSON.stringify({businessId: business.id, amount})}))
            } else { // Buy stock
                const businessId = transaction.reference;
                const [business] = await withClient(client => query<{id: string}>(client, `
                SELECT "id" FROM "Companies" WHERE "id" = $1`, [businessId])) ?? [];
                if (!business) break;
                await new SQSClient({
                    region: process.env.REGION,
                }).send(new SendMessageCommand({QueueUrl: process.env.buyStockQueueUrl, MessageBody: JSON.stringify({businessId, amount})}))
            }
            break;
        case 'outgoing_payment':
            transaction.debitAccountName = 'us';
            // ignore, unless we need to handle
            break;
        case 'transaction_failed':
            // ignore, it's our money now
            break;
    }
    return {
        statusCode: 204,
        body: JSON.stringify({}),
    }
}
