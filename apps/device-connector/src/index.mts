import {
    RedisSubClient, RedisPubClient, CreateConnectedRedisClientOptions,
    RedisClientMessageCallback
} from '@computerclubsystem/redis-client';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';
import { MessageType } from '@computerclubsystem/types/messages/declarations/message-type.mjs';
import { createPongMessage } from '@computerclubsystem/types/messages/pong.mjs';
import { WssServer } from './wss-server.mjs';

const wsServer = new WssServer();
wsServer.start();

const messageBusIdentifier = 'ccs3/device-connector';
const sharedChannel = ChannelName.shared;

const getEnvVarValue = (envVarName: string, defaultValue?: string): string | undefined => {
    return process.env[envVarName] || defaultValue;
};

const redisHost = getEnvVarValue('CCS3_REDIS_HOST');
const redisPortEnvVarVal = getEnvVarValue('CCS3_REDIS_PORT');
const redisPort = redisPortEnvVarVal ? parseInt(redisPortEnvVarVal) : 6379;
console.log('Using redis host', redisHost, 'and port', redisPort);

let receivedMessagesCount = 0;
const subClient = new RedisSubClient();
const subClientOptions: CreateConnectedRedisClientOptions = {
    host: redisHost,
    port: redisPort,
    errorCallback: err => console.error('SubClient error', err),
    reconnectStrategyCallback: (retries: number, err: Error) => {
        console.error('SubClient reconnect strategy error', retries, err);
        return 5000;
    },
};
const subClientMessageCallback: RedisClientMessageCallback = (channelName, message: string) => {
    receivedMessagesCount++;
    const deserializedMessage = deserializeMessage(message);
    console.log('subClient received message on channel', receivedMessagesCount, channelName, message);
    processMessage(channelName as ChannelName, deserializedMessage);
};
await subClient.connect(subClientOptions, subClientMessageCallback);
await subClient.subscribe(sharedChannel);


const pubClient = new RedisPubClient();
const pubClientOptions: CreateConnectedRedisClientOptions = {
    host: redisHost,
    port: redisPort,
    errorCallback: err => console.error('PubClient error', err),
    reconnectStrategyCallback: (retries: number, err: Error) => {
        console.error('PubClient reconnect strategy error', retries, err);
        return 5000;
    },
};
await pubClient.connect(pubClientOptions);

const processMessage = (channelName: ChannelName, message: Message): void => {
    switch (channelName) {
        case ChannelName.shared:
            processSharedChannelMessage(message);
            break;
    }
};

const processSharedChannelMessage = (message: Message): void => {
    switch (message.header.type) {
        case MessageType.ping:
            if (isMessageTargeted(message.header.target)) {
                const pongMessage = createPongMessage();
                pongMessage.header.source = messageBusIdentifier;
                pongMessage.header.target = message.header.source;
                pongMessage.header.correlationId = message.header.correlationId;
                pongMessage.body = {
                    time: Date.now(),
                };
                publishMessage(ChannelName.shared, pongMessage);
            }
            break;
    }
};

const serializeMessage = (message: Message): string => JSON.stringify(message);
const deserializeMessage = (message: string): Message => JSON.parse(message);

const publishMessage = async (channelName: ChannelName, message: Message): Promise<void> => {
    try {
        await pubClient.publish(channelName, serializeMessage(message));
    } catch (err) {
        console.error('Cannot sent message to channel', channelName, message, err);
    }
};

const isMessageTargeted = (messageTarget?: string): boolean => !messageTarget || messageTarget === messageBusIdentifier;

class DeviceConnector {

}

