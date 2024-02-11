import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';

export interface PingMessageBody {
    time: number;
}

export interface PingMessage extends Message<PingMessageBody> {
}

export const createPingMessage = (): PingMessage => ({
    header: { type: MessageType.ping },
    body: {} as PingMessageBody,
});
