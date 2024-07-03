import {APIGatewayProxyHandler} from "aws-lambda";
import {Stock, StockHolder} from "../../definitions/Stock";
import {query, withClient} from "../../helpers/DBquery";

const getStockHoldersFromDb = async (businessId: string): Promise<Array<StockHolder> | null> => {
    return withClient(client => query<Stock & StockHolder>(client,`
            SELECT
                COALESCE("C"."bankAccount", "P"."bankAccount") AS "bankAccount",
                SUM("S"."numShares") AS "quantity",
                CASE
                    WHEN "O"."isCompany" = 1 THEN 'COMPANY'
                    ELSE 'PERSONA'
                END AS "holderType"
            FROM 
                "Shares" "S"
            JOIN 
                "Owners" "O" ON "S"."ownerId" = "O"."id"
            LEFT JOIN 
                "Companies" "C" ON "O"."isCompany" = 1 AND "O"."companyId" = "C"."id"
            LEFT JOIN 
                "Persons" "P" ON "O"."isCompany" = 0 AND "O"."personId" = "P"."id"
            WHERE 
                "S"."companyId" = $1
            GROUP BY 
                COALESCE("C"."bankAccount", "P"."bankAccount"),
                "O"."isCompany";`,
        [businessId]));
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const { businessId } = event.pathParameters ?? {};
    const stockHolders = await getStockHoldersFromDb(businessId ?? '');
    if (!stockHolders || stockHolders.length === 0) return {
        statusCode: 404,
        body: JSON.stringify({message: `Unknown id: ${businessId}`})
    }
    return {
        statusCode: 200,
        body: JSON.stringify({data: stockHolders})
    };
}
