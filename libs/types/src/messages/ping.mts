import { MessageHeader } from './declarations/message-header.mjs';
import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';
import { MessageBody } from './declarations/message-body.mjs';

export interface PingMessageHeader extends MessageHeader {
    type: MessageType.ping;
}

export interface PingMessageBody extends MessageBody {
    time: number;
}

export interface PingMessage extends Message {
    header: PingMessageHeader;
    body: PingMessageBody;
}

export const createPingMessage = (): PingMessage => (
    {
        header: {
            type: MessageType.ping,
        },
        body: {
        },
    } as PingMessage
);
