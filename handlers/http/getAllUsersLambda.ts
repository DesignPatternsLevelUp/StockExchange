import {APIGatewayProxyHandler} from "aws-lambda";
import {Users} from "../../definitions/Users";
import {query, withClient} from "../../helpers/DBquery";

const getUsersFromDb = async (): Promise<Array<Users & { id: string, bankAccount:string }> | null> => {
    return withClient(client => query<Users & { id: string, bankAccount:string }>(client,`
    SELECT
        "id",
        "bankAccount
    FROM
        "Persons";
    `));
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const users = await getUsersFromDb();
    return {
        statusCode: 200,
        body: JSON.stringify({data: users})
    };
}
