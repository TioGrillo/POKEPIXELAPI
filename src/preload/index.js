"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => electron_1.ipcRenderer.send(channel, ...args),
    on: (channel, callback) => {
        const handler = (_event, ...args) => callback(...args);
        electron_1.ipcRenderer.on(channel, handler);
        return () => electron_1.ipcRenderer.removeListener(channel, handler);
    },
    once: (channel, callback) => {
        electron_1.ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    },
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", api);
