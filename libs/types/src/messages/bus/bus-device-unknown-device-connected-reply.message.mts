import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface BusDeviceUnknownDeviceConnectedReplyMessageBody {
    id: number;
}

export interface BusDeviceUnknownDeviceConnectedReplyMessage extends Message<BusDeviceUnknownDeviceConnectedReplyMessageBody> {
}

export function createBusDeviceUnknownDeviceConnectedReplyMessage(): BusDeviceUnknownDeviceConnectedReplyMessage {
    const msg: BusDeviceUnknownDeviceConnectedReplyMessage = {
        header: { type: MessageType.busDeviceUnknownDeviceConnectedReply },
        body: {} as BusDeviceUnknownDeviceConnectedReplyMessageBody,
    };
    return msg;
};