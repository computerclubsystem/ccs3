import { DetailedPeerCertificate } from 'node:tls';
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';

import { CreateConnectedRedisClientOptions, RedisClientMessageCallback, RedisPubClient, RedisSubClient } from '@computerclubsystem/redis-client';
import { Logger } from './logger.mjs';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';
import { MessageType } from '@computerclubsystem/types/messages/declarations/message-type.mjs';
import { BusDeviceStatusesMessage, DeviceStatus } from '@computerclubsystem/types/messages/bus/bus-device-statuses.message.mjs';
import { ClientConnectedEventArgs, ConnectionClosedEventArgs, ConnectionErrorEventArgs, MessageReceivedEventArgs, WssServer, WssServerConfig, WssServerEventName } from './wss-server.mjs';
import { RoundTripData } from '@computerclubsystem/types/messages/declarations/round-trip-data.mjs';
import { OperatorAuthRequestMessage, createOperatorAuthRequestMessage } from '@computerclubsystem/types/messages/operators/operator-auth-request.message.mjs';
import { IStaticFilesServerConfig, StaticFilesServer } from './static-files-server.mjs';
import { envVars } from './env-vars.mjs';

export class OperatorConnector {
    private readonly subClient = new RedisSubClient();
    private readonly pubClient = new RedisPubClient();
    private readonly messageBusIdentifier = 'ccs3/operator-connector';
    private logger = new Logger();
    private staticFilesServer?: StaticFilesServer;
    private webSocketPort = 65443;

    wssServer!: WssServer;
    wssEmitter!: EventEmitter;
    connectedClients = new Map<number, ConnectedClientData>();

    async start(): Promise<void> {
        await this.joinMessageBus();
        this.startWebSocketServer();
        // TODO: Start interval for cleaning up inactive connections
        this.serveStaticFiles();
    }

    serveStaticFiles(): void {
        const noStaticFilesServing = this.getEnvVarValue(envVars.CCS3_OPERATOR_CONNECTOR_NO_STATIC_FILES_SERVING);
        if (noStaticFilesServing !== 'true' && noStaticFilesServing !== '1') {
            const staticFilesPath = this.getEnvVarValue(envVars.CCS3_OPERATOR_CONNECTOR_STATIC_FILES_PATH) || './web-app';
            const config = {
                notFoundFile: './index.html',
                path: staticFilesPath,
            } as IStaticFilesServerConfig;
            this.staticFilesServer = new StaticFilesServer(config, this.wssServer.getHttpsServer());
            this.staticFilesServer.start();
            const resolvedStaticFilesPath = this.staticFilesServer.getResolvedPath();
            const staticFilesPathExists = fs.existsSync(resolvedStaticFilesPath);
            if (staticFilesPathExists) {
                this.logger.log('Serving static files from', resolvedStaticFilesPath);
            } else {
                this.logger.warn('Static files path', resolvedStaticFilesPath, 'does not exist');
            }
        }
    }

