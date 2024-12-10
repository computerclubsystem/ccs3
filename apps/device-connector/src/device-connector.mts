import { DetailedPeerCertificate } from 'node:tls';
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';

import { RedisConnector } from './redis-connector.mjs';
import {
    ClientConnectedEventArgs, ConnectionClosedEventArgs, ConnectionErrorEventArgs,
    WssServerEventName, MessageReceivedEventArgs, WssServer, WssServerConfig
} from './wss-server.mjs';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';
import { Logger } from './logger.mjs';
import { Device } from '@computerclubsystem/types/entities/device.mjs';
import {
    CreateConnectedRedisClientOptions, RedisClientMessageCallback, RedisPubClient, RedisSubClient
} from '@computerclubsystem/redis-client';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';
import { createBusDeviceGetByCertificateRequestMessage } from '@computerclubsystem/types/messages/bus/bus-device-get-by-certificate-request.message.mjs';
import { createBusDeviceUnknownDeviceConnectedRequestMessage } from '@computerclubsystem/types/messages/bus/bus-device-unknown-device-connected-request.message.mjs';
import { BusDeviceGetByCertificateReplyMessage } from '@computerclubsystem/types/messages/bus/bus-device-get-by-certificate-reply.message.mjs';
import { MessageType } from '@computerclubsystem/types/messages/declarations/message-type.mjs';
import { RoundTripData } from '@computerclubsystem/types/messages/declarations/round-trip-data.mjs';
import { BusDeviceStatusesMessage, DeviceStatus } from '@computerclubsystem/types/messages/bus/bus-device-statuses.message.mjs';
import { createDeviceSetStatusMessage } from '@computerclubsystem/types/messages/devices/device-set-status.message.mjs';
import { ConnectionRoundTripData } from '@computerclubsystem/types/messages/declarations/connection-roundtrip-data.mjs';

export class DeviceConnector {
    redisConnector!: RedisConnector;
    redisEmitter!: EventEmitter;
    wssServer!: WssServer;
    wssEmitter!: EventEmitter;
    desktopSwitchCounter = 0;
    connectedClients = new Map<number, ConnectedClientData>();

    private readonly subClient = new RedisSubClient();
    private readonly pubClient = new RedisPubClient();
    private readonly messageBusIdentifier = 'ccs3/device-connector';
    private logger = new Logger();

    async start(): Promise<void> {
        await this.joinMessageBus();
        this.startWebSocketServer();
        this.startDeviceConnectionsMonitor();
    }

    private processDeviceConnected(args: ClientConnectedEventArgs): void {
        this.logger.log('Device connected', args);
        const clientCertificateFingerprint = args.certificate?.fingerprint;
        if (!args.ipAddress || !clientCertificateFingerprint) {
            // The args.ipAddress can be undefined if the client already closed the connection
            this.logger.warn(
                'The device ip address is missing / client disconnected or the certificate does not have fingerprint',
                'IP address',
                args.ipAddress,
                'Certificate thumbprint',
                clientCertificateFingerprint,
                'Connection Id', args.connectionId
            );
            this.wssServer.closeConnection(args.connectionId);
            return;
        }
        const data: ConnectedClientData = {
            connectionId: args.connectionId,
            connectedAt: this.getNow(),
            deviceId: null,
            certificate: args.certificate,
            certificateThumbprint: this.getLowercasedCertificateThumbprint(clientCertificateFingerprint),
            ipAddress: args.ipAddress,
            lastMessageReceivedAt: null,
            receivedMessagesCount: 0,
            isAuthenticated: false,
        };
        this.connectedClients.set(args.connectionId, data);
        const msg = createBusDeviceGetByCertificateRequestMessage();
        const roundTripData: ConnectionRoundTripData = {
            connectionId: data.connectionId,
            certificateThumbprint: data.certificateThumbprint,
            ipAddress: args.ipAddress,
        };
        msg.header.roundTripData = roundTripData;
        msg.body.certificateThumbprint = data.certificateThumbprint;
        msg.body.ipAddress = args.ipAddress;
        this.publishToDevicesChannel(msg);
    }

    private getLowercasedCertificateThumbprint(certificateFingerprint: string): string {
        return certificateFingerprint.replaceAll(':', '').toLowerCase();
    }

    private processDeviceConnectionClosed(args: ConnectionClosedEventArgs): void {
        this.logger.log('Device connection closed', args);
        this.removeClient(args.connectionId);
    }

    private processDeviceConnectionError(args: ConnectionErrorEventArgs): void {
        this.logger.warn('Device connection error', args);
        this.removeClient(args.connectionId);
    }

    private processDeviceMessageReceived(args: MessageReceivedEventArgs): void {
        let msg: Message<any> | null;
        let type: MessageType | undefined;
        try {
            msg = this.deserializeWebSocketBufferToMessage(args.buffer);
            this.logger.log('Received message from device', msg);
            type = msg?.header?.type;
            if (!type) {
                return;
            }
        } catch (err) {
            this.logger.warn(`Can't deserialize device message`, args, err);
            return;
        }

        switch (type) {
        }

        // switch (type) {
        //     case MessageType....:
        //         this.process...Message(msg, args.connectionId);
        //         break;
        // }
    }

