const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  startDrag: () => ipcRenderer.send('start-drag'),
  
  // Query processing
  processQuery: (query) => ipcRenderer.invoke('process-query', query),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  
  // Settings
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Events
  onTakeScreenshot: (callback) => ipcRenderer.on('take-screenshot', callback),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
