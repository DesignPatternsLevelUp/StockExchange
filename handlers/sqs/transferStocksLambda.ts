import {SQSHandler} from "aws-lambda";
import {StockTransfer} from "../../definitions/Stock";
import {query, withClient} from "../../helpers/DBquery";
import {Client} from "pg";

const transferStock = async (client: Client, body: StockTransfer) => {
    const [shares] = await query<{ availableShares: number}>(client, `
    SELECT SUM("numShares") AS "availableShares"
        FROM "Shares"
        WHERE "ownerId" = $1 AND "companyId" = $2 AND "forSale" = 0
        GROUP BY "companyId"`,
        [body.fromUserId, body.businessId]) ?? [];
    if (!shares || shares.availableShares < body.quantity) throw new Error('Not enough shares');

    await query(client, `
    UPDATE "Shares"
        SET "numShares" = "numShares" - $1
        WHERE "ownerId" = $2 AND "companyId" = $3 AND "forSale" = B'0'`,
        [body.quantity, body.fromUserId, body.businessId]);

    const update = await query(client, `
    UPDATE "Shares"
        SET "numShares" = "numShares" + $1
        WHERE "ownerId" = $2 AND "companyId" = $3 AND "forSale" = false
        RETURNING "id"`);
    if (!update) throw new Error('Update failed');
    if (update.length === 0) {
        await query(client, `
        INSERT INTO "Shares" ("companyId", "numShares", "ownerId", "forSale")
                 VALUES ($1, $2, $3, B'0')`,
            [body.businessId, body.quantity, body.toUserId])
    }
    const [transaction] = await query<{ id: string }>(client, `
    INSERT INTO "Transactions" ("sellerId", "buyerId", "quantity", "pricePerShare", "companyId")
             VALUES ($1, $2, $3, 
             (SELECT "pricePerShare" FROM "Companies" WHERE "id" = $4), $4)
             RETURNING "id"`,
        [body.fromUserId, body.toUserId, body.quantity, body.businessId]) ?? [];
    if (!transaction) throw new Error('Transaction failed');
    return {
        ...body,
        transactionId: transaction.id
    };
}

const insertIntoDb = async (body: StockTransfer) => {
    return await withClient(async client => {
        try {
            await query(client, 'BEGIN');
            const response = await transferStock(client, body);
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
    const body: StockTransfer & { callbackUrl: string } = JSON.parse(record.body);
    const representation = await insertIntoDb(body);
    await fetch(body.callbackUrl, {body: JSON.stringify(representation), method: 'POST'});
};
