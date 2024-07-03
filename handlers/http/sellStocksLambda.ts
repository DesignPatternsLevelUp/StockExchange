import {APIGatewayProxyHandler} from "aws-lambda";
import {query, withClient} from "../../helpers/DBquery";
import {parseInput} from "../../helpers/APIGatewayInputParser";
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";


export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const body = parseInput<{ sellerId: string, companyId: string, quantity: number }>(event);
    if (!body) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Badly formatted request'})
    }
    const [shares] = await withClient(client => query<{quantity: number}>(client, `
    SELECT
        COALESCE(SUM("numShares"), 0) AS "quantity"
    FROM
        "Shares"
    WHERE
        "ownerId" = $1 AND "companyId" = $2 AND "forSale" = B'0';`, [body.sellerId, body.companyId])) ?? [];

    if (body.quantity > shares.quantity) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Not enough stock to sell'})
    }

    try {
        await new SQSClient({
            region: process.env.REGION,
        }).send(new SendMessageCommand({QueueUrl: process.env.sellStockQueueUrl, MessageBody: JSON.stringify({...body, callbackUrl: event.queryStringParameters?.['callbackUrl']}), MessageGroupId: 'sellStock', MessageDeduplicationId: `${body.sellerId}-${body.companyId}-${body.quantity}`}))
        return {
            statusCode: 202,
            body: JSON.stringify({message: 'Request Accepted'}),
        }
    } catch (error) {
        console.error('Error sending message to sell stock queue:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Internal Server Error', error: JSON.stringify(error)})
        }
    }
}
