const { contextBridge, ipcRenderer,desktopCapturer  } = require('electron')

// const store = new Store();
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
}) 

contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: async (sourceTypes) => {
      return await desktopCapturer.getSources({ types: sourceTypes });
  }
});

contextBridge.exposeInMainWorld('helpers', {
  baseurl: () => process.env.BASE_URL,
})

// contextBridge.exposeInMainWorld('store', {
//   get: (key) => store.get(key),
//   set: (key, value) => store.set(key, value),
//   // Add other methods as needed
// });


contextBridge.exposeInMainWorld(
  'api', {
    send: (channel, data) => {
      // whitelist channels
      let validChannels = ['navigate','user-inactive','start_working','start_break','saveToken','authenticate','logout','start_taking_Screenshot'];
      if (validChannels.includes(channel)) {
      }
      ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
      let validChannels = ['request-data-from-renderer','user-inactive','started_working','started_break'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
      }
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    remove:  (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
);