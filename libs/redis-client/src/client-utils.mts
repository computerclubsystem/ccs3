import { createClient, RedisClientOptions, RedisFunctions, RedisModules, RedisScripts } from '@redis/client';

import { RedisClient, RedisClientReconnectStrategyCallback, RedisClientErrorCallback } from './declarations.mjs';

export interface CreateConnectedRedisClientOptions {
    host?: string;
    port?: number;
    errorCallback?: RedisClientErrorCallback;
    reconnectStrategyCallback?: RedisClientReconnectStrategyCallback;
};

export const createConnectedRedisClient = async (options: CreateConnectedRedisClientOptions): Promise<RedisClient> => {
    const createClientOptions: RedisClientOptions<RedisModules, RedisFunctions, RedisScripts> = {
        legacyMode: false,
        disableOfflineQueue: true,
        pingInterval: 10000,
        socket: {
            host: options.host,
            port: options.port,
            reconnectStrategy: (retries: number, err: Error) => {
                const reconnectStrategyCallback = options?.reconnectStrategyCallback;
                if (reconnectStrategyCallback) {
                    return reconnectStrategyCallback(retries, err);
                }
                console.error('Reconnect strategy error', retries, err);
                return err;
            },
        }
    };
    console.log('Using redis client options', createClientOptions);
    const client = createClient(createClientOptions);
    const errorCallback = options?.errorCallback;
    if (errorCallback) {
        client.on('error', (err: any) => errorCallback(err));
    }
    // client.on('connect', () => console.log('connected'));
    // client.on('ready', () => console.log('ready'));
    // client.on('end', () => console.log('end'));
    // client.on('reconnecting', () => console.log('reconnecting'));
    await client.connect();
    return client;
};
