import {APIGatewayProxyHandler} from "aws-lambda";
import {Stock} from "../../definitions/Stock";

const getStocksFromDb = async (ownerId: string): Promise<Array<Stock> | null> => {
    return null; // TODO
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const { ownerId } = event.pathParameters ?? {};
    const stocks = await getStocksFromDb(ownerId ?? '');
    if (!stocks) return {
        statusCode: 404,
        body: JSON.stringify({message: `Unknown id: ${ownerId}`})
    }
    return {
        statusCode: 200,
        body: JSON.stringify({data: stocks})
    };
}
