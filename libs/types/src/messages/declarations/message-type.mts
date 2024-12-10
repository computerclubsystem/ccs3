export const enum MessageType {
    // Devices
    deviceSetStatus = 'device-set-status',

    
    // Message bus
    busDeviceGetByCertificateRequest = 'bus-device-get-by-certificate-request',
    busDeviceGetByCertificateReply = 'bus-device-get-by-certificate-reply',
    busDeviceStatuses = 'bus-device-statuses',
    busOperatorAuthRequest = 'bus-operator-auth-request',

    busDeviceUnknownDeviceConnectedRequest = 'bus-device-unknown-device-connected-request',
    busDeviceUnknownDeviceConnectedReply = 'bus-device-unknown-device-connected-reply',
    

    // Operators
    operatorAuthRequest = 'operator-auth-request',
}
