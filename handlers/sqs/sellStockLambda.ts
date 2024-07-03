import {SQSHandler} from "aws-lambda";
import {query, withClient} from "../../helpers/DBquery";
import {Client} from "pg";

const sellStock = async (client: Client, body: { sellerId: string, companyId: string, quantity: number}) => {
    const [shares] = await query<{ availableShares: number}>(client, `
    SELECT SUM("numShares") AS "availableShares"
        FROM "Shares"
        WHERE "ownerId" = $1 AND "companyId" = $2 AND "forSale" = B'0'
        GROUP BY "companyId"`,
        [body.sellerId, body.companyId]) ?? [];
    if (!shares || shares.availableShares < body.quantity) throw new Error('Not enough shares');

    await query(client, `
    UPDATE "Shares"
        SET "numShares" = "numShares" - $1
        WHERE "ownerId" = $2 AND "companyId" = $3 AND "forSale" = B'0'`,
        [body.quantity, body.sellerId, body.companyId]);

    const update = await query(client, `
    UPDATE "Shares"
        SET "numShares" = "numShares" + $1
        WHERE "ownerId" = $2 AND "companyId" = $3 AND "forSale" = B'1'
        RETURNING "id"`, [body.quantity, body.sellerId, body.companyId]);

    if (!update) throw new Error('Update failed');
    if (update.length === 0) {
        await query(client, `
        INSERT INTO "Shares" ("companyId", "numShares", "ownerId", "forSale")
                 VALUES ($1, $2, $3, B'0')`,
            [body.companyId, body.quantity, body.sellerId])
    }
    return {
        ...body,
    };
}

const insertIntoDb = async (data: { sellerId: string, companyId: string, quantity: number} & { callbackUrl: string|undefined}): Promise<{ sellerId: string, companyId: string, quantity: number} | null> => {
    return withClient(async client => {
        try {
            await query(client, 'BEGIN');
            const response = await sellStock(client, data);
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
    const body: { sellerId: string, companyId: string, quantity: number} & { callbackUrl: string } = JSON.parse(record.body);
    const representation = await insertIntoDb(body);
    if (body.callbackUrl) await fetch(body.callbackUrl, {body: JSON.stringify(representation), method: 'POST'});
};
