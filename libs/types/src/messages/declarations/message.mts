import { MessageHeader } from './message-header.mjs';

export interface Message<TBody> {
    header: MessageHeader;
    body: TBody;
}
