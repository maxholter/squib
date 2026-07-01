// Electron main process for PayTrack.
//
// Responsibilities:
//   1. Start the Next.js production server IN-PROCESS (no separate Node needed).
//   2. Keep all data in the OS per-user app-data folder so it persists across
//      updates and never touches the read-only app bundle.
//   3. Show a native window (with a brief splash while the server boots).
//
// Dev shortcut: set PAYTRACK_DEV_URL=http://localhost:3000 to point the window at
// an already-running `next dev` instead of starting the bundled server.

const { app, BrowserWindow, shell, dialog, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const crypto = require("node:crypto");

// Stable app name → stable userData path across dev and packaged builds.
app.setName("PayTrack");

const DEV_URL = process.env.PAYTRACK_DEV_URL || null;
let mainWindow = null;
let httpServer = null;

// Only allow a single running instance; focus the existing window otherwise.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// A long random secret, generated once and reused — signs sessions and encrypts
// sensitive fields. Persisted in userData so logins/encryption survive restarts.
function loadOrCreateSecret() {
  const secretPath = path.join(app.getPath("userData"), "session-secret");
  try {
    const existing = fs.readFileSync(secretPath, "utf8").trim();
    if (existing) return existing;
  } catch {
    /* not created yet */
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

async function startNextServer() {
  const appDir = app.getAppPath(); // .../Resources/app in a packaged build
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });

  process.env.NODE_ENV = "production";
  process.env.DATABASE_PATH = path.join(userData, "paytrack.db");
  process.env.SESSION_SECRET = loadOrCreateSecret();

  // Load Next from the bundled node_modules and run it as a request handler.
  const nextFn = require("next");
  const createApp = nextFn.default || nextFn;
  const nextApp = createApp({ dev: false, dir: appDir });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  httpServer = http.createServer((req, res) => handle(req, res));
  const port = await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    // Port 0 → OS assigns a free port, avoiding conflicts with other apps.
    httpServer.listen(0, "127.0.0.1", () => resolve(httpServer.address().port));
  });
  console.log(`[paytrack] server listening on http://127.0.0.1:${port}`);
  console.log(`[paytrack] database: ${process.env.DATABASE_PATH}`);
  return `http://127.0.0.1:${port}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 600,
    title: "PayTrack",
    backgroundColor: "#0f172a",
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open target=_blank / external links in the user's real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function showFatal(err) {
  const message =
    "PayTrack couldn't start its local server.\n\n" +
    (err && err.stack ? err.stack : String(err));
  dialog.showErrorBox("PayTrack failed to start", message);
}

app.whenReady().then(async () => {
  createWindow();
  // Splash while the server warms up (a second or two on first launch).
  await mainWindow.loadFile(path.join(__dirname, "loading.html"));

  try {
    const url = DEV_URL || (await startNextServer());
    if (mainWindow) await mainWindow.loadURL(url);
  } catch (err) {
    showFatal(err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows close (including on macOS — this is a single-window app).
app.on("window-all-closed", () => {
  app.quit();
});

app.on("quit", () => {
  if (httpServer) {
    try {
      httpServer.close();
    } catch {
      /* ignore */
    }
  }
});

// Keep a minimal native menu (Edit shortcuts like copy/paste stay available).
Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    ...(process.platform === "darwin"
      ? [{ role: "appMenu" }]
      : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ]),
);
