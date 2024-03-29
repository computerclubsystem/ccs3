import { Device } from '@computerclubsystem/types/entities/device.mjs';
import { IdGenerator } from './id-generator.mjs';

export class StoreConnector {
    private devices: Device[] = [];
    private idGen = new IdGenerator();
    private config!: StoreConnectorConfig;

    async getAllDevices(): Promise<Device[]> {
        const devices = [...this.devices];
        return devices;
    }

    async getDeviceByCertificateThumbprint(certificateThumbprint: string): Promise<Device | undefined> {
        const device = this.devices.find(x => x.certificateThumbprint === certificateThumbprint);
        return device;
    }

    async getDeviceById(deviceId: string): Promise<Device | undefined> {
        const device = this.devices.find(x => x.id === deviceId);
        return device;
    }

    async addDevice(device: Device): Promise<Device> {
        device.id = this.idGen.generate();
        this.devices.push(device);
        return device;
    }

    init(config: StoreConnectorConfig): void {
        this.config = config;
    }
}

export interface StoreConnectorConfig {
    connectionString: string;
}
