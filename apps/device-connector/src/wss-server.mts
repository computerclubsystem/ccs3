import EventEmitter from 'node:events';
import * as https from 'node:https';
import { TextEncoder } from 'node:util';
import { RawData, WebSocket, WebSocketServer } from 'ws';

export class WssServer {
    private wsServer!: WebSocketServer;
    private clientsByInstance = new Map<WebSocket, number>();
    private clientsByConnectionId = new Map<number, WebSocket>();
    private clientConnectionsTotal = 0;
    private connectionId = 0;
    private httpsServer!: https.Server;
    private config!: WssServerConfig
    private emitter = new EventEmitter();

    start(config: WssServerConfig): void {
        this.config = config;
        this.httpsServer = https.createServer({
            cert: config.cert,
            key: config.key,
        });
        this.wsServer = new WebSocketServer({
            server: this.httpsServer,
            // host: '0.0.0.0',
            // port: 8443,
            // 5 MB
            maxPayload: 5 * 1024 * 1024,
            backlog: 50,
            // If set to true, keeps clients in .clients
            clientTracking: false,
        });

        this.wsServer.on('connection', webSocket => this.clientConnected(webSocket));

        this.httpsServer.listen(8443, '0.0.0.0', 50);
    }

    getConnectionIds(): number[] {
        const ids: number[] = [];
        this.clientsByConnectionId.forEach((webSocket, key) => ids.push(key));
        return ids;
    }

    sendJSON(message: Record<string | number, any>, connectionId: number): number {
        const client = this.clientsByConnectionId.get(connectionId);
        if (!client) {
            return 0;
        }

        const array = this.toBinary(message);
        client.send(array, err => {
            if (err) {
                console.error('sendJSON error', connectionId, err);
            }
        });
        return array.length;
    }

    sendJSONToAll(message: Record<string | number, any>): number {
        let bytesSent = 0;
        this.clientsByConnectionId.forEach((webSocket, id) => {
            bytesSent += this.sendJSON(message, id);
        });
        return bytesSent;
    }

    getEmitter(): EventEmitter {
        return this.emitter;
    }

    private toBinary(obj: any): Uint8Array {
        const string = JSON.stringify(obj);
        const te = new TextEncoder();
        const array = te.encode(string);
        return array;
    }

    private clientConnected(webSocket: WebSocket): void {
        this.clientConnectionsTotal++;
        const socketConnectionId = this.createNewConnectionId();
        this.addNewClient(webSocket, socketConnectionId);
        const clientConnectedEventArgs: ClientConnectedEventArgs = {
            connectionId: socketConnectionId,
        };
        this.emitter.emit(WssServerEventName.clientConnected, clientConnectedEventArgs);
        webSocket.on('message', (data: RawData, isBinary: boolean) => {
            if (data instanceof Buffer) {
                const args: MessageReceivedEventArgs = {
                    connectionId: socketConnectionId,
                    buffer: data,
                };
                this.emitter.emit(WssServerEventName.messageReceived, args);
            }
        });

        webSocket.on('ping', (data: Buffer) => {
            console.log('ping', data.toString());
        });

        webSocket.on('error', err => {
            this.removeClient(webSocket);
            const connectionErrorEventArgs: ConnectionErrorEventArgs = {
                connectionId: socketConnectionId,
                err
            };
            this.emitter.emit(WssServerEventName.connectionError, connectionErrorEventArgs);
        });

        webSocket.on('close', (code: number, reason: Buffer) => {
            this.removeClient(webSocket);
            this.emitter.emit(WssServerEventName.connectionClosed, socketConnectionId);
        });
    }

    private createNewConnectionId(): number {
        this.connectionId++;
        return this.connectionId;
    }

    private addNewClient(webSocket: WebSocket, id: number): void {
        this.clientsByInstance.set(webSocket, id);
        this.clientsByConnectionId.set(id, webSocket);
    }

    private removeClient(webSocket: WebSocket): void {
        const id = this.clientsByInstance.get(webSocket);
        if (!id) {
            return;
        }
        this.clientsByInstance.delete(webSocket);
        this.clientsByConnectionId.delete(id);
    }
}

export interface WssServerConfig {
    cert: string;
    key: string;
}

export interface ConnectionEventArgs {
    connectionId: number;
}

export interface ClientConnectedEventArgs extends ConnectionEventArgs {
}

export interface MessageReceivedEventArgs extends ConnectionEventArgs {
    buffer: Buffer;
}

export interface ConnectionClosedEventArgs extends ConnectionEventArgs {
}

export interface ConnectionErrorEventArgs extends ConnectionEventArgs {
    err: Error;
}

export const enum WssServerEventName {
    clientConnected = 'client-connected',
    messageReceived = 'message-received',
    connectionClosed = 'connection-closed',
    connectionError = 'connection-error',
}