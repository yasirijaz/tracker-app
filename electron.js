const { app, BrowserWindow, ipcMain, desktopCapturer, Notification, powerMonitor, Menu, dialog, nativeTheme, powerSaveBlocker  } = require('electron');
const dotenv = require('dotenv');
dotenv.config().parsed;
const { platform } = require('process');
const robot = require('robotjs')
const activeWin = require('active-win');
const path = require('path')
const Store = require('electron-store');
const { createTray } = require('./tray.js');
const { updateElectronApp, UpdateSourceType } = require('update-electron-app');

const store = new Store();
// const { postRequest, template } = require(path.join(__dirname, 'services', 'index'));

let mainWindow;
const baseurl = process.env.BASE_URL;
let bearerToken = store.get('authToken');
let activeAppInterval;
let workingInterval;
var startTimeMS = 0;
let timeInterval = 60000; // Every 1 minutes for first time
let activityThreshHold = 120000;
let activeWinThreshold = 120000;
let mousePosition = 0;
let idleTimer; 
let isWorking = false;
let idleCount = 0;
let shouldPreventClose = false;
let projectDetail = {};
const isDev = process.env.APP_DEV;

// let screenshotCount = 0;
// const screenshotLimit = 5;

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'WSH TimeTracker',
    icon: path.join(__dirname, 'assets/logo-icon.png'),
    titleBarStyle: 'customButtonsOnHover',
    width: 1600,
    height: 800,
    webPreferences: {
      // devTools:false,
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `https://tracking.windshieldhub.com`;

  mainWindow.loadURL(startURL);

  mainWindow.on('closed', (event) => {
    app.exit();
  })

  mainWindow.on('close', (event) => {
    console.log(shouldPreventClose);
    if (!shouldPreventClose) {
      event.preventDefault();
      showCloseWarning(mainWindow);
    }
  });
}

app.on('updateApp', () => {

  console.log('Custom function triggered!');
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.StaticStorage,
      baseUrl: `https://wsh-pub-upload.s3.us-west-2.amazonaws.com/tracker-app/${process.platform}/${process.arch}`
    }
  });
})

function showCloseWarning(mainWindow) {
  const options = {
    type: 'question',
    buttons: ['Cancel', 'Continue'],
    message: 'If you close the app. Your tracking will stop.',
    parent: mainWindow // Optional: Set the parent window for modal behavior (macOS)
  };

  dialog.showMessageBox(mainWindow, options)
    .then(result => {
      // console.log(result);
      if (result.response === 1) {
        resetAllTimers();
        shouldPreventClose = true;
        // console.log('Dolpug confirmed!', shouldPreventClose);
        mainWindow.close();
      } else {
        console.log('Dolpug cancelled.');
      }
    });
}
const isMac = process.platform === 'darwin'
const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { role: 'quit' }
        ]
      }]
    : []),
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit-app' }
    ]
  },
  {
    label: 'Check Updates',
    click: () => app.emit('updateApp')
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { role: 'togglefullscreen' }
    ]
  }
];
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
nativeTheme.shouldUseDarkColors

