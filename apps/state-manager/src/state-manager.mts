import {
    RedisSubClient, RedisPubClient, RedisStoreClient, CreateConnectedRedisClientOptions,
    RedisClientMessageCallback
} from '@computerclubsystem/redis-client';
import { ChannelName } from '@computerclubsystem/types/channels/channel-name.mjs';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';
import { Logger } from './logger.mjs';
import { BusDeviceGetByCertificateRequestMessage } from '@computerclubsystem/types/messages/bus/bus-device-get-by-certificate-request.message.mjs';
import { createBusDeviceGetByCertificateReplyMessage } from '@computerclubsystem/types/messages/bus/bus-device-get-by-certificate-reply.message.mjs';
import { MessageType } from '@computerclubsystem/types/messages/declarations/message-type.mjs';
import { Device } from '@computerclubsystem/types/entities/device.mjs';
import { DeviceStatus, createBusDeviceStatusesMessage } from '@computerclubsystem/types/messages/bus/bus-device-statuses.message.mjs';
import { DeviceState } from '@computerclubsystem/types/entities/device-state.mjs';
import { envVars } from './env-vars.mjs';
import { StorageProviderConfig } from './storage/storage-provider-config.mjs';
import { StorageProvider } from './storage/storage-provider.mjs';
import { PostgreStorageProvider } from './postgre-storage/postgre-storage-provider.mjs';
import { BusDeviceUnknownDeviceConnectedRequestMessage } from '@computerclubsystem/types/messages/bus/bus-device-unknown-device-connected-request.message.mjs';
import { IDevice } from './storage/entities/device.mjs';
import { ConnectionRoundTripData } from '@computerclubsystem/types/messages/declarations/connection-roundtrip-data.mjs';

export class StateManager {
    private readonly className = (this as any).constructor.name;
    private readonly messageBusIdentifier = 'ccs3/state-manager';
    private readonly subClient = new RedisSubClient();
    private readonly pubClient = new RedisPubClient();
    private readonly logger = new Logger();
    private allDevices: Device[] = [];
    private storageProvider!: StorageProvider;

    getEnvVarValue(envVarName: string, defaultValue?: string): string | undefined {
        return process.env[envVarName] || defaultValue;
    };

