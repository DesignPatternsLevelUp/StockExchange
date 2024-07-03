import {SQSHandler} from "aws-lambda";
import {query, withClient} from "../../helpers/DBquery";
import {Client} from "pg";

const buyStock = async (client: Client, body: { ownerId: string, companyId: string, quantity: number}) => {
    const sharesToBuy = await query<{id: string, sellerId: string, companyId: string, sharesToBuy: number}>(client, `
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
                    "companyId" = $1 AND "forSale" = B'1'
                FOR UPDATE SKIP LOCKED
            ),
            "SharesToBuy" AS (
                SELECT
                    "id",
                    "ownerId" AS "sellerId",
                    "companyId",
                    LEAST("numShares", $2 - SUM("numShares") OVER (ORDER BY "id")) AS "sharesToBuy"
                FROM
                    "SelectedShares"
                WHERE
                    "cumulativeShares" <= $2
                    OR ("cumulativeShares" - "numShares" < $2 AND "cumulativeShares" >= $2)
            )
            SELECT
                "id",
                "sellerId",
                "companyId",
                "sharesToBuy"
            FROM
                "SharesToBuy";`, [body.companyId, body.quantity]) ?? [];

    for (const share of sharesToBuy) {
        const updateSharesQuery = `
                UPDATE "Shares"
                SET "numShares" = "numShares" - $1,
                    "forSale" = CASE WHEN "numShares" - $1 = 0 THEN B'0' ELSE "forSale" END
                WHERE "id" = $2;
            `;
        await query(client, updateSharesQuery, [share.sharesToBuy, share.id]);
        const deleteSharesQuery = `
                DELETE FROM "Shares"
                WHERE "id" = $1 AND "numShares" = 0;
            `;
        await query(client, deleteSharesQuery, [share.id]);
    }

    const insertOrUpdateSharesQuery = `
            INSERT INTO "Shares" ("companyId", "numShares", "ownerId", "forSale")
            VALUES ($1, $2, $3, B'0')
            ON CONFLICT ("companyId", "ownerId")
            DO UPDATE SET
                "numShares" = "Shares"."numShares" + EXCLUDED."numShares";
        `;

    const totalSharesToBuy = sharesToBuy.reduce((sum, share) => sum + share.sharesToBuy, 0);
    await query(client, insertOrUpdateSharesQuery, [body.companyId, totalSharesToBuy, body.ownerId]);
    const companyPriceQuery = `
            SELECT "pricePerShare"
            FROM "Companies"
            WHERE "id" = $1;
        `;
    const [companyPrice] = await query<{pricePerShare: number}>(client, companyPriceQuery, [body.companyId]) ?? [];
    for (const share of sharesToBuy) {
        const insertTransactionQuery = `
                INSERT INTO "Transactions" ("sellerId", "buyerId", "quantity", "pricePerShare", "companyId")
                VALUES ($1, $2, $3, $4, $5);
            `;
        await query(client, insertTransactionQuery, [share.sellerId, body.ownerId, share.sharesToBuy, companyPrice.pricePerShare, body.companyId]);
    }
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
