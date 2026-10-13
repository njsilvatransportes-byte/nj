const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');

let mainWindow = null;
let serverProcess = null;

// Encontra uma porta livre para iniciar o servidor interno
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function startInternalServer(port) {
  process.env.PORT = String(port);
  process.env.NODE_ENV = 'production';
  // Carrega e inicia o server.js
  require('./server.js');
}

function waitForServer(port, timeout = 30000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Tempo limite excedido ao inicializar o banco de dados / servidor interno.'));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  Menu.setApplicationMenu(null); // Oculta barra de menus padrão para visual limpo de app

  mainWindow.maximize();
  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  mainWindow.show();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Garante apenas 1 instância do aplicativo aberta por vez
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

  app.whenReady().then(async () => {
    try {
      const port = await getFreePort();
      await startInternalServer(port);
      await waitForServer(port);
      await createWindow(port);
    } catch (err) {
      console.error(err);
      dialog.showErrorBox(
        'Erro ao iniciar o NJTransportes',
        'Não foi possível conectar ao banco de dados Supabase ou iniciar o aplicativo.\n\nDetalhes: ' + (err.message || err)
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
