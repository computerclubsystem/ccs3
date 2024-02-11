import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';

export interface DeviceAuthMessageBody {
    deviceId: string;
    softwareVersion: string;
}

export interface DeviceAuthMessage extends Message<DeviceAuthMessageBody> {
}

export const createJoinMessage = (): DeviceAuthMessage => ({
    header: { type: MessageType.deviceAuth },
    body: {} as DeviceAuthMessageBody,
});