import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from '@redis/client';

// export type RedisClient = ReturnType<typeof createClient>;
export type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
export type RedisClientMessageCallback = (channelName: string, data: string) => void;
export type RedisClientReconnectStrategyCallback = (retries: number, err: Error) => number;
export type RedisClientErrorCallback = (err: any) => void;
