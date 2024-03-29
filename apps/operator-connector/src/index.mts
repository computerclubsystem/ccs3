import { OperatorConnector } from './operator-connector.mjs';

const deviceConnector = new OperatorConnector();
await deviceConnector.start();
