import {APIGatewayProxyHandler} from "aws-lambda";
import {Stock} from "../../definitions/Stock";

const getStocksFromDb = async (): Promise<Array<Stock> | null> => {
    return null; // TODO
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const stocks = await getStocksFromDb();
    return {
        statusCode: 200,
        body: JSON.stringify({data: stocks})
    };
}
