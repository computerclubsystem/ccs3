import {
    RedisSubClient, RedisPubClient, RedisStoreClient, CreateConnectedRedisClientOptions,
    RedisClientMessageCallback
} from '@computerclubsystem/redis-client';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';

export class StatusManager {
    private readonly messageBusIdentifier = 'ccs3/status-manager';
    private readonly sharedChannel = ChannelName.shared;
    private readonly subClient = new RedisSubClient();
    private readonly pubClient = new RedisPubClient();

    async start(): Promise<void> {

        const getEnvVarValue = (envVarName: string, defaultValue?: string): string | undefined => {
            return process.env[envVarName] || defaultValue;
        };

        const redisHost = getEnvVarValue('CCS3_REDIS_HOST');
        const redisPortEnvVarVal = getEnvVarValue('CCS3_REDIS_PORT');
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
        await this.subClient.subscribe(this.sharedChannel);


        const pubClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => console.error('PubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                console.error('PubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        await this.pubClient.connect(pubClientOptions);
        console.log('PubClient connected to Redis');
      
        // setInterval(async () => {
        //     try {
        //         const publishResult = await pubClient.publish(sharedChannel, 'published message on the channel');
        //         console.log(publishResult);
        //     } catch (err) {
        //         console.error('PubClient error on publishing message', err);
        //     }
        // }, 1000);

        // setInterval(async () => {
        //     const pingMessage = createPingMessage();
        //     pingMessage.body = {
        //         time: Date.now(),
        //     };
        //     const publishResult = await this.publishMessage(this.sharedChannel, pingMessage);
        //     console.log('Publish result', publishResult);
        //     if (publishResult < 0) {
        //         console.log('Cannot publish message', publishResult);
        //     }
        // }, 1000);


        // const storeClient = new RedisStoreClient();
        // const keyClientOptions: CreateConnectedRedisClientOptions = {
        //     errorCallback: err => console.error('StoreClient error', err),
        //     reconnectStrategyCallback: (retries: number, err: Error) => {
        //         console.error('StoreClient reconnect strategy error', retries, err);
        //         return 5000;
        //     },
        // };
        // await storeClient.connect(keyClientOptions);
        // setInterval(async () => {
        //     try {
        //         console.log('StoreClient writing key/value pair');
        //         await storeClient.setValue('time', Date.now());
        //         const value = await storeClient.getValue('time');
        //         console.log('StoreClient read value', value);
        //     } catch (err) {
        //         console.log('Error while trying to write and read key/value pair', err);
        //     }
        // }, 1000);
    }

    serializeMessage<TBody>(message: Message<TBody>): string {
        return JSON.stringify(message);
    }

    async publishMessage<TBody>(channelName: ChannelName, message: Message<TBody>): Promise<number> {
        try {
            console.log('Publishing message', channelName, message.header.type);
            message.header.source = this.messageBusIdentifier;
            return await this.pubClient.publish(channelName, this.serializeMessage(message));
        } catch (err) {
            console.error('Cannot sent message to channel', channelName, message, err);
            return -1;
        }
    };
}