    async start(): Promise<boolean> {
        this.logger.setPrefix(this.className);
        const databaseInitialized = await this.initializeDatabase();
        if (!databaseInitialized) {
            this.logger.error('The database cannot be initialized');
            return false;
        }
        // TODO: For testing only
        // await this.addDummyDevices();
        // this.allDevices = await this.storeConnector.getAllDevices();

        const redisHost = this.getEnvVarValue('CCS3_REDIS_HOST');
        const redisPortEnvVarVal = this.getEnvVarValue('CCS3_REDIS_PORT');
        const redisPort = redisPortEnvVarVal ? parseInt(redisPortEnvVarVal) : 6379;
        this.logger.log('Using Redis host', redisHost, 'and port', redisPort);

        let receivedMessagesCount = 0;
        const subClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => this.logger.error('SubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                this.logger.error('SubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        const subClientMessageCallback: RedisClientMessageCallback = (channelName, message) => {
            receivedMessagesCount++;
            try {
                const messageJson = this.deserializeToMessage(message);
                if (messageJson) {
                    this.processReceivedBusMessage(channelName, messageJson);
                } else {
                    this.logger.warn('The message', message, 'deserialized to null');
                }
            } catch (err) {
                this.logger.warn('Cannot deserialize channel', channelName, 'message', message);
            }
        };
        await this.subClient.connect(subClientOptions, subClientMessageCallback);
        this.logger.log('SubClient connected');
        await this.subClient.subscribe(ChannelName.shared);
        await this.subClient.subscribe(ChannelName.devices);


        const pubClientOptions: CreateConnectedRedisClientOptions = {
            host: redisHost,
            port: redisPort,
            errorCallback: err => this.logger.error('PubClient error', err),
            reconnectStrategyCallback: (retries: number, err: Error) => {
                this.logger.error('PubClient reconnect strategy error', retries, err);
                return 5000;
            },
        };
        this.logger.log('PubClient connecting');
        await this.pubClient.connect(pubClientOptions);
        this.logger.log('PubClient connected');

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

        // // TODO: For testing only
        // this.startSendingDeviceSetStatusMessage();

        return true;
    }

    processReceivedBusMessage(channelName: string, message: Message<any>): void {
        if (this.isOwnMessage(message)) {
            return;
        }
        this.logger.log('Received channel', channelName, 'message', message.header.type, message);
        const type = message.header?.type;
        if (!type) {
            return;
        }

        switch (channelName) {
            case ChannelName.devices:
                this.processDevicesMessage(message);
                break;
            case ChannelName.shared:
                break;
        }
    }

    processDevicesMessage<TBody>(message: Message<TBody>): void {
        const type = message.header?.type;
        switch (type) {
            case MessageType.busDeviceGetByCertificateRequest:
                this.processDeviceGetByCertificateRequest(message as BusDeviceGetByCertificateRequestMessage);
                break;
            case MessageType.busDeviceUnknownDeviceConnectedRequest:
                this.processBusDeviceUnknownDeviceConnectedMessageRequest(message as BusDeviceUnknownDeviceConnectedRequestMessage);
                break;
        }
    }

    async processDeviceGetByCertificateRequest(message: BusDeviceGetByCertificateRequestMessage): Promise<void> {
        try {
            const device = await this.storageProvider.getDeviceByCertificateThumbprint(message.body.certificateThumbprint);
            const msg = createBusDeviceGetByCertificateReplyMessage();
            msg.header.correlationId = message.header.correlationId;
            msg.header.roundTripData = message.header.roundTripData;
            msg.body.device = device;
            this.publishMessage(ChannelName.devices, msg);
        } catch (err) {
            this.logger.warn(`Can't process BusDeviceGetByCertificateRequestMessage message`, message, err);
        }
    }

    async processBusDeviceUnknownDeviceConnectedMessageRequest(message: BusDeviceUnknownDeviceConnectedRequestMessage): Promise<void> {
        try {
            // const connectionRoundtripData = message.header.roundTripData as ConnectionRoundTripData;
            const device: IDevice = {
                approved: false,
                certificate_thumbprint: message.body.certificateThumbprint,
                ip_address: message.body.ipAddress,
                created_at: this.getNowAsIsoString(),
                enabled: false,
            } as IDevice;
            const createdDevice = await this.storageProvider.createDevice(device);
            this.logger.log('New device created. Device Id', createdDevice.id);
            // const msg = createBusDeviceGetByCertificateReplyMessage();
            // msg.header.correlationId = message.header.correlationId;
            // msg.header.roundTripData = message.header.roundTripData;
            // msg.body.device = device;
            // this.publishMessage(ChannelName.devices, msg);
        } catch (err) {
            this.logger.warn(`Can't process BusDeviceUnknownDeviceConnectedRequestMessage message`, message, err);
        }
    }

    serializeMessage<TBody>(message: Message<TBody>): string {
        return JSON.stringify(message);
    }

    deserializeToMessage(text: string): Message<any> | null {
        const json = JSON.parse(text);
        return json as Message<any>;
    }

    isOwnMessage<TBody>(message: Message<TBody>): boolean {
        return (message.header?.source === this.messageBusIdentifier);
    }

    async publishMessage<TBody>(channelName: ChannelName, message: Message<TBody>): Promise<number> {
        try {
            this.logger.log('Publishing message', channelName, message.header.type, message);
            message.header.source = this.messageBusIdentifier;
            return await this.pubClient.publish(channelName, this.serializeMessage(message));
        } catch (err) {
            this.logger.error('Cannot sent message to channel', channelName, message, err);
            return -1;
        }
    };

    private async initializeDatabase(): Promise<boolean> {
        const storageProviderConnectionString = this.getEnvVarValue(envVars.CCS3_STATE_MANAGER_STORAGE_CONNECTION_STRING);
        this.storageProvider = this.getStorageProvider();
        const storageProviderConfig: StorageProviderConfig = {
            adminConnectionString: this.getEnvVarValue(envVars.CCS3_STATE_MANAGER_STORAGE_ADMIN_CONNECTION_STRING),
            connectionString: storageProviderConnectionString!,
            databaseMigrationsPath: this.getEnvVarValue(envVars.CCS3_STATE_MANAGER_STORAGE_PROVIDER_DATABASE_MIGRATION_SCRIPTS_DIRECTORY),
        };
        // TODO: Try multiple times in case the database service is not yet running
        const initRes = await this.storageProvider.init(storageProviderConfig);
        return initRes.success;
    }

    private getStorageProvider(): StorageProvider {
        return new PostgreStorageProvider();
    }

    private getNowAsNumber(): number {
        return Date.now();
    }

    private getNowAsIsoString(): string {
        return new Date().toISOString();
    }

    // // TODO: For testing only
    // private async addDummyDevices(): Promise<void> {
    //     await this.storeConnector.addDevice({
    //         deactivated: false,
    //         certificateThumbprint: '15a74d3f019108a339ffce6b5c9b6396619878dc',
    //         createdAt: new Date().toISOString(),
    //         id: '',
    //         name: 'comp-1',
    //     });
    //     await this.storeConnector.addDevice({
    //         deactivated: false,
    //         certificateThumbprint: '08:07:47:CB:CE:E6:D3:A4:79:21:31:5D:BF:7F:5A:C8:0D:77:4B:C5',
    //         createdAt: new Date().toISOString(),
    //         id: '',
    //         name: 'comp-2',
    //     });
    //     await this.storeConnector.addDevice({
    //         deactivated: false,
    //         certificateThumbprint: '22:06:A8:88:04:73:3F:69:51:04:42:A4:1F:65:91:A3:B2:4D:A0:28',
    //         createdAt: new Date().toISOString(),
    //         id: '',
    //         name: 'comp-3',
    //     });
    // }

    // // TODO: For testing only
    // private startSendingDeviceSetStatusMessage(): void {
    //     setInterval(() => {
    //         const msg = createBusDeviceStatusesMessage();
    //         msg.header.source = this.messageBusIdentifier;
    //         msg.body.deviceStatuses = [];
    //         const activeDevices = this.allDevices.filter(x => !x.deactivated);
    //         for (const device of activeDevices) {
    //             const deviceStatus: DeviceStatus = {
    //                 expectedEndAt: Math.round(Math.random() * 99999999),
    //                 startedAt: Math.round(Math.random() * 99999999),
    //                 state: Math.random() < 0.5 ? DeviceState.disabled : DeviceState.enabled,
    //                 totalSum: Math.random() * 99,
    //                 totalTime: Math.random() * 99999,
    //                 deviceId: device.id,
    //                 remainingSeconds: Math.round(Math.random() * 9999),
    //             };
    //             msg.body.deviceStatuses.push(deviceStatus);
    //         }
    //         this.publishMessage(ChannelName.devices, msg);
    //     }, 5000);
    // }
}
