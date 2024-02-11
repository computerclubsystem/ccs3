import EventEmitter from 'node:events';
import {
    RedisSubClient, RedisPubClient, CreateConnectedRedisClientOptions, RedisClientMessageCallback
} from '@computerclubsystem/redis-client';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';
import { Logger } from './logger.mjs';

export class RedisConnector {

    private messageBusIdentifier = 'ccs3/device-connector';
    private pubClient!: RedisPubClient;
    private connectSettings!: RedisConnectSettings;
    private emitter = new EventEmitter();
    private logger = new Logger();
    private subClient!: RedisSubClient;
    private subClientReceivedMessagesCount = 0;

    async connect(settings: RedisConnectSettings): Promise<void> {
        this.connectSettings = settings;
        const redisHost = settings.host;
        const redisPort = settings.port; 
        this.logger.log('Using redis host', redisHost, 'and port', redisPort);
        this.subClient = new RedisSubClient();
        const subClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => this.logger.error('SubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                this.logger.error('SubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        await this.subClient.connect(subClientOptions, (channelName, message: string) => {
            this.processSubClientMessage(channelName as ChannelName, message);
        });


        const pubClient = new RedisPubClient();
        const pubClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => this.logger.error('PubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                this.logger.error('PubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        await pubClient.connect(pubClientOptions);
    }

    async subscribe(channelName: ChannelName): Promise<void> {
        await this.subClient.subscribe(channelName);
    }

    getEmitter(): EventEmitter {
        return this.emitter;
    }

    private processSubClientMessage(channelName: ChannelName, message: string): void {
        this.subClientReceivedMessagesCount++;
        const deserializedMessage = this.deserializeMessage(message);
        const args: MessageReceivedEventArgs = {
            channelName: channelName,
            message: deserializedMessage,
        };
        this.emitter.emit(RedisConnectorEventName.messageReceived, args);
    };

    // processSharedChannelMessage<TBody>(message: Message<TBody>): void {
    //     switch (message.header.type) {
    //         case MessageType.ping:
    //             if (this.isMessageTargeted(message.header.target)) {
    //                 const pongMessage = createPongMessage();
    //                 pongMessage.header.source = this.messageBusIdentifier;
    //                 pongMessage.header.target = message.header.source;
    //                 pongMessage.header.correlationId = message.header.correlationId;
    //                 pongMessage.body = {
    //                     time: Date.now(),
    //                 };
    //                 this.publishMessage(ChannelName.shared, pongMessage);
    //             }
    //             break;
    //     }
    // };

    private serializeMessage<TBody>(message: Message<TBody>): string {
        return JSON.stringify(message);
    };

    private deserializeMessage<TBody>(message: string): Message<TBody> {
        return JSON.parse(message);
    }

    async publishMessage<TBody>(channelName: ChannelName, message: Message<TBody>): Promise<void> {
        try {
            await this.pubClient.publish(channelName, this.serializeMessage(message));
        } catch (err) {
            this.logger.error('Cannot send message to channel', channelName, message, err);
        }
    };

    private isMessageTargeted(messageTarget?: string): boolean {
        return !messageTarget || messageTarget === this.messageBusIdentifier;
    };
}

export interface RedisConnectSettings {
    host?: string;
    port?: number;
}

export interface MessageReceivedEventArgs {
    channelName: ChannelName;
    message: Message<any>;
}

export const enum RedisConnectorEventName {
    messageReceived = 'message-received',
}