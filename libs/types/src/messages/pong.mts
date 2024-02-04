import { MessageBody } from './declarations/message-body.mjs';
import { MessageHeader } from './declarations/message-header.mjs';
import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';

export interface PongMessageHeader extends MessageHeader {
    type: MessageType.pong;
}

export interface PongMessageBody extends MessageBody {
    time: number;
}

export interface PongMessage extends Message {
    header: PongMessageHeader;
    body: PongMessageBody;
}

export const createPongMessage = (): PongMessage => (
    {
        header: {
            type: MessageType.pong,
        },
        body: {
        },
    } as PongMessage
);
