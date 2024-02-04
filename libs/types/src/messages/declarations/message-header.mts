import { MessageType } from './message-type.mjs';

export interface MessageHeader {
    type: MessageType;
    correlationId?: string;
    source?: string;
    target?: string;
}
