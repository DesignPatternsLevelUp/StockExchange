import {SQSHandler} from 'aws-lambda';
import {Business} from "../definitions/Business";

const insertIntoDb = async (data: Business): Promise<Business & { id: string } | null> => {
    return null; // TODO
}

export const handler: SQSHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const [record] = event.Records;
    const business: Business & { callBackUrl: string } = JSON.parse(record.body);
    const representation = await insertIntoDb(business);
    await fetch(business.callBackUrl, {body: JSON.stringify(representation), method: 'POST'});
};
