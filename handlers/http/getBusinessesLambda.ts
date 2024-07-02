import {APIGatewayProxyHandler} from "aws-lambda";
import {Business} from "../../definitions/Business";
import {query, withClient} from "../../helpers/DBquery";

const getBusinessesFromDb = async (): Promise<Array<Business & { currentMarketValue: number, id: string }> | null> => {
    return withClient(client => query<Business & { currentMarketValue: number, id: string }>(client,`
    SELECT
        id,
        name,
        pricePerShare AS currentMarketValue
    FROM
        Companies;
    `));
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
