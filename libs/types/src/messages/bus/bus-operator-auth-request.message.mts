import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface BusOperatorAuthRequestMessageBody {
    username?: string;
    passwordHash?: string;
    token?: string;
}

export interface BusOperatorAuthRequestMessage extends Message<BusOperatorAuthRequestMessageBody> {
}

export function createBusOperatorAuthRequestMessage(): BusOperatorAuthRequestMessage {
    const msg: BusOperatorAuthRequestMessage = {
        header: { type: MessageType.busOperatorAuthRequest },
        body: {} as BusOperatorAuthRequestMessageBody,
    };
    return msg;
};