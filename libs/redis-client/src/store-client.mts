import { RedisClient } from './declarations.mjs';
import { CreateConnectedRedisClientOptions, createConnectedRedisClient } from './client-utils.mjs';

export class RedisStoreClient {
    #client!: RedisClient;

    async connect(options: CreateConnectedRedisClientOptions): Promise<void> {
        this.#client = await createConnectedRedisClient(options);
    }

    async setValue(key: string, value: any): Promise<any> {
        return await this.#client.set(key, value);
    }

    async getValue(key: string): Promise<any> {
        return await this.#client.get(key);
    }

    async disconnect(): Promise<void> {
        return await this.#client.disconnect();
    }
}
