import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface BusDeviceUnknownDeviceConnectedRequestMessageBody {
    certificateThumbprint: string;
    ipAddress: string;
}

export interface BusDeviceUnknownDeviceConnectedRequestMessage extends Message<BusDeviceUnknownDeviceConnectedRequestMessageBody> {
}

export function createBusDeviceUnknownDeviceConnectedRequestMessage(): BusDeviceUnknownDeviceConnectedRequestMessage {
    const msg: BusDeviceUnknownDeviceConnectedRequestMessage = {
        header: { type: MessageType.busDeviceUnknownDeviceConnectedRequest },
        body: {} as BusDeviceUnknownDeviceConnectedRequestMessageBody,
    };
    return msg;
};