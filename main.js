const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;
let tray;
let isDev = process.argv.includes('--dev');
let pythonProcess;
let screenshotInterval;

// Configuration
const config = {
  screenshotInterval: 30000, // 30 seconds
  overlayOpacity: 0.9,
  alwaysOnTop: true,
  openaiApiKey: process.env.OPENAI_API_KEY
};

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    x: width - 450,
    y: 50,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    transparent: true,
    frame: false,
    alwaysOnTop: config.alwaysOnTop,
    skipTaskbar: true,
    resizable: true,
    opacity: config.overlayOpacity,
    vibrancy: 'dark',
    visualEffectState: 'active'
  });

  mainWindow.loadFile('renderer/index.html');

  // Make window draggable
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.drag-handle')) {
          window.electronAPI.startDrag();
        }
      });
    `);
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide instead of close when clicking the X
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'renderer/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Take Screenshot',
      click: () => {
        mainWindow.webContents.send('take-screenshot');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.webContents.send('open-settings');
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Game Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setupGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+G', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow.webContents.send('take-screenshot');
  });
}

function startPythonBackend() {
  const { spawn } = require('child_process');
  
  pythonProcess = spawn('python3', ['backend_server.py'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// IPC Handlers
ipcMain.handle('process-query', async (event, query) => {
  try {
    const response = await axios.post('http://localhost:8080/query', { query });
    return response.data;
  } catch (error) {
    console.error('Query error:', error);
    return { error: 'Failed to process query' };
  }
});

ipcMain.handle('take-screenshot', async () => {
  try {
    const response = await axios.post('http://localhost:8080/screenshot');
    return response.data;
  } catch (error) {
    console.error('Screenshot error:', error);
    return { error: 'Failed to take screenshot' };
  }
});

ipcMain.handle('update-settings', async (event, settings) => {
  Object.assign(config, settings);
  if (mainWindow) {
    mainWindow.setOpacity(config.overlayOpacity);
    mainWindow.setAlwaysOnTop(config.alwaysOnTop);
  }
  return { success: true };
});

ipcMain.handle('get-settings', () => {
  return config;
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupGlobalShortcuts();
  startPythonBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
