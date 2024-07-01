import { SQSClient, SendMessageCommand, ReceiveMessageCommand, QueueAttributeName, SendMessageCommandOutput, ReceiveMessageCommandOutput, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import * as dotenv from 'dotenv';
dotenv.config();

export class SQSMessenger {
    private static client = new SQSClient({
        region: process.env.AWS_REGION
    });
    private static queueUrl = process.env.AWS_STOCKS_QUEUE_URL;
    
    public static async SendMessage<RequestType extends Object>(request: RequestType) : Promise<SendMessageCommandOutput>{
        let response = await this.client.send(new SendMessageCommand({QueueUrl: this.queueUrl, MessageBody: JSON.stringify(request) }));
        return response;
    }

    public static async ReadMessage() : Promise<ReceiveMessageCommandOutput>{
        let response = await this.client.send(new ReceiveMessageCommand({
            AttributeNames: [QueueAttributeName.CreatedTimestamp],
            MaxNumberOfMessages: 1,
            MessageAttributeNames: ["All"],
            QueueUrl: this.queueUrl,
            WaitTimeSeconds: 20,
        }));
    
        return response;
    }

    public static async DeleteMessage(response: ReceiveMessageCommandOutput) {
        if (response.Messages == undefined || response.Messages.length == 0) {
            return;
        }
        await this.client.send(new DeleteMessageCommand({
            QueueUrl: this.queueUrl, 
            ReceiptHandle: response.Messages[0].ReceiptHandle
        }));
    }
}

