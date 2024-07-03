import {APIGatewayProxyHandler} from 'aws-lambda'
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {parseInput} from "../../helpers/APIGatewayInputParser";
import {Business} from "../../definitions/Business";
import {stockExchangeBankAccount} from "../../helpers/Bank";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const business = parseInput<Business>(event);
    const callbackUrl = event.queryStringParameters?.['callbackUrl'];
    if (!business || !callbackUrl) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Badly formatted request'})
    }
    try {
        const verified = await fetch(`${process.env.BANK_URL}/account/balance?accountName=${business.bankAccount}`, { method: 'GET', headers: { 'X-Origin': stockExchangeBankAccount}});
        console.log('Bank response:', verified);
        if (verified.status === 404) {
            return {
                statusCode: 400,
                body: JSON.stringify({message: `Invalid bank Account: ${business.bankAccount}`})
            };
        }
    } catch (error) {
        console.error('Bank call failed:', error);
        return {
            statusCode: 502,
            body: JSON.stringify({message: 'Bank Service unavailable, try again later'})
        }
    }
    try {
        await new SQSClient({
            region: process.env.REGION,
        }).send(new SendMessageCommand({QueueUrl: process.env.createBusinessQueueUrl, MessageBody: JSON.stringify({...business, callbackUrl}), MessageGroupId: 'createBusiness', MessageDeduplicationId: business.bankAccount}))
        return {
            statusCode: 202,
            body: JSON.stringify({message: 'Request Accepted'}),
        }
    } catch (error) {
        console.error('Error sending message to create business queue:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Internal Server Error', error: JSON.stringify(error)})
        }
    }
}
