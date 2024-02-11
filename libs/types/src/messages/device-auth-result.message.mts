import { MessageType } from './declarations/message-type.mjs';
import { Message } from './declarations/message.mjs';

export interface DeviceAuthResultSettings {
    reportDiagnosticsInterval: number;
    newerVersionUrl?: string;
}

export interface DeviceAuthResultMessageBody {
    authenticated: boolean;
    settings?: DeviceAuthResultSettings;
}

export interface DeviceAuthResultMessage extends Message<DeviceAuthResultMessageBody> {
}

export const createDeviceAuthResultMessage = (): DeviceAuthResultMessage => ({
    header: { type: MessageType.deviceAuthResult },
    body: {} as DeviceAuthResultMessageBody,
});