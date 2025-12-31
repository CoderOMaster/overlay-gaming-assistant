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
    alwaysOnTop: true, // Force always on top
    skipTaskbar: true,
    resizable: true,
    opacity: 0.95, // Slightly more visible
    vibrancy: 'dark',
    visualEffectState: 'active',
    hasShadow: false, // Remove shadow for cleaner overlay
    thickFrame: false, // Remove frame for transparency
    titleBarStyle: 'hidden' // Hide title bar for full transparency
  });

  // Make the overlay float above most apps (especially on macOS).
  // Note: Some games using exclusive fullscreen can still block overlays.
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setFullScreenable(false);

  mainWindow.loadFile('renderer/index.html');

  // Dragging is implemented via CSS (-webkit-app-region: drag)
  // to avoid custom IPC and platform quirks.

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
  // __dirname is src/frontend. The icon lives at repo-root/renderer/icon.png
  const iconPath = path.resolve(__dirname, '..', '..', 'renderer', 'icon.png');
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.error(`Failed to create tray. Could not load icon at: ${iconPath}`);
    console.error(e);
    return;
  }
  
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
  const { spawn, spawnSync } = require('child_process');
  const backendDir = path.resolve(__dirname, '..', 'backend');
  const scriptPath = path.join(backendDir, 'backend_server.py');

  // Try PYTHON_PATH env override first, then common Python commands
  const candidates = [
    ...(process.env.PYTHON_PATH ? [{ cmd: process.env.PYTHON_PATH, args: ['--version'] }] : []),
    { cmd: 'python', args: ['--version'] },
    { cmd: 'python3', args: ['--version'] },
    // Windows Python Launcher
    { cmd: 'py', args: ['-3', '--version'] },
  ];

  let selectedCmd = null;
  let selectedPrefixArgs = [];
  for (const c of candidates) {
    try {
      const res = spawnSync(c.cmd, c.args, { stdio: 'ignore' });
      if (res && res.status === 0) {
        selectedCmd = c.cmd;
        // For 'py -3', we need to preserve the '-3' when launching the script
        selectedPrefixArgs = c.cmd === 'py' ? ['-3'] : [];
        break;
      }
    } catch (e) {
      // ignore and try next
    }
  }

  if (!selectedCmd) {
    console.error('No suitable Python interpreter found on PATH. Please install Python 3 and ensure it is on your PATH.');
    return;
  }

  const spawnArgs = [...selectedPrefixArgs, scriptPath];

  pythonProcess = spawn(selectedCmd, spawnArgs, {
    cwd: backendDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
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

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python process:', err);
  });
}

// IPC Handlers
ipcMain.handle('process-query', async (event, query) => {
  try {
    const response = await axios.post('http://127.0.0.1:8080/query', { query });
    return response.data;
  } catch (error) {
    console.error('Query error:', error);
    return { error: 'Failed to process query' };
  }
});

ipcMain.handle('take-screenshot', async () => {
  try {
    // Temporarily hide overlay to get clean screenshot
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      // Wait a moment for window to hide
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const response = await axios.post('http://127.0.0.1:8080/screenshot');
    
    // Show overlay again after screenshot
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
    
    return response.data;
  } catch (error) {
    console.error('Screenshot error:', error);
    // Ensure overlay is visible even if screenshot fails
    if (mainWindow) {
      mainWindow.show();
    }
    return { error: 'Failed to take screenshot' };
  }
});

// Support both invoke and send from renderer
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    app.quit();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    app.quit();
  }
});

ipcMain.handle('update-settings', async (event, settings) => {
  Object.assign(config, settings);
  if (mainWindow) {
    mainWindow.setOpacity(config.overlayOpacity);
    if (config.alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      mainWindow.setAlwaysOnTop(false);
    }
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
});

app.on('activate', () => {
  app.whenReady().then(() => {
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
    app.whenReady().then(() => {
      if (!mainWindow) {
        createWindow();
        return;
      }
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });
  });
}
