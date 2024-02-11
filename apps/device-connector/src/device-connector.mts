import EventEmitter from 'node:events';

import { RedisConnectSettings, RedisConnector, RedisConnectorEventName } from './redis-connector.mjs';
import { WssServerConnector } from './wss-server-connector.mjs';
import { ClientConnectedEventArgs, ConnectionClosedEventArgs, ConnectionErrorEventArgs, WssServerEventName, MessageReceivedEventArgs } from './wss-server.mjs';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';
import { MessageType } from '@computerclubsystem/types/messages/declarations/message-type.mjs';
import { Logger } from './logger.mjs';
import { DeviceAuthMessage } from '@computerclubsystem/types/messages/device-auth.message.mjs';
import { createDeviceAuthResultMessage } from '@computerclubsystem/types/messages/device-auth-result.message.mjs';
import { DeviceStatusAccessType, createDeviceSetStatusMessage } from '@computerclubsystem/types/messages/device-set-status.message.mjs';
import { CreateConnectedRedisClientOptions, RedisClientMessageCallback, RedisPubClient, RedisSubClient } from '@computerclubsystem/redis-client';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';

interface ConnectedClientData {
    connectionId: number;
    deviceId: string;
}

export class DeviceConnector {
    redisConnector!: RedisConnector;
    redisEmitter!: EventEmitter;
    wssServerConnector!: WssServerConnector;
    wssEmitter!: EventEmitter;
    desktopSwitchCounter = 0;
    connectedClients = new Map<number, ConnectedClientData>();

    private readonly subClient = new RedisSubClient();
    private readonly pubClient = new RedisPubClient();
    
    private logger = new Logger();

    async start(): Promise<void> {
        // TODO: Bring this back when Redis is available
        await this.joinMessageBus();
        // TODO: Subscribe to channels

        this.startWebSocketServer();

        this.startSendingDeviceSetStatusMessage();
    }

