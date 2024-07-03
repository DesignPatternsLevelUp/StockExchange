import { APIGatewayProxyHandler } from "aws-lambda";
import { Client } from "pg";
import { withClient } from "../../helpers/DBquery";

const tablesToDelete = [
	"Transactions",
	"Shares",
	"Owners",
	"Persons",
	"Companies",
];

const clearDataAndResetPKs = async (): Promise<void> => {
	try {
		await withClient(async (client: Client) => {
			for (const table of tablesToDelete) {
				await client.query(`DELETE FROM "${table}";`);
			}

			const sequenceResetQueries = tablesToDelete.map(
				(table) => `ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1;`
			);
			for (const query of sequenceResetQueries) {
				await client.query(query);
			}
		});
		console.log("Data cleared and primary keys reset successfully.");
	} catch (error) {
		console.error("Error clearing data and resetting primary keys:", error);
		throw error;
	}
};

export const handler: APIGatewayProxyHandler = async (event, context) => {
	console.log(`Event: ${JSON.stringify(event, null, 2)}`);
	console.log(`Context: ${JSON.stringify(context, null, 2)}`);

	try {
		await clearDataAndResetPKs();
		return {
			statusCode: 200,
			body: JSON.stringify({
				message: "Data cleared and primary keys reset successfully.",
			}),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: "Error clearing data and resetting primary keys.",
			}),
		};
	}
};
