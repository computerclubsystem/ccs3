import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';

export interface PongMessageBody {
    time: number;
}

export interface PongMessage extends Message<PongMessageBody> {
}

export const createPongMessage = (): PongMessage => ({
    header: { type: MessageType.pong },
    body: {} as PongMessageBody,
});
