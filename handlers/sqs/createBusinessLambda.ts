import {SQSHandler} from 'aws-lambda';
import {Business} from "../../definitions/Business";
import {query, withClient} from "../../helpers/DBquery";
import {Client} from "pg";

const createCompany = async (client: Client, data: Business) => {
    const companyResult = await query<{id: string}>(client, `
        INSERT INTO "Companies" ("name", "bankAccount", "pricePerShare")
            VALUES ($1, $2, $3)
        RETURNING "id"`, [data.name, data.bankAccount, 1024 /* TODO */]);
    if (!companyResult) throw new Error ('Create Company failed');
    const ownerResult = await query<{id: string}>(client, `
        INSERT INTO "Owners" ("isCompany", "companyId")
             VALUES (1, $1)
        RETURNING "id"`, [companyResult[0].id]);
    if (!ownerResult) throw new Error('Create Owner failed');
    const shareResult = await query(client, `
        INSERT INTO "Shares" ("companyId", "numShares", "ownerId", "forSale")
            VALUES ($1, 100000, $2, 0)`, [companyResult[0].id, ownerResult[0].id]);
    if (!shareResult) throw new Error('Create Shares failed');
    return {
        ...data,
        id: companyResult[0].id,
        tradingId: ownerResult[0].id,
    }
}

const insertIntoDb = async (data: Business): Promise<Business & { id: string, tradingId: string } | null> => {
    return withClient(async client => {
        try {
            await query(client, 'BEGIN');
            const response = await createCompany(client, data);
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
    const business: Business & { callBackUrl: string } = JSON.parse(record.body);
    const representation = await insertIntoDb(business);
    await fetch(business.callBackUrl, {body: JSON.stringify(representation), method: 'POST'});
};
