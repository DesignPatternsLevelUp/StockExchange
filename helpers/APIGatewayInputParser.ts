import {APIGatewayEvent} from "aws-lambda";

export const parseInput = <T>(input: APIGatewayEvent): T | null => {
    const contentType = input.headers['content-type'] ?? input.headers['Content-Type'];
    if (contentType !== 'application/json') return null;
    try {
        return input.body ? (JSON.parse(input.body)) : null;
    } catch (error) {
        return null;
    }
}
