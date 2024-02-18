import { Device } from 'src/entities/device.mjs';
import { Message } from '../declarations/message.mjs';
import { transferSharedMessageDataToReplyMessage } from '../utils.mjs';
import { MessageType } from '../declarations/message-type.mjs';

export interface BusDeviceGetByCertificateReplyMessageBody {
    device: Device;
}

export interface BusDeviceGetByCertificateReplyMessage extends Message<BusDeviceGetByCertificateReplyMessageBody> {
}

export function createBusDeviceGetByCertificateReplyMessage<TBody>(sourceMessage?: Message<TBody> | null): BusDeviceGetByCertificateReplyMessage {
    const msg: BusDeviceGetByCertificateReplyMessage = {
        header: { type: MessageType.busDeviceGetByCertificateReply },
        body: {} as BusDeviceGetByCertificateReplyMessageBody,
    };
    transferSharedMessageDataToReplyMessage(msg, sourceMessage);
    return msg;
};
