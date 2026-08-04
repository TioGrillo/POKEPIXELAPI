const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: true, webPreferences: { contextIsolation: true } });
  
  await win.loadURL('https://dropmail.me/en/');
  console.log("Waiting for dropmail to generate email...");
  
  let email = "";
  for (let i=0; i<30; i++) {
    email = await win.webContents.executeJavaScript(`
      (() => {
        const el = document.querySelector('.address');
        return el ? el.textContent.trim() : "";
      })()
    `).catch(()=>"");
    if (email && email.includes('@')) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const accountsDump = await win.webContents.executeJavaScript(`
    (() => {
      try {
        // Dropmail uses Knockout.js
        return ko.dataFor(document.body).restore.accountsDump();
      } catch (e) {
        return "ERROR: " + e.message;
      }
    })()
  `);
  
  console.log("Accounts Dump:", accountsDump);
  app.quit();
});
