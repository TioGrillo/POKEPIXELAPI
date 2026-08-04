const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: true, webPreferences: { contextIsolation: true } });
  
  await win.loadURL('https://dropmail.me/en/');
  console.log("Waiting for dropmail...");
  await new Promise(r => setTimeout(r, 4000));
  
  // Scrape email
  const email = await win.webContents.executeJavaScript(`document.querySelector('.address')?.textContent.trim()`);
  console.log("Email:", email);
  
  // Navigate away
  await win.loadURL('https://poke.idleworld.online/login');
  console.log("Navigated to game.");
  await new Promise(r => setTimeout(r, 2000));
  
  // Navigate back
  await win.loadURL('https://dropmail.me/en/');
  await new Promise(r => setTimeout(r, 4000));
  
  // Check if same email is loaded
  const email2 = await win.webContents.executeJavaScript(`document.querySelector('.address')?.textContent.trim()`);
  console.log("Email after returning:", email2);
  
  app.quit();
});
