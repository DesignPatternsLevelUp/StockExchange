import {APIGatewayProxyHandler} from "aws-lambda";
import {Stock} from "../../definitions/Stock";
import {query, withClient} from "../../helpers/DBquery";

const getStocksFromDb = async (): Promise<Array<Stock> | null> => {
    return withClient(client => query<Stock>(client, `
    SELECT
        "C"."id" AS "businessId",
        "C"."pricePerShare" AS "currentMarketValue",
        SUM("S"."numShares") AS "quantity"
    FROM
        "Shares" "S"
    JOIN
        "Companies" "C" ON "S"."companyId" = "C"."id"
    WHERE
        "S"."forSale" = 1
    GROUP BY
        "C"."id";`));
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
