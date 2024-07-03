import {APIGatewayProxyHandler} from "aws-lambda";
import {Stock} from "../../definitions/Stock";
import {query, withClient} from "../../helpers/DBquery";

const getStocksFromDb = async (ownerId: string): Promise<Array<Stock> | null> => {
    return withClient(client => query<Stock>(client, `
    SELECT
        "S"."companyId" AS "businessId",
        SUM("S"."numShares") AS "quantity",
        "C"."pricePerShare" AS "currentMarketValue"
    FROM
        "Shares" "S"
    JOIN
        "Companies" "C" ON "S"."companyId" = "C"."id"
    WHERE
        "S"."ownerId" = $1 AND "S"."forSale" = B'0'
    GROUP BY
        "S"."companyId",
        "C"."pricePerShare";`, [ownerId]));
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
