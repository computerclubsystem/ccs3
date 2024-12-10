export interface Device {
    id: string;
    name: string;
    certificateThumbprint: string;
    active: boolean;
    allowedIpAddress?: string;
    createdAt: string;
}