    processBusMessageReceived(channelName: string, message: Message<any>): void {
        if (this.isOwnMessage(message)) {
            return;
        }
        this.logger.log('Received channel', channelName, 'message', message.header.type, message);
        const type = message.header.type;
        if (!type) {
            return;
        }

        switch (channelName) {
            case ChannelName.devices:
                this.processDevicesBusMessage(message);
                break;
            case ChannelName.shared:
                break;
        }
    }

    processDevicesBusMessage<TBody>(message: Message<TBody>): void {
        const type = message.header.type;
        switch (type) {
            case MessageType.busDeviceGetByCertificateReply:
                this.processDeviceGetByCertificateReply(message as BusDeviceGetByCertificateReplyMessage);
                break;
            case MessageType.busDeviceStatuses:
                this.processDeviceStatusesMessage(message as BusDeviceStatusesMessage);
                break;
        }
    }

    processDeviceStatusesMessage(message: BusDeviceStatusesMessage): void {
        this.sendStatusToDevices(message.body.deviceStatuses);
    }

    sendStatusToDevices(deviceStatuses: DeviceStatus[]): void {
        for (const status of deviceStatuses) {
            const connections = this.getConnectedClientsDataByDeviceId(status.deviceId);
            if (connections.length > 0) {
                for (const connection of connections) {
                    const connectionId = connection[0];
                    const msg = createDeviceSetStatusMessage();
                    msg.body.state = status.state;
                    msg.body.amounts = {
                        expectedEndAt: status.expectedEndAt,
                        remainingSeconds: status.remainingSeconds,
                        startedAt: status.startedAt,
                        totalSum: status.totalSum,
                        totalTime: status.totalTime,
                    };
                    try {
                        this.sendToDevice(msg, connectionId);
                    } catch (err) {
                        this.logger.warn(`Can't send to device`, connectionId, msg, err);
                    }
                }
            }
        }
    }

    processDeviceGetByCertificateReply(message: BusDeviceGetByCertificateReplyMessage): void {
        const device: Device = message.body.device;
        const roundtripData = message.header.roundTripData as ConnectionRoundTripData;
        const connectionId = roundtripData.connectionId;
        if (!device) {
            // Device with specified certificate does not exist
            this.sendBusDeviceUnknownDeviceConnectedRequestMessage(roundtripData.ipAddress, roundtripData.connectionId, roundtripData.certificateThumbprint);
            return;
        }
        if (!device?.active) {
            this.logger.log('The device is not active. Closing connection. Device', device?.id, roundtripData);
            this.removeClient(connectionId);
            this.wssServer.closeConnection(connectionId);
            return;
        }

        // Attach websocket server to connection so we receive events
        const connectionExist = this.wssServer.attachToConnection(connectionId);
        if (!connectionExist) {
            this.removeClient(connectionId);
            return;
        }
        const clientData = this.getConnectedClientData(connectionId);
        if (clientData) {
            clientData.deviceId = device.id;
            clientData.isAuthenticated = true;
            // TODO: Send message to device
        }
    }

    private sendBusDeviceUnknownDeviceConnectedRequestMessage(ipAddress: string, connectionId: number, certificateThumbprint: string): void {
        const msg = createBusDeviceUnknownDeviceConnectedRequestMessage();
        const roundTripData: ConnectionRoundTripData = {
            connectionId: connectionId,
            certificateThumbprint: certificateThumbprint,
            ipAddress: ipAddress,
        };
        msg.header.roundTripData = roundTripData;
        msg.body.certificateThumbprint = certificateThumbprint;
        msg.body.ipAddress = ipAddress;
        this.publishToDevicesChannel(msg);
    }

    private getConnectedClientData(connectionId: number): ConnectedClientData | undefined {
        return this.connectedClients.get(connectionId);
    }

    private getConnectedClientsDataByDeviceId(deviceId: string): [number, ConnectedClientData][] {
        const result: [number, ConnectedClientData][] = [];
        for (const item of this.connectedClients.entries()) {
            const data = item[1];
            if (data.deviceId === deviceId) {
                result.push(item);
            }
        }
        return result;
    }

    private removeClient(connectionId: number): void {
        this.connectedClients.delete(connectionId);
    }

    isOwnMessage<TBody>(message: Message<TBody>): boolean {
        return (message.header.source === this.messageBusIdentifier);
    }

    deserializeWebSocketBufferToMessage(buffer: Buffer): Message<any> | null {
        const text = buffer.toString();
        const json = JSON.parse(text);
        return json as Message<any>;
    }

    deserializeBusMessageToMessage(text: string): Message<any> | null {
        const json = JSON.parse(text);
        return json as Message<any>;
    }

    private sendToDevice<TBody>(message: Message<TBody>, connectionId: number): void {
        this.logger.log('Sending to device', connectionId, message);
        this.wssServer.sendJSON(message, connectionId);
    }

