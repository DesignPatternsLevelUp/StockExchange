
import {APIGatewayProxyHandler} from "aws-lambda";
import { parseInput } from "../../helpers/APIGatewayInputParser";



export const handler: APIGatewayProxyHandler = async (event, context) => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);
    const code = parseInput<{ code: string }>(event)?.code;
    const res = await fetch(`${process.env.tokenEndpoint}?client_id=${process.env.clientId}&client_secret=${process.env.clientSecret}&redirect_uri=${new URL(process.env.redirectUrl ?? '' )}&grant_type=authorization_code&code=${code}`,
    {
        method: "POST"
    }
    );
    console.log(`${process.env.tokenEndpoint}?client_id=${process.env.clientId}&client_secret=${process.env.clientSecret}&redirect_uri=${new URL(process.env.redirectUrl ?? '' )}&grant_type=authorization_code&code=${code}`);
    if (res.ok){
        let body = await res.json();

        return {
            statusCode: 200,
            body: JSON.stringify({accessToken: body.access_token})
        };
    }
    else{
        return {
            statusCode: 500,
            body: JSON.stringify({message: "sad broke soz"})
        };
    }

}
