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
            const isDividend = transaction.reference === 'dividends';
            const bankAccount = transaction.debitAccountName;
            const amount = transaction.amount;
            if (isDividend) {
                const [business] = await withClient(client => query<{id: string}>(client, `
                SELECT "id" FROM "Companies" WHERE "bankAccount" = $1`, [bankAccount])) ?? [];
                if (!business) break; // free money woo-hoo
                await new SQSClient({
                    region: process.env.REGION,
                }).send(new SendMessageCommand({QueueUrl: process.env.payDividendsQueueUrl, MessageBody: JSON.stringify({businessId: business.id, amount}), MessageGroupId: 'payDividends', MessageDeduplicationId: transaction.id}))
            } else { // Buy stock
                const businessId = transaction.reference;
                const [business] = await withClient(client => query<{id: string}>(client, `
                SELECT "id" FROM "Companies" WHERE "id" = $1`, [businessId])) ?? [];
                const [owner] = await withClient(client => query(client, `
                SELECT
                    "O"."id" AS "id"
                FROM
                    "Owners" "O"
                LEFT JOIN
                    "Persons" "P" ON "O"."personId" = "P"."id"
                LEFT JOIN
                    "Companies" "C" ON "O"."companyId" = "C"."id"
                WHERE
                    "P"."bankAccount" = $1 OR "C"."bankAccount" = $1;`, [bankAccount])) ?? [];
                if (!business || !owner) break; // free money woo-hoo
                await new SQSClient({
                    region: process.env.REGION,
                }).send(new SendMessageCommand({QueueUrl: process.env.buyStockQueueUrl, MessageBody: JSON.stringify({businessId, amount, ownerId: owner.id}), MessageGroupId: 'buyStock', MessageDeduplicationId: transaction.id}))
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
