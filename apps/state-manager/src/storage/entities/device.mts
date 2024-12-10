export interface IDevice {
    id: number;
    certificate_thumbprint: string;
    ip_address: string;
    name?: string;
    description?: string;
    created_at: string;
    approved: boolean;
    enabled: boolean;
    device_group_id?: number;
}
