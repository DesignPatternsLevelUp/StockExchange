import {APIGatewayProxyHandler} from 'aws-lambda'
import {parseInput} from "../../helpers/APIGatewayInputParser";
import {query, withClient} from "../../helpers/DBquery";
import {stockExchangeBankAccount} from "../../helpers/Bank";

const getStock = async (data: {buyerId: string, businessId: string} & ({ quantity: number, maxPrice: never } | {maxPrice: number, quantity: never})) => {

    if (data.quantity) {
        return withClient(async client => {
            const [availableShares] = await query(client,`
                WITH "CompanyPrice" AS (
                    SELECT
                        "id" AS "companyId",
                        "pricePerShare"
                    FROM
                        "Companies"
                    WHERE
                        "id" = $1
                ),
                "AvailableShares" AS (
                    SELECT
                        SUM("numShares") AS "totalSharesForSale"
                    FROM
                        "Shares"
                    WHERE
                        "companyId" = $1 AND "forSale" = B'1'
                )
                SELECT
                    LEAST("AvailableShares"."totalSharesForSale", $2)) AS "maxPurchasableShares",
                    "CompanyPrice"."pricePerShare" AS "pricePerShare"
                FROM
                    "CompanyPrice",
                    "AvailableShares";
            `, [data.businessId, data.quantity]) ?? [];
            return {
                referenceId: data.businessId,
                amountToPay: availableShares.pricePerShare * availableShares.maxPurchasableShares,
                quantity: availableShares.maxPurchasableShares,
                bankAccount: stockExchangeBankAccount
            }
        });
    }
    return withClient(async client => {
        const [availableShares] = await query(client,`
                WITH "CompanyPrice" AS (
                    SELECT
                        "id" AS "companyId",
                        "pricePerShare"
                    FROM
                        "Companies"
                    WHERE
                        "id" = $1
                ),
                "AvailableShares" AS (
                    SELECT
                        SUM("numShares") AS "totalSharesForSale"
                    FROM
                        "Shares"
                    WHERE
                        "companyId" = $1 AND "forSale" = B'1'
                )
                SELECT
                    LEAST("AvailableShares"."totalSharesForSale", FLOOR($2 / "CompanyPrice"."pricePerShare") AS "maxPurchasableShares",
                    "CompanyPrice"."pricePerShare" AS "pricePerShare"
                FROM
                    "CompanyPrice",
                    "AvailableShares";
            `, [data.businessId, data.maxPrice]) ?? [];
        return {
            referenceId: data.businessId,
            amountToPay: availableShares.pricePerShare * availableShares.maxPurchasableShares,
            quantity: availableShares.maxPurchasableShares,
            bankAccount: stockExchangeBankAccount
        }
    });
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const request = parseInput<{buyerId: string, businessId: string} & ({ quantity: number, maxPrice: never } | {maxPrice: number, quantity: never})>(event);
    if (!request) return {
        statusCode: 400,
        body: JSON.stringify({message: 'Badly formatted request'})
    }
    const response = await getStock(request);

    return {
        statusCode: 200,
        body: JSON.stringify(response),
    }
}
