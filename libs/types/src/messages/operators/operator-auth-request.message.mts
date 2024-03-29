import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface OperatorAuthRequestMessageBody {
    username?: string;
    passwordHash?: string;
    token?: string;
}

export interface OperatorAuthRequestMessage extends Message<OperatorAuthRequestMessageBody> {
}

export function createOperatorAuthRequestMessage(): OperatorAuthRequestMessage {
    const msg: OperatorAuthRequestMessage = {
        header: { type: MessageType.operatorAuthRequest },
        body: {} as OperatorAuthRequestMessageBody,
    };
    return msg;
};