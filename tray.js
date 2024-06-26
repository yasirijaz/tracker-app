const { app, BrowserWindow, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
let trayWindowVisible = false;

function createTray(mainWindowInstance) {
  mainWindow = mainWindowInstance;
  let tray;
  let trayWindow = null;

  const iconPath = path.join(__dirname, 'assets/logo-icon.png');
  const image = nativeImage.createFromPath(iconPath);
  image.setTemplateImage(true);

  tray = new Tray(image);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Tray Window',
      type: 'normal',
      click: () => {
        if (!trayWindow) {
          createTrayWindow();
        } else {
          trayWindow.show();
        }
      }
    },
    {
      label: 'Open Main Window',
      type: 'normal',
      click: () => {
        openMainWindow();
      }
    },
    {
      label: 'Quit',
      type: 'normal',
      click: () => app.quit()
    }
  ]);
  tray.setToolTip('WindShieldHub TimeTracker');
  tray.setContextMenu(contextMenu);

  function openMainWindow() {
    if (mainWindow) {
      mainWindow.show();
    } else {
      console.error('Main window instance is not available.');
    }
  }
  
  // Create tray window when the app starts
  createTrayWindow();
  
  async function createTrayWindow() {
    const { width, height } = screen.getPrimaryDisplay().workArea;
    const winWidth = 200;
    const winHeight = 300;

    const bounds = tray.getBounds();
    trayWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      show: false,
      frame: false,
      fullscreen: false,
      resizable: false,
      useContentSize: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
    });

    const x = width - winWidth;
    const y = height - winHeight + 5;

    const isDev = process.env.APP_DEV;

    const startURL = isDev
      ? 'http://localhost:3000/#/tray'
      : `https://tracking.windshieldhub.com/#/tray`;

    // trayWindow.setPosition(bounds.x - 100, bounds.y + bounds.height);
    trayWindow.setBounds({ x: x, y: y })
    trayWindow.setAlwaysOnTop(true);
    trayWindow.loadURL(startURL);

    trayWindow.on('closed', () => {
      trayWindow = null;
    });

    trayWindow.on('close', (event) => {
        // Prevent window from closing, just hide it
        event.preventDefault();
        trayWindow.hide();
    });

  }

  // Listen for mainWindow minimize event
  mainWindow.on('minimize', () => {
    mainWindow.webContents
    .executeJavaScript('localStorage.getItem("token");', true)
    .then(result => {
      if(result !== null) {
        if (trayWindow && !trayWindowVisible) {
          trayWindow.show();
          trayWindowVisible = true;
        }
      }
    });
  });

  mainWindow.on('restore', () => {
    if (trayWindow && trayWindowVisible) {
      trayWindow.hide();
      trayWindowVisible = false;
    }
  });
}

module.exports = { createTray };