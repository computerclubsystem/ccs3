import { IDevice } from './entities/device.mjs';
import { IUser } from './entities/user.mjs';
import { StorageProviderConfig } from './storage-provider-config.mjs';
import { StorageProviderInitResult } from './storage-provider-init-result.mjs';

export interface StorageProvider {
    init(config: StorageProviderConfig): Promise<StorageProviderInitResult>;
    getDeviceByCertificateThumbprint(certificateThumbprint: string): Promise<IDevice | undefined>;
    createDevice(device: IDevice): Promise<IDevice>;
    getUser(username: string, passwordHash: string): Promise<IUser | undefined>;
}
