import {APIGatewayProxyHandler} from "aws-lambda";
import {Stock, StockHolder} from "../../definitions/Stock";

const getStockHoldersFromDb = async (businessId: string): Promise<Array<Stock & StockHolder> | null> => {
    return null; // TODO
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const { businessId } = event.pathParameters ?? {};
    const stockHolders = await getStockHoldersFromDb(businessId ?? '');
    if (!stockHolders) return {
        statusCode: 404,
        body: JSON.stringify({message: `Unknown id: ${businessId}`})
    }
    return {
        statusCode: 200,
        body: JSON.stringify({data: stockHolders})
    };
}
