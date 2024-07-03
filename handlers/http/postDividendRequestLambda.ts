import {APIGatewayProxyHandler} from "aws-lambda";
import {parseInput} from "../../helpers/APIGatewayInputParser";
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const body = parseInput<{ businessId: string }>(event);
    if (!body) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Badly formatted request'})
    }
    const referenceId =  Date.now();
    try {
        await new SQSClient({
            region: process.env.REGION,
        }).send(new SendMessageCommand({QueueUrl: process.env.payDividendsQueueUrl, MessageBody: JSON.stringify({...body, referenceId})}))
        return {
            statusCode: 202,
            body: JSON.stringify({data: { referenceId }}),
        }
    } catch (error) {
        console.error('Error sending message to pay dividends queue:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Internal Server Error'})
        }
    }
}
