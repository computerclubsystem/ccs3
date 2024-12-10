import { MessageError } from './message-error.mjs';
import { MessageType } from './message-type.mjs';
import { RoundTripData } from './round-trip-data.mjs';

export interface MessageHeader {
    type: MessageType;
    correlationId?: string;
    source?: string;
    target?: string;
    roundTripData?: RoundTripData;
    failure?: boolean;
    errors?: MessageError[];
}
