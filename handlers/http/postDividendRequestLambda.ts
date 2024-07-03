import {APIGatewayProxyHandler} from "aws-lambda";
import {parseInput} from "../../helpers/APIGatewayInputParser";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);

    const body = parseInput<{ businessId: string }>(event);
    if (!body) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Badly formatted request'})
    }
    try {
        return {
            statusCode: 200,
            body: JSON.stringify({data: { referenceId: 'dividends' }}),
        }
    } catch (error) {
        console.error('Error sending message to pay dividends queue:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({message: 'Internal Server Error'})
        }
    }
}