    private async joinMessageBus(): Promise<void> {
        const redisHost = this.getEnvVarValue(envVars.CCS3_REDIS_HOST) || 'localhost';
        const redisPortEnvVarVal = this.getEnvVarValue(envVars.CCS3_REDIS_PORT);
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
        await this.subClient.subscribe(ChannelName.operators);
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
            cert: fs.readFileSync('./certificates/ccs3.operator-connector.local.crt').toString(),
            key: fs.readFileSync('./certificates/ccs3.operator-connector.local.key').toString(),
            port: this.webSocketPort,
            sendText: true,
        };
        this.wssServer.start(wssServerConfig);
        this.wssEmitter = this.wssServer.getEmitter();
        this.wssEmitter.on(WssServerEventName.clientConnected, args => this.processOperatorConnected(args));
        this.wssEmitter.on(WssServerEventName.connectionClosed, args => this.processDeviceConnectionClosed(args));
        this.wssEmitter.on(WssServerEventName.connectionError, args => this.processDeviceConnectionError(args));
        this.wssEmitter.on(WssServerEventName.messageReceived, args => this.processOperatorMessageReceived(args));
        this.logger.log('WebSocket server listening at port', this.webSocketPort);
    }

    private processOperatorConnected(args: ClientConnectedEventArgs): void {
        this.logger.log('Operator connected', args);
        const data: ConnectedClientData = {
            connectionId: args.connectionId,
            connectedAt: this.getNow(),
            operatorId: null,
            certificate: args.certificate,
            certificateThumbprint: this.getLowercasedCertificateThumbprint(args.certificate?.fingerprint),
            ipAddress: args.ipAddress,
            lastMessageReceivedAt: null,
            receivedMessagesCount: 0,
            isAuthenticated: false,
        };
        this.connectedClients.set(args.connectionId, data);
        // TODO: Should we allow messages from the client immediatelly after connected ?
        this.wssServer.attachToConnection(args.connectionId);
    }

    processOperatorMessageReceived(args: MessageReceivedEventArgs): void {
        let msg: Message<any> | null;
        let type: MessageType | undefined;
        try {
            msg = this.deserializeWebSocketBufferToMessage(args.buffer);
            this.logger.log('Received message from operator', msg);
            if (!msg) {
                return;
            }
            type = msg.header?.type;
            if (!type) {
                return;
            }
            this.processOperatorMessage(args.connectionId, msg);
        } catch (err) {
            this.logger.warn(`Can't deserialize operator message`, args, err);
            return;
        }
        // const msg = createBusOperatorAuthRequestMessage();
        // const roundTripData: ConnectionRoundTripData = {
        //     connectionId: data.connectionId,
        // };
        // msg.hea
        // der.roundTripData = roundTripData;
        // msg.body.certificateThumbprint = args.certificate.fingerprint.replaceAll(':', '').toLowerCase();
        // msg.body.ipAddress = args.ipAddress;
        // this.publishToOperatorsChannel(msg);
    }

    processOperatorMessage(connectionId: number, message: Message<any>): void {
        const type = message.header.type;
        switch (type) {
            case MessageType.operatorAuthRequest:
                this.processOperatorAuthRequestMessage(connectionId, message as OperatorAuthRequestMessage);
                break;
        }
    }

    processOperatorAuthRequestMessage(connectionId: number, message: OperatorAuthRequestMessage): void {
        if (!message?.body) {
            // TODO: Send message to operator that body is required
            return;
        }
        if (!message.body.username && !message.body.passwordHash && !message.body.token) {
            // TODO: Send message to operator that 
            return;
        }

        const msg = createOperatorAuthRequestMessage();
        msg.body.passwordHash = message.body.passwordHash;
        msg.body.username = message.body.username;
        msg.body.token = message.body.token;
        const roundtripData: ConnectionRoundTripData = { connectionId: connectionId };
        msg.header.roundTripData = roundtripData;
        this.publishToOperatorsChannel(msg);

        // TODO: For now we will send back mock reply
        this.wssServer.sendJSON({ header: { type: 'auth-reply' }, body: { allowed: true } }, connectionId);
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
            case MessageType.busDeviceStatuses:
                this.processDeviceStatusesMessage(message as BusDeviceStatusesMessage);
                break;
        }
    }

    processDeviceStatusesMessage(message: BusDeviceStatusesMessage): void {
        this.sendDeviceStatusesToOperators(message.body.deviceStatuses);
    }

    processDeviceConnectionClosed(args: ConnectionClosedEventArgs): void {
        this.logger.log('Device connection closed', args);
        this.removeConnection(args.connectionId);
    }

    processDeviceConnectionError(args: ConnectionErrorEventArgs): void {
        this.logger.log('Device connection error', args);
        // TODO: Should we close the connection ?
    }

    removeConnection(connectionId: number): void {
        const data = this.connectedClients.get(connectionId);
        // TODO: Publish message to the message bus
    }

    sendDeviceStatusesToOperators(deviceStatuses: DeviceStatus[]): void {
        // Send device statuses message to all connected operators that can read this information
        // for (const status of deviceStatuses) {
        //     const connections = this.getConnectedClientsDataByDeviceId(status.deviceId);
        //     if (connections.length > 0) {
        //         for (const connection of connections) {
        //             const connectionId = connection[0];
        //             const msg = createDeviceSetStatusMessage();
        //             msg.body.state = status.state;
        //             msg.body.amounts = {
        //                 expectedEndAt: status.expectedEndAt,
        //                 remainingSeconds: status.remainingSeconds,
        //                 startedAt: status.startedAt,
        //                 totalSum: status.totalSum,
        //                 totalTime: status.totalTime,
        //             };
        //             try {
        //                 this.sendToDevice(msg, connectionId);
        //             } catch (err) {
        //                 this.logger.warn(`Can't send to device`, connectionId, msg, err);
        //             }
        //         }
        //     }
        // }
    }

    publishToOperatorsChannel<TBody>(message: Message<TBody>): void {
        message.header.source = this.messageBusIdentifier;
        this.logger.log('Publishing message', ChannelName.operators, message.header.type, message);
        this.pubClient.publish(ChannelName.operators, JSON.stringify(message));
    }

    getConnectedClientsDataByOperatorId(operatorId: string): [number, ConnectedClientData][] {
        const result: [number, ConnectedClientData][] = [];
        for (const item of this.connectedClients.entries()) {
            const data = item[1];
            if (data.operatorId === operatorId) {
                result.push(item);
            }
        }
        return result;
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

    getEnvVarValue(envVarName: string, defaultValue?: string): string | undefined {
        return process.env[envVarName] || defaultValue;
    }

    isOwnMessage<TBody>(message: Message<TBody>): boolean {
        return (message.header.source === this.messageBusIdentifier);
    }

    getNow(): number {
        return Date.now();
    }

    getLowercasedCertificateThumbprint(certificateFingerprint: string): string {
        if (!certificateFingerprint) {
            return '';
        }
        return certificateFingerprint.replaceAll(':', '').toLowerCase();
    }
}

interface ConnectedClientData {
    connectionId: number;
    connectedAt: number;
    /**
     * Operator ID in the system
     */
    operatorId: string | null;
    /**
     * The client certificate - most likely will be empty since operators usually do not provide certificates
     * but authenticate with user/password
     */
    certificate?: DetailedPeerCertificate | null;
    /**
     * certificate.fingeprint without the colon separator and lowercased
     */
    certificateThumbprint?: string;
    ipAddress: string | null;
    lastMessageReceivedAt: number | null;
    receivedMessagesCount: number;
    /**
     * Whether the client is authenticated to use the system
     * While the system checks the client, it will not send messages to the client or process messages from it
     */
    isAuthenticated: boolean;
}

interface ConnectionRoundTripData extends RoundTripData {
    connectionId: number;
}

const enum ConnectionCleanUpReason {
    authenticationTimeout = 'authentication-timeout',
}
