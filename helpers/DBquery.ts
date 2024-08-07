import {Client, ClientConfig, QueryResultRow} from "pg";

export async function withClient<T>(handler: (client: Client) => T) {
    const config: ClientConfig = {
        ssl: {
            rejectUnauthorized: false,
        },
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
    };
    console.log('DB Config:', config);
    const client = new Client(config);
    await client.connect();
    try {
        return await handler(client);
    } finally {
        await client.end();
    }
}

export async function query<T extends QueryResultRow> (client: Client, query: string, values?: Array<any> ): Promise<Array<T> | null> {
    try {
        const result = await (values ? client.query<T>(query, values) : client.query(query))
        return result.rows;
    } catch (error) {
        console.error('DB query failed:', error);
        return null;
    }
}
