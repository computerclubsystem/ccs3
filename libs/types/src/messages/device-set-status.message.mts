import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';

export const enum DeviceStatusAccessType {
    enabled = 'enabled',
    disabled = 'disabled',
}

export interface DeviceStatusAmounts {
    totalSum: number;
    durationSeconds: number;
    remainingSeconds?: number;
}

export interface DeviceSetStatusMessageBody {
    accessType: DeviceStatusAccessType;
    amounts: DeviceStatusAmounts;
}

export interface DeviceSetStatusMessage extends Message<DeviceSetStatusMessageBody> {
}

export const createDeviceSetStatusMessage = (): DeviceSetStatusMessage => ({
    header: { type: MessageType.deviceSetStatus },
    body: {} as DeviceSetStatusMessageBody,
});