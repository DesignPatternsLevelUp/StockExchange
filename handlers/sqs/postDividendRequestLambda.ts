import {SQSHandler} from "aws-lambda";
import {query, withClient} from "../../helpers/DBquery";

export const handler: SQSHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const [record] = event.Records;
    const body: { referenceId: string, businessId: string } & { callBackUrl: string } = JSON.parse(record.body);
    let linkedTransaction;
    let page = 1;
    let pageSize = 25;
    while (!linkedTransaction) {
        const response = await fetch(`${process.env.BANK_URL}/transactions?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) throw new Error('Bank down');
        const body = await response.json();
        const transactions: Array<{creditRef: string, debitAccountName: string, amount: number}> = body.data.items;
        if (transactions.length === 0) throw new Error('No payment yet');
        linkedTransaction = transactions.find(transaction => transaction.creditRef === body.referenceId);
    }
    const amountToDisperse = linkedTransaction.amount * 0.9; // 10% convenience fee
    await withClient(async client => {
        const holders = await query<{bankAccount: string, numberOfShares: number}>(client, `
        SELECT
            COALESCE(P.bankAccount, C.bankAccount) AS bankAccount,
            SUM(S.numShares) AS numberOfShares
        FROM
            Shares S
        JOIN
            Owners O ON S.ownerId = O.id
        LEFT JOIN
            Persons P ON O.personId = P.id
        LEFT JOIN
            Companies C ON O.companyId = C.id
        WHERE
            S.companyId = $1
        GROUP BY
            COALESCE(P.bankAccount, C.bankAccount),
            O.id`, [body.businessId]);
        if (!holders) throw new Error('Unable to get stock holders');
        const totalShares = holders.reduce((previousValue, currentValue) => previousValue + currentValue.numberOfShares, 0);
        const transactions = holders.map(holder => ({
            creditAccountName: holder.bankAccount,
            amount: Math.floor(amountToDisperse * (holder.numberOfShares / totalShares)),
            debitRef: 'dividends',
            creditRef: 'dividends',
        }));
        const response = await fetch(`${process.env.BANK_URL}/transactions/create`, {
            method: 'POST',
            body: JSON.stringify({transactions})
        });
        if (!response.ok) throw new Error('Paying dividends failed');
    })

};
