import * as fs from 'node:fs';
import EventEmitter from 'node:events';

import { ClientConnectedEventArgs, WssServerEventName, WssServer, WssServerConfig } from './wss-server.mjs';
import { Message } from '@computerclubsystem/types/messages/declarations/message.mjs';

export class WssServerConnector {
    private wsServer!: WssServer;
    private emitter!: EventEmitter;

    start(): void {
        this.wsServer = new WssServer();
        this.emitter = this.wsServer.getEmitter();
        const wssServerConfig: WssServerConfig = {
            cert: fs.readFileSync('./certificates/device-connector-cert.pem').toString(),
            key: fs.readFileSync('./certificates/device-connector-key.pem').toString(),
        };
        this.wsServer.start(wssServerConfig);
    }

    getEmitter(): EventEmitter {
        return this.emitter;
    }

    sendMessageToAll(message: Message<any>): void {
        const bytesSent = this.wsServer.sendJSONToAll(message);
        console.log('sendMessageToAll', bytesSent);
    }

    sendMessageTo(connectionId: number, message: Message<any>): void {
        this.wsServer.sendJSON(message, connectionId);
    }

    getConnectionIds(): number[] {
        return this.wsServer.getConnectionIds();
    }
}