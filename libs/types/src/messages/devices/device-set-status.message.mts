import { DeviceState } from 'src/entities/device-state.mjs';
import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface DeviceStatusAmounts {
    totalSum: number;
    totalTime: number;
    startedAt: number;
    expectedEndAt: number;
    remainingSeconds: number;
}

export interface DeviceSetStatusMessageBody {
    state: DeviceState;
    amounts: DeviceStatusAmounts;
}

export interface DeviceSetStatusMessage extends Message<DeviceSetStatusMessageBody> {
}

export function createDeviceSetStatusMessage(): DeviceSetStatusMessage {
    const msg: DeviceSetStatusMessage = {
        header: { type: MessageType.deviceSetStatus },
        body: {} as DeviceSetStatusMessageBody,
    };
    return msg;
};