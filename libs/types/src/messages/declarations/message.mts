import { MessageHeader } from './message-header.mjs';
import { MessageBody } from './message-body.mjs';

export interface Message {
    header: MessageHeader;
    body: MessageBody;
}
