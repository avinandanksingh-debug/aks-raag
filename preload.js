const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    onLoginComplete: (callback) => ipcRenderer.on('login-complete', (_event, value) => callback(value))
});