app.on('ready', () => {
  createWindow();
  createTray(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
});

powerMonitor.addListener('lock-screen',()=> {
  console.log('going to sleep')
  if(bearerToken && bearerToken != 'undefined'){
    if(isWorking){
      powerSaveBlocker.start("prevent-display-sleep");
      startBreak();
    }
  }
})

powerMonitor.on("suspend", () => {
  console.log('going to sleep1')
  if(bearerToken && bearerToken != 'undefined'){
    if(isWorking){
      powerSaveBlocker.start("prevent-app-suspension");
      startBreak();
    }
  }
});

powerMonitor.addListener('unlock-screen',()=> {
  if(bearerToken && bearerToken != 'undefined'){
    if(!isWorking){
      // showNotification('Break On', 'Your break is on. Turn off break to start working.');
    }
    if (!mainWindow.isDestroyed())
      mainWindow.webContents.send('sync', true);
  }
})

ipcMain.on('project-details-submitted', (event, projectDetails) => {
  isWorking = true;
  projectDetail = projectDetails;
});

ipcMain.on('get-cached-project-details', (event) => {
  if (!mainWindow.isDestroyed())
    mainWindow.webContents.send('project-detail', { projectDetail })
});


ipcMain.on('startTracking', (event, arg) => {
  // clearTimeout(workingInterval);
  // console.log('tracking',workingInterval); 
  if(!workingInterval){
    startTimeMS = (new Date()).getTime();
    isWorking = true;
    workingInterval = setTimeout(startTracking, timeInterval);
    // console.log('tracking',workingInterval); 
  }
})
ipcMain.on('checked_out', (event, arg) => {
  isWorking = false;
  clearTimeout(workingInterval);
  resetIdleTimer();
  clearInterval(activeAppInterval);
})

ipcMain.on('start_working', (event, arg) => {
  event.reply('request-data-from-renderer', { type: 'stopBreak' });
  clearTimeout(workingInterval);
  const mouse = robot.getMousePos();
  mousePosition = mouse.x + mouse.y;
  isWorking = true;
  timeInterval = 60000;
  event.reply('started_working', 'Started Successfully');
  clearInterval(activeAppInterval);
  activeAppInterval = setInterval(trackActiveWindow, activeWinThreshold);
  startTimeMS = (new Date()).getTime();
  workingInterval = setTimeout(startTracking, timeInterval);
  // console.log('tracking',workingInterval); 
});

ipcMain.on('start_break', (event, arg) => {
  startBreak();
});

ipcMain.on('userState', (event, data) => {
  isWorking = !data.isBreakOn;
});

ipcMain.on('userInfo', (event, user) => {
  store.set('userInfo', user);
  if (!mainWindow.isDestroyed())
    mainWindow.webContents.send('user-loggedIn', {user} )
});

ipcMain.on('saveToken', (event, token) => {
  store.set('authToken', token);
  bearerToken = token;
  mainWindow.webContents
  .executeJavaScript('localStorage.getItem("token");', true)
  .then(result => {
    store.set('authToken', result);
  });
});

ipcMain.on('authenticate', (event) => {
  const token = store.get('authToken');
  if (!token) {
    return false;
  }
  powerSaveBlocker.start("prevent-display-sleep");
  powerSaveBlocker.start("prevent-app-suspension");
  if (!mainWindow.isDestroyed())
    mainWindow.webContents.send('request-data-from-renderer', { type: 'fetchToken', token: token });
});

ipcMain.on('clockout', (event, page) => {
  resetAllTimers();
});

ipcMain.on('logout', (event, page) => {
  store.delete('authToken');
  resetAllTimers();
});

ipcMain.on('notify', (event, data) => {
  showNotification(data.title, data.msg);
});
ipcMain.on('saveScreenshot', (event, data) => {
  takeScreenshot(data);
});

if (platform === 'win32') {
  // console.log('Windows platform');
} else if (platform === 'darwin') {
} else if (platform === 'linux') {
} else {
}

function startTracking() {
  trackTimeCall();
  resetIdleTimer();
  startMonitoringActivity();
  timeInterval = Math.floor(Math.random() * (10 - 2 + 1) + 2) * 60000;
  startTimeMS = (new Date()).getTime();
  workingInterval = setTimeout(startTracking, timeInterval);
  // console.log('startTrackingworkingInterval',workingInterval);
}

function startMonitoringActivity() {
  idleTimer = setInterval(function () {
    const mouse = robot.getMousePos();
    const mouseSum = mouse.x + mouse.y;
    // console.log('mouseSum','mousePosition');
    console.log(mouseSum,mousePosition);
    if (mouseSum !== mousePosition) {
      mousePosition = mouseSum;
      idleCount = 0;
      if (!isWorking) {
        mainWindow.show();
        showNotification('Break On', 'Your break is on. Turn off break to start working.');
        if (!mainWindow.isDestroyed())
          mainWindow.webContents.send('request-data-from-renderer', { type: 'NotifyBreakOn' });
      }
    } else {
      // console.log('idleCount', idleCount);
      if (idleCount <= 1) {
        if (idleCount == 1) {
          isWorking = false;
          showNotification('Idle Warning', "I couldn't help but notice the serene silence around. Are you engrossed in your work?", true);
        }
        idleCount++;
      } else {
        if(isWorking){
          showNotification('Idle Warning', 'Seems like you are not working right now. System is turning on your break.');
          // workingInterval = setTimeout(startTracking, idleCount*60000);
          const rem = getRemainingTime();
          // console.log('rem', rem);
          timeInterval = rem; 
          // console.log('timeInterval', timeInterval);
          trackTimeCall();
          if (!mainWindow.isDestroyed())
            mainWindow.webContents.send('request-data-from-renderer', { type: 'startBreak' });
          mainWindow.show();
          isWorking = false;
        }
      }
    }
  }, activityThreshHold);
}

function showNotification(NOTIFICATION_TITLE, NOTIFICATION_BODY, FEEDBACK = false) {
  const notification = new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
    timeout: 5000,
    backgroundColor: '#fff',
    textColor: '#000',
    borderColor: '#ccc',
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  });
  if (FEEDBACK) {
    notification.on('click', () => {
      idleCount = 0;
    });
  }
  notification.show();
}

