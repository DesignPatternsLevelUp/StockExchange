import { APIGatewayEvent } from "aws-lambda";
import { parseInput } from "./APIGatewayInputParser";

export class APIRequestEndpointRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'APIRequestEndpointRequestError';
    }
}

export class APIRequestEndpointOutcomeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'APIRequestEndpointOutcomeError';
    }
}

export class APIEndpointContext<RequestType, OutcomeType> {
    public readonly request: RequestType;
    public outcome: OutcomeType | undefined;
    public data: {[key: string]: any};

    constructor(event: APIGatewayEvent) {
        let request = parseInput<RequestType>(event);
        this.data = {};
        if (request == null) {
            throw new APIRequestEndpointRequestError('No request found');
        }
        this.request = request;
    }
}

export type APIRequestHandlerBase<RequestType extends Object, OutcomeType> = (context: APIEndpointContext<RequestType, OutcomeType>) => Promise<void>;

export abstract class APIRequestEnpointBase<RequestType extends Object, OutcomeType> {
    private event: APIGatewayEvent;
    public readonly steps: APIRequestHandlerBase<RequestType, OutcomeType>[];
    public context: APIEndpointContext<RequestType, OutcomeType>;
    
    constructor(event: APIGatewayEvent) {
        this.event = event;
        this.steps = [];
        this.context = new APIEndpointContext<RequestType, OutcomeType>(event) as APIEndpointContext<RequestType, OutcomeType>;
    }

    public abstract APIRequestErrorHandler(error: APIRequestEndpointRequestError): Promise<void>;

    public async execute(): Promise<OutcomeType> {
        try {
            this.context = new APIEndpointContext<RequestType, OutcomeType>(this.event) as APIEndpointContext<RequestType, OutcomeType>;
            for (let step of this.steps) {
                await step(this.context);
                if (this.context?.outcome != null) {
                    break;
                }
            }
            if (this.context.outcome == null) {
                throw new APIRequestEndpointOutcomeError('No response set');
            }
            return this.context.outcome;
        } catch (error) {
            if (error instanceof APIRequestEndpointRequestError) {
                await this.APIRequestErrorHandler(error);
                if (this.context?.outcome == null) {
                    throw new APIRequestEndpointOutcomeError('Context outcome not set set');
                }
                return this.context?.outcome;
            }
            throw error;
        }
    }
}