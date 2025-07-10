const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater'); // ADD THIS LINE

function createWindow(file = 'index.html') {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      // nodeIntegration: true, // इसे false रहने दो
      contextIsolation: true,   // यह जरूरी है
    },
  });
  win.loadFile(file);
  win.maximize();
  win.show();
  win.setMenuBarVisibility(false);
}

// UPDATE CODE: Check for updates when app is ready
app.whenReady().then(() => {
  createWindow();

  // CHECK FOR UPDATES ON START
  autoUpdater.checkForUpdatesAndNotify();

  // Show message to user on update downloaded (optional)
  autoUpdater.on('update-downloaded', () => {
    const { dialog } = require('electron');
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new update has been downloaded. Restart the app to install.',
      buttons: ['Restart Now']
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });
});

app.whenReady().then(() => {
  createWindow(); // Opens index.html by default
});