function trackTimeCall() {
  isWorking = true;
  const userData = {
    time_spent: timeInterval,
    project_id: 0,
    task_detail: ''
  };

  if(projectDetail && isWorking) {
    userData['project_id'] = projectDetail.projectName;
    userData['task_detail'] = projectDetail.taskDetails;

    if (!mainWindow.isDestroyed())
      mainWindow.webContents.send('request-data-from-renderer', { type: 'trackTime', url: 'time', body: userData });
          
    // postRequest(baseurl + 'time', userData, bearerToken)
    //   .then(data => {
    //     takeScreenshot(data);
    //   })
    // .catch(error => console.error('Error:', error));
  }
}

function takeScreenshot(trackId) {
  trackActiveWindow();
  // console.log(trackId,'trackid');
  desktopCapturer.getSources({ types: ['screen'], fetchWindowIcons: true, thumbnailSize: { width: 1920, height: 1080 } })
      .then(async sources => {
        for (const source of sources) {
          if (!mainWindow.isDestroyed())
            mainWindow.webContents.send('request-data-from-renderer', { type: 'saveImage', url: 'save/image', body: source.thumbnail.toDataURL(), trackId: trackId });
          showNotification('screenshot taken', 'Screenshot taken');
        }
      });
}

function startBreak() {
  if (!mainWindow.isDestroyed())
    mainWindow.webContents.send('started_break', 'Stopped Successfully');
  // console.log('Break Start');
  
  const rem = getRemainingTime();
  // console.log('rem', rem);
  timeInterval = rem; 
  // console.log('timeInterval', timeInterval);
  trackTimeCall();

  clearTimeout(workingInterval);
  clearInterval(activeAppInterval);
  isWorking = false;
}

function resetIdleTimer() {
  clearInterval(idleTimer);
}

function resetAllTimers() {
  clearInterval(idleTimer);
  clearTimeout(workingInterval);
  clearInterval(activeAppInterval);
}

async function trackActiveWindow() {
  try {
    const info = await activeWin();
    if(info){
      const userData = {
        platform: info.platform,
        title: info.title,
        application: info.owner.name
      };
      if (!mainWindow.isDestroyed())
        mainWindow.webContents.send('request-data-from-renderer', { type: 'trackApplications', url: 'trackApplications', body: userData });
      // await postRequest(baseurl + 'trackApplications', userData).then(data => {
      // }).catch(error => console.error('Error:', error));
    }
  } catch (error) {
    console.error('Error fetching active window:', error);
  }
}

function getRemainingTime() {
  var remaining = 0;
  // console.log('workingInterval',workingInterval);
  if (workingInterval) {
    // const currentTime = Date.now();
    // console.log('currentTime',currentTime);
    // const startTime = workingInterval['_idleStart'];
    // console.log('timeInterval',timeInterval);
    // console.log('startTime',startTime);
    // remaining = Math.max(0, startTime + timeInterval - currentTime);
    // console.log('remaining',remaining);
    // remaining = timeInterval - ( (new Date()).getTime() - startTimeMS );
    remaining = ( (new Date()).getTime() - startTimeMS );
  }
  return remaining;
}


