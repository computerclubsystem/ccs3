import { StateManager } from './state-manager.mjs';

const statusManager = new StateManager();
await statusManager.start();