    private async joinMessageBus(): Promise<void> {
        // this.redisConnector = new RedisConnector();
        // const redisPortEnv = this.getEnvVarValue('CCS3_REDIS_PORT');
        // const redisConnectSettings: RedisConnectSettings = {
        //     host: this.getEnvVarValue('CCS3_REDIS_HOST') || 'localhost',
        //     port: redisPortEnv ? parseInt(redisPortEnv) : undefined,
        // };

        // await this.redisConnector.connect(redisConnectSettings);
        // this.redisEmitter = this.redisConnector.getEmitter();
        // this.redisEmitter.on(RedisConnectorEventName.messageReceived, args => {
        //     this.processRedisMessageReceived(args);
        // });
        const redisHost = this.getEnvVarValue('CCS3_REDIS_HOST');
        const redisPortEnvVarVal = this.getEnvVarValue('CCS3_REDIS_PORT');
        const redisPort = redisPortEnvVarVal ? parseInt(redisPortEnvVarVal) : 6379;
        console.log('Using redis host', redisHost, 'and port', redisPort);

        let receivedMessagesCount = 0;
        const subClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => console.error('SubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                console.error('SubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        const subClientMessageCallback: RedisClientMessageCallback = (sharedChannel, message) => {
            receivedMessagesCount++;
            console.log('subClient received message on channel', receivedMessagesCount, sharedChannel, message);
        };
        await this.subClient.connect(subClientOptions, subClientMessageCallback);
        console.log('SubClient connected to Redis');
        await this.subClient.subscribe(ChannelName.shared);
        await this.subClient.subscribe(ChannelName.devices);
        console.log('SubClient subscribed to the channels');
    }

    private startWebSocketServer(): void {
        this.wssServerConnector = new WssServerConnector();
        this.wssServerConnector.start();
        this.wssEmitter = this.wssServerConnector.getEmitter();
        this.wssEmitter.on(WssServerEventName.clientConnected, args => this.processDeviceConnected(args));
        this.wssEmitter.on(WssServerEventName.connectionClosed, args => this.processDeviceConnectionClosed(args));
        this.wssEmitter.on(WssServerEventName.connectionError, args => this.processDeviceConnectionError(args));
        this.wssEmitter.on(WssServerEventName.messageReceived, args => this.processDeviceMessageReceived(args));
    }

    private processDeviceConnected(args: ClientConnectedEventArgs): void {
        this.logger.log('Device connected', args);
        // TODO: Announce to message bus
        const data: ConnectedClientData = {
            connectionId: args.connectionId,
        } as ConnectedClientData;
        this.connectedClients.set(args.connectionId, data);
    }

    private processDeviceConnectionClosed(args: ConnectionClosedEventArgs): void {
        this.logger.log('Device connection closed', args);
    }

    private processDeviceConnectionError(args: ConnectionErrorEventArgs): void {
        this.logger.log('Device connection error', args);
    }

    private processDeviceMessageReceived(args: MessageReceivedEventArgs): void {
        const msg = this.deserializeToMessage(args.buffer);
        const type = msg?.header?.type;
        if (!type) {
            return;
        }

        switch (type) {
            case MessageType.deviceAuth:
                this.processDeviceAuthMessage(msg, args.connectionId);
                break;
        }
    }

    processDeviceAuthMessage(msg: DeviceAuthMessage, clientConnectionId: number): void {
        // TODO: Publish message to validate the device
        const deviceAuthResultMsg = createDeviceAuthResultMessage();
        deviceAuthResultMsg.body.authenticated = true;
        deviceAuthResultMsg.body.settings = {
            reportDiagnosticsInterval: 10000,
            newerVersionUrl: 'https://{server}/',
        };
        this.wssServerConnector.sendMessageTo(clientConnectionId, deviceAuthResultMsg);
    }

    processRedisMessageReceived(args: MessageReceivedEventArgs): void {
        this.logger.log('Redis message received', args);
    }

    deserializeToMessage(buffer: Buffer): Message<any> | null {
        try {
            const text = buffer.toString();
            const json = JSON.parse(text);
            return json as Message<any>;
        } catch (err) {
            return null;
        }
    }

    private startSendingDeviceSetStatusMessage(): void {
        setInterval(() => {
            const connectionIds = this.wssServerConnector.getConnectionIds();
            for (let i = 0; i < connectionIds.length; i++) {
                const msg = createDeviceSetStatusMessage();
                msg.body.accessType = Math.random() < 0.5 ? DeviceStatusAccessType.disabled : DeviceStatusAccessType.enabled;
                msg.body.amounts = {
                    durationSeconds: Math.ceil(Math.random() * 10000),
                    totalSum: Math.random() * 50,
                    remainingSeconds: Math.ceil(Math.random() * 3000),
                };
                this.wssServerConnector.sendMessageTo(connectionIds[i], msg);
            }
        }, 10000);
    }

    // startSendingDiagnosticsToAll(): void {
    //     setInterval(() => {
    //         const msg = {
    //             time: Date.now(),
    //             cpuUsage: process.cpuUsage(),
    //             memoryUsage: process.memoryUsage(),
    //         };
    //         this.wssServerConnector.sendMessageToAll(msg);
    //     }, 5000);
    // }

    // startSendingDesktopSwitchToAll(): void {
    //     setInterval(() => {
    //         this.desktopSwitchCounter++;

    //         const type = (this.desktopSwitchCounter % 2) ? 'switch-to-default-desktop' : 'switch-to-secured-desktop';
    //         const msg = {
    //             metadata: {
    //                 type: type,
    //             },
    //             body: {
    //                 time: Date.now(),
    //             }
    //         };
    //         this.wssServerConnector.sendMessageToAll(msg);
    //         setTimeout(() => {
    //             const type = 'switch-to-default-desktop';
    //             const msg = {
    //                 metadata: {
    //                     type: type,
    //                 },
    //                 body: {
    //                     time: Date.now(),
    //                 }
    //             };
    //             this.wssServerConnector.sendMessageToAll(msg);
    //         }, 1000);
    //     }, 10000);
    // }

    getEnvVarValue(envVarName: string, defaultValue?: string): string | undefined {
        return process.env[envVarName] || defaultValue;
    }
}