export interface Device {
    id: string;
    name: string;
    certificateThumbprint: string;
    deactivated: boolean;
    allowedIpAddress?: string;
    createdAt: string;
}
