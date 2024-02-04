import { RedisClient } from './declarations.mjs';
import { CreateConnectedRedisClientOptions, createConnectedRedisClient } from './client-utils.mjs';

export class RedisPubClient {
    #client!: RedisClient;

    async connect(options: CreateConnectedRedisClientOptions): Promise<void> {
        this.#client = await createConnectedRedisClient(options);
    }

    async publish(channelName: string, message: any): Promise<number> {
        return this.#client.publish(channelName, message);
    }

    async disconnect(): Promise<void> {
        return await this.#client.disconnect();
    }
}
