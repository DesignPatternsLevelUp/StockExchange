import {APIGatewayProxyHandler} from 'aws-lambda'
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {parseInput} from "../../helpers/APIGatewayInputParser";
import {stockExchangeBankAccount} from "../../helpers/Bank";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const user = parseInput<{  bankAccount: string }>(event);
    const callbackUrl = event.queryStringParameters?.['callbackUrl'];
    if (!user || !callbackUrl) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Badly formatted request'})
    }
    try {
        const verified = await fetch(`${process.env.BANK_URL}/account/balance?accountName=${user.bankAccount}`, { method: 'GET', headers: { 'X-Origin': stockExchangeBankAccount} });
        if (verified.status === 404) {
            return {
                statusCode: 400,
                body: JSON.stringify({message: `Invalid bank Account: ${user.bankAccount}`})
            };
        }
    } catch (error) {
        return {
            statusCode: 502,
            body: JSON.stringify({message: 'Bank Service unavailable, try again later'})
        }
    }
    try {
        await new SQSClient({
            region: process.env.REGION,
        }).send(new SendMessageCommand({QueueUrl: process.env.createUserQueueUrl, MessageBody: JSON.stringify({...user, callbackUrl}), MessageGroupId: 'createUser', MessageDeduplicationId: user.bankAccount}))
        return {
            statusCode: 202,
            body: JSON.stringify({message: 'Request Accepted'}),
        }
    } catch (error) {
        console.error('Error sending message to create user queue:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Internal Server Error'})
        }
    }
}
