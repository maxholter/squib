# Packaging PayTrack as a desktop app

PayTrack can be built into a **self-contained desktop application** — a double-click
icon that opens its own window, with **nothing for the end user to install** (Node and
the database engine are bundled inside). Data is stored per-user in the OS app-data
folder, so it persists across app updates.

## How it works

The Electron shell (`electron/main.js`) starts the Next.js production server
**in-process** on a random local port, keeps the SQLite database in the user's
app-data directory, and loads the app in a native window. No terminal, no browser tab.

- **Database location**
  - macOS: `~/Library/Application Support/PayTrack/paytrack.db`
  - Windows: `%APPDATA%\PayTrack\paytrack.db`
- A random `session-secret` is generated on first launch and stored next to the
  database, so logins and encrypted fields stay valid across restarts.

## Build the installers

You need the project's dev dependencies installed (`npm install`) once.

```bash
# macOS  → produces dist-app/PayTrack-<version>.dmg  (+ a .app)
npm run dist:mac

# Windows → produces dist-app/PayTrack Setup <version>.exe
npm run dist:win
```

`npm run dist` builds for the current platform. Each command runs `next build` first,
then `electron-builder` bundles everything and rebuilds the native database module for
Electron automatically.

### Cross-platform note

- The **macOS** `.dmg` must be built **on a Mac**.
- The **Windows** `.exe` is most reliably built **on Windows** (or in CI). Building a
  Windows installer from macOS is not dependable because the native SQLite module has to
  be compiled for Windows. The simplest route to a Windows build is a free GitHub Actions
  runner — see below.

## Try the desktop shell during development

Without building an installer, you can run the exact Electron window against the live
dev server:

```bash
npm run electron:dev
```

This launches `next dev` and opens the Electron window pointed at it (hot reload works).

## Icon

The app icon is generated from `build/icon.svg`. To regenerate the raster/`.icns`
after editing the SVG (macOS):

```bash
qlmanage -t -s 1024 -o build build/icon.svg && sips -z 1024 1024 build/icon.svg.png --out build/icon.png && rm build/icon.svg.png
# then rebuild build/icon.icns via an iconset + iconutil (see project history)
```

electron-builder derives the Windows `.ico` from `build/icon.png` automatically.

## Distributing to end users

- **macOS:** send them the `.dmg`. Because the app isn't code-signed with an Apple
  Developer ID, the first launch needs **right-click → Open** (or *System Settings →
  Privacy & Security → Open Anyway*). To remove that friction, join the Apple Developer
  Program ($99/yr) and set `mac.identity` + notarization in `package.json`.
- **Windows:** send them the `Setup .exe`. Unsigned installers show a SmartScreen
  "unknown publisher" warning → *More info → Run anyway*. A code-signing certificate
  removes it.

## Heads-up: switching between dev and packaging

`electron-builder` rebuilds the native SQLite module (`better-sqlite3`) for Electron's
runtime, which differs from your system Node. After building an installer, if you go back
to `npm run dev` and see a "NODE_MODULE_VERSION" / ABI error, restore the system build:

```bash
npm rebuild better-sqlite3
```

(`npm run electron:dev` is unaffected — it uses the dev server's own Node.)

## Building the Windows installer via GitHub Actions (optional)

Add `.github/workflows/build-windows.yml`:

```yaml
name: Build Windows
on: workflow_dispatch
jobs:
  win:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run dist:win
      - uses: actions/upload-artifact@v4
        with: { name: PayTrack-Windows, path: dist-app/*.exe }
```

Trigger it from the repo's **Actions** tab and download the `.exe` artifact.
