import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface BusDeviceGetByCertificateRequestMessageBody {
    certificateThumbprint: string;
    ipAddress: string;
}

export interface BusDeviceGetByCertificateRequestMessage extends Message<BusDeviceGetByCertificateRequestMessageBody> {
}

export function createBusDeviceGetByCertificateRequestMessage(): BusDeviceGetByCertificateRequestMessage {
    const msg: BusDeviceGetByCertificateRequestMessage = {
        header: { type: MessageType.busDeviceGetByCertificateRequest },
        body: {} as BusDeviceGetByCertificateRequestMessageBody,
    };
    return msg;
};