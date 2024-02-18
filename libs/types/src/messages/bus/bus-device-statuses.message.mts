import { DeviceState } from 'src/entities/device-state.mjs';
import { MessageType } from '../declarations/message-type.mjs';
import { Message } from '../declarations/message.mjs';

export interface DeviceStatus {
    deviceId: string;
    state: DeviceState;
    totalSum: number;
    totalTime: number;
    startedAt: number;
    expectedEndAt: number;
    remainingSeconds: number;
}

export interface BusDeviceStatusesMessageBody {
    deviceStatuses: DeviceStatus[];
}

export interface BusDeviceStatusesMessage extends Message<BusDeviceStatusesMessageBody> {
}

export function createBusDeviceStatusesMessage(): BusDeviceStatusesMessage {
    const msg: BusDeviceStatusesMessage = {
        header: { type: MessageType.busDeviceStatuses },
        body: {} as BusDeviceStatusesMessageBody,
    };
    return msg;
};