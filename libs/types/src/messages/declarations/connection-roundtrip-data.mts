import { RoundTripData } from './round-trip-data.mjs';

export interface ConnectionRoundTripData extends RoundTripData {
    connectionId: number;
    certificateThumbprint: string;
    ipAddress: string;
}