    private publishToDevicesChannel<TBody>(message: Message<TBody>): void {
        message.header.source = this.messageBusIdentifier;
        this.logger.log('Publishing message', ChannelName.devices, message.header.type, message);
        this.pubClient.publish(ChannelName.devices, JSON.stringify(message));
    }

    getNow(): number {
        return Date.now();
    }

    private async joinMessageBus(): Promise<void> {
        const redisHost = this.getEnvVarValue('CCS3_REDIS_HOST');
        const redisPortEnvVarVal = this.getEnvVarValue('CCS3_REDIS_PORT');
        const redisPort = redisPortEnvVarVal ? parseInt(redisPortEnvVarVal) : 6379;
        this.logger.log('Using redis host', redisHost, 'and port', redisPort);

        let receivedMessagesCount = 0;
        const subClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => console.error('SubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                this.logger.error('SubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        const subClientMessageCallback: RedisClientMessageCallback = (channelName, message) => {
            receivedMessagesCount++;
            try {
                const messageJson = this.deserializeBusMessageToMessage(message);
                if (messageJson) {
                    this.processBusMessageReceived(channelName, messageJson);
                } else {
                    this.logger.warn('The message', message, 'deserialized to null');
                }
            } catch (err) {
                this.logger.warn('Cannot deserialize channel', channelName, 'message', message, err);
            }
        };
        this.logger.log('SubClient connecting to Redis');
        await this.subClient.connect(subClientOptions, subClientMessageCallback);
        this.logger.log('SubClient connected to Redis');
        await this.subClient.subscribe(ChannelName.shared);
        await this.subClient.subscribe(ChannelName.devices);
        this.logger.log('SubClient subscribed to the channels');

        const pubClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => this.logger.error('PubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                this.logger.error('PubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        this.logger.log('PubClient connecting to Redis');
        await this.pubClient.connect(pubClientOptions);
        this.logger.log('PubClient connected to Redis');
    }

    private startWebSocketServer(): void {
        this.wssServer = new WssServer();
        const wssServerConfig: WssServerConfig = {
            cert: fs.readFileSync('./certificates/ccs3.device-connector.local.crt').toString(),
            key: fs.readFileSync('./certificates/ccs3.device-connector.local.key').toString(),
            port: 65444
        };
        this.wssServer.start(wssServerConfig);
        this.wssEmitter = this.wssServer.getEmitter();
        this.wssEmitter.on(WssServerEventName.clientConnected, args => this.processDeviceConnected(args));
        this.wssEmitter.on(WssServerEventName.connectionClosed, args => this.processDeviceConnectionClosed(args));
        this.wssEmitter.on(WssServerEventName.connectionError, args => this.processDeviceConnectionError(args));
        this.wssEmitter.on(WssServerEventName.messageReceived, args => this.processDeviceMessageReceived(args));
    }

    private startDeviceConnectionsMonitor(): void {
        setInterval(() => this.cleanUpDeviceConnections(), 10000);
    }

    private cleanUpDeviceConnections(): void {
        const connectionIdsWithCleanUpReason = new Map<number, ConnectionCleanUpReason>();
        const now = this.getNow();
        // 20 seconds
        const maxNotAuthenticatedDuration = 20 * 1000;
        const maxIdleTimeoutDuration = 20 * 1000;
        for (const entry of this.connectedClients.entries()) {
            const connectionId = entry[0];
            const data = entry[1];
            // Devices are authenticating with certificates
            if (!data.isAuthenticated && (now - data.connectedAt) > maxNotAuthenticatedDuration) {
                connectionIdsWithCleanUpReason.set(connectionId, ConnectionCleanUpReason.authenticationTimeout);
            }
            // Add other conditions
            if (data.lastMessageReceivedAt) {
                if ((now - data.lastMessageReceivedAt) > maxIdleTimeoutDuration) {
                    connectionIdsWithCleanUpReason.set(connectionId, ConnectionCleanUpReason.idleTimeout);
                }
            }
        }

        for (const entry of connectionIdsWithCleanUpReason.entries()) {
            const connectionId = entry[0];
            const data = this.getConnectedClientData(connectionId);
            this.logger.warn('Disconnecting client', connectionId, entry[1], data);
            this.removeClient(connectionId);
            this.wssServer.closeConnection(connectionId);
        }
    }

    getEnvVarValue(envVarName: string, defaultValue?: string): string | undefined {
        return process.env[envVarName] || defaultValue;
    }
}

interface ConnectedClientData {
    connectionId: number;
    connectedAt: number;
    /**
     * Device ID in the system
     */
    deviceId: string | null;
    /**
     * The client certificate
     */
    certificate: DetailedPeerCertificate | null;
    /**
     * certificate.fingeprint without the colon separator and lowercased
     */
    certificateThumbprint: string;
    ipAddress: string | null;
    lastMessageReceivedAt: number | null;
    receivedMessagesCount: number;
    /**
     * Whether the client is authenticated to use the system
     * While the system checks the client, it will not send messages to the client or process messages from it
     */
    isAuthenticated: boolean;
}

const enum ConnectionCleanUpReason {
    authenticationTimeout = 'authentication-timeout',
    idleTimeout = 'idle-timeout',
}