import * as https from 'node:https';
import * as fs from 'node:fs';
import { RawData, WebSocket, WebSocketServer } from 'ws';

export class WssServer {
    private wsServer!: WebSocketServer;
    private clientsByInstance = new Map<WebSocket, number>();
    private clientsById = new Map<number, WebSocket>();
    private clientConnectionsTotal = 0;
    private clientId = 0;
    private httpsServer!: https.Server;

    start(): void {
        this.httpsServer = https.createServer({
            cert: fs.readFileSync('./certificates/device-connector-cert.pem'),
            key: fs.readFileSync('./certificates/device-connector-key.pem'),
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

    private clientConnected(webSocket: WebSocket): void {
        this.clientConnectionsTotal++;
        const newId = this.createNewId();
        this.addNewClient(webSocket, newId);

        webSocket.on('message', (data: RawData, isBinary: boolean) => {
            if (data instanceof Buffer) {
                if (data.byteLength < 1000) {
                    const msg = data.toString();
                    console.log(isBinary, msg, data);
                } else {
                    console.log('Received bytes', data.byteLength);
                }
            }
        });

        webSocket.on('ping', (data: Buffer) => {
            console.log('ping', data.toString());
        });

        webSocket.on('error', err => {
            this.removeClient(webSocket);
        });

        webSocket.on('close', (code: number, reason: Buffer) => {
            this.removeClient(webSocket);
        });
    }

    private createNewId(): number {
        this.clientId++;
        return this.clientId;
    }

    private addNewClient(webSocket: WebSocket, id: number): void {
        this.clientsByInstance.set(webSocket, id);
        this.clientsById.set(id, webSocket);
    }

    private removeClient(webSocket: WebSocket): void {
        const id = this.clientsByInstance.get(webSocket);
        if (!id) {
            return;
        }
        this.clientsByInstance.delete(webSocket);
        this.clientsById.delete(id);
    }
}
