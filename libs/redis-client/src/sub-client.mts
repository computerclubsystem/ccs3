import { RedisClient, RedisClientMessageCallback } from './declarations.mjs';
import { CreateConnectedRedisClientOptions, createConnectedRedisClient } from './client-utils.mjs';

export class RedisSubClient {
    #client!: RedisClient;
    #messageCallback!: RedisClientMessageCallback;

    async connect(options: CreateConnectedRedisClientOptions, messageCallback: RedisClientMessageCallback): Promise<void> {
        this.#messageCallback = messageCallback;
        this.#client = await createConnectedRedisClient(options);
    }

    async subscribe(channelName: string): Promise<void> {
        return this.#client.subscribe(channelName, message => this.#messageCallback(channelName, message));
    }

    async unsubscribe(channelName: string): Promise<void> {
        return this.#client.unsubscribe(channelName);
    }

    async disconnect(): Promise<void> {
        await this.#client.disconnect();
    }
}
