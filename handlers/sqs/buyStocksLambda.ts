import {SQSHandler} from "aws-lambda";
import {query, withClient} from "../../helpers/DBquery";
import {Client} from "pg";

const buyStock = async (client: Client, body: { ownerId: string, companyId: string, quantity: number}) => {
    await query(client, `
            WITH "SelectedShares" AS (
                SELECT
                    "id",
                    "ownerId",
                    "companyId",
                    "numShares",
                    SUM("numShares") OVER (ORDER BY "id") AS "cumulativeShares"
                FROM
                    "Shares"
                WHERE
                    "companyId" = $2 AND "forSale" = B'1'
                FOR UPDATE SKIP LOCKED
            ),
            "SharesToBuy" AS (
                SELECT
                    "id",
                    "ownerId" AS "sellerId",
                    "companyId",
                    LEAST("numShares", $3 - SUM("numShares") OVER (ORDER BY "id")) AS "sharesToBuy"
                FROM
                    "SelectedShares"
                WHERE
                    "cumulativeShares" <= $3
                    OR ("cumulativeShares" - "numShares" < $3 AND "cumulativeShares" >= $3)
            ),
            "CompanyPrice" AS (
                SELECT
                    "id",
                    "pricePerShare"
                FROM
                    "Companies"
                WHERE
                    "id" = $2
            )
            UPDATE "Shares"
            SET "numShares" = "numShares" - "SharesToBuy"."sharesToBuy",
                "forSale" = CASE WHEN "numShares" - "SharesToBuy"."sharesToBuy" = 0 THEN B'0' ELSE "forSale" END
            FROM "SharesToBuy"
            WHERE "Shares"."id" = "SharesToBuy"."id";

            DELETE FROM "Shares"
            USING "SharesToBuy"
            WHERE "Shares"."id" = "SharesToBuy"."id" AND "Shares"."numShares" = 0;

            INSERT INTO "Shares" ("companyId", "numShares", "ownerId", "forSale")
            SELECT
                "companyId",
                SUM("sharesToBuy"),
                $1 AS "ownerId",
                B'0'
            FROM
                "SharesToBuy"
            GROUP BY
                "companyId"
            ON CONFLICT ("companyId", "ownerId")
            DO UPDATE SET
                "numShares" = "Shares"."numShares" + "EXCLUDED"."numShares";

            INSERT INTO "Transactions" ("sellerId", "buyerId", "quantity", "pricePerShare", "companyId")
            SELECT
                "sellerId",
                $1 AS "buyerId",
                "sharesToBuy",
                "CP"."pricePerShare",
                "STB"."companyId"
            FROM
                "SharesToBuy" "STB"
            JOIN
                "CompanyPrice" "CP" ON "STB"."companyId" = "CP"."id";`,
        [body.ownerId, body.companyId, body.quantity]);
    return {
        ...body,
    };
}

const insertIntoDb = async (data: { ownerId: string, companyId: string, amount: number}): Promise<{ ownerId: string, companyId: string, quantity: number} | null> => {
    return withClient(async client => {
        try {
            await query(client, 'BEGIN');
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
                    LEAST("AvailableShares"."totalSharesForSale", FLOOR($2 / "CompanyPrice"."pricePerShare")) AS "maxPurchasableShares"
                FROM
                    "CompanyPrice",
                    "AvailableShares";
            `, [data.companyId, data.amount]) ?? [];
            if (!availableShares) throw new Error('Unable to find stocks');
            const {quantity, companyId, ownerId} = {...data, quantity: availableShares.quantity};
            const response = await buyStock(client, {quantity, companyId, ownerId});
            await query(client, 'COMMIT');
            return response;
        } catch (error) {
            console.error(error);
            await query(client, 'ROLLBACK');
            return null;
        }
    })
}

export const handler: SQSHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const [record] = event.Records;
    const body: { ownerId: string, companyId: string, amount: number} = JSON.parse(record.body);
    await insertIntoDb(body);
};
