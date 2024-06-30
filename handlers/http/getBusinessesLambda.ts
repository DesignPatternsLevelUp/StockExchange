import {APIGatewayProxyHandler} from "aws-lambda";
import {Business} from "../../definitions/Business";

const getBusinessesFromDb = async (): Promise<Array<Business & { currentMarketValue: number, id: string }> | null> => {
    return null; // TODO
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const businesses = await getBusinessesFromDb();
    return {
        statusCode: 200,
        body: JSON.stringify({data: businesses})
    };
}
