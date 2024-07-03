import {SQSHandler} from "aws-lambda";
import {query, withClient} from "../../helpers/DBquery";
import {Client} from "pg";

const createUser = async (client: Client, user: { bankAccount: string}) => {
    const [userDetails] = await query<{id: string}>(client, `
    INSERT INTO "Users" ("bankAccount")
        VALUES ($1)
    RETURNING "id"`,
        [user.bankAccount]) ?? [];
    if (!userDetails) throw new Error ('Insert user failed');
    const [ownerResult] = await query<{id: string}>(client, `
    INSERT INTO "Owners" ("isCompany", "personId")
         VALUES (0, $1)
    RETURNING "id"`, [userDetails.id]) ?? [];
    if (!ownerResult) throw new Error('Insert Owner failed');
    return {
        ...user,
        id: ownerResult.id
    }
}

const insertIntoDb = async (data: { bankAccount: string }): Promise<{ bankAccount: string, id: string } | null> => {
    return withClient(async client => {
        try {
            await query(client, 'BEGIN');
            const response = await createUser(client, data);
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
    const user: { bankAccount: string } & { callBackUrl: string } = JSON.parse(record.body);
    const representation = await insertIntoDb(user);
    await fetch(user.callBackUrl, {body: JSON.stringify(representation), method: 'POST'});
};
