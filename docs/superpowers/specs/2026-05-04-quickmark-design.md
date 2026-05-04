# QuickMark — Design Spec

**Date:** 2026-05-04  
**Status:** Approved

## Overview

QuickMark is a lightweight, native-feeling markdown editor for Windows (initially), designed to be cross-platform recompilable for macOS and Linux. It opens `.md` files directly from the file system, presents a WYSIWYG editing experience, and stays out of the user's way.

## Goals

- Open, edit, and save markdown files with a WYSIWYG editor
- Render markdown formatting in real time; no need to see syntax while typing
- Feel like a proper desktop app: file association, tabbed interface, installer
- Lightweight — no bundled browser; uses system WebView (Electron)
- Cross-platform by design: same codebase targets Windows, macOS, Linux

## Non-Goals (v1)

- File tree / folder browser sidebar
- Cloud sync or collaboration
- Plugin system
- Focus / distraction-free mode
- Version history

---

## Tech Stack

| Layer | Technology |
|---|---|
| App shell | Electron 33 |
| UI | React 18 + TypeScript |
| WYSIWYG editor | TipTap 2 (ProseMirror-based) |
| Source view | CodeMirror 6 |
| Bundler | Vite |
| Packaging | Electron Builder |
| Persistence | electron-store |
| CI / releases | GitHub Actions |

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ readme.md ●  │  CHANGELOG.md  │  notes.md  │  +        │  ← Tab bar
├─────────────────────────────────────────────────────────┤
│ B  I  S │ H1  H2  H3 │ ≡  1≡  " │ 🔗  </>  ━  │ Source │  ← Toolbar
├─────────────────────────────────────────────────────────┤
│                                                         │
│   # Heading                                             │
│                                                         │
│   Body text with **bold** and *italic* rendered.        │
│                                                         │
│   - List item one                                       │
│   - List item two                                       │
│                                                         │  ← Editor area
│   > Blockquote                                          │
│                                                         │
│   ```                                                   │
│   code block                                            │
│   ```                                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ✓ Saved                          342 words · 1,847 chars│  ← Status bar
└─────────────────────────────────────────────────────────┘
```

- **Tab bar**: red dot = unsaved changes; `✕` closes tab (save dialog if dirty); `+` opens file dialog
- **Toolbar**: formatting buttons on left, Source toggle on right
- **Editor**: WYSIWYG by default, serif reading font, comfortable line width
- **Status bar**: save state (left), word + character count (right)

---

## Architecture

### Process Boundary

Electron splits into two processes:

**Main process** — owns the OS layer:
- File dialogs (`dialog.showOpenDialog`, `dialog.showSaveDialog`)
- Reading and writing files (`fs`)
- PDF export (`BrowserWindow.webContents.printToPDF`)
- Application menu (File / Edit / View)
- `.md` file association (registry on Windows)
- `electron-store` for persistent settings

**Renderer process** — the React application:
- All UI, editor state, tab management
- Communicates with main via a typed IPC bridge

### IPC Channels

| Channel | Direction | Purpose |
|---|---|---|
| `file:open` | renderer → main | Open file dialog; returns `{ path, content }` |
| `file:open-path` | main → renderer | File opened via CLI arg or shell association |
| `file:save` | renderer → main | Save content to known path |
| `file:saveAs` | renderer → main | Save dialog; returns chosen path |
| `file:getRecent` | renderer → main | Returns recent file list (max 10) |
| `export:pdf` | renderer → main | Triggers `printToPDF`; returns file path |
| `export:html` | renderer → main | Returns rendered HTML string |

### Component Tree

```
App
├── ThemeProvider          (CSS variable theme context)
├── TabBar                 (tab strip + open button)
└── TabPanel (per tab)
    ├── Toolbar            (formatting buttons + source toggle)
    ├── Editor
    │   ├── WysiwygEditor  (TipTap instance)
    │   └── SourceEditor   (CodeMirror 6 instance)
    └── StatusBar          (save status + word/char count)
```

### Tab State

Each tab is represented by:

```ts
interface Tab {
  id: string;          // uuid
  filePath: string | null;  // null = new unsaved file
  title: string;       // filename or "Untitled"
  isDirty: boolean;    // unsaved changes
  editorState: unknown; // TipTap JSON doc
}
```

`useTabs` hook owns the array and exposes: `openFile`, `closeTab`, `updateContent`, `markSaved`.

### Editor Mode Switching

`<Editor>` holds a `mode: 'wysiwyg' | 'source'` flag.

- **WYSIWYG → Source**: TipTap doc serialised to markdown string via `@tiptap/extension-markdown`; handed to CodeMirror.
- **Source → WYSIWYG**: CodeMirror string parsed back into TipTap JSON; TipTap doc replaced.
- Only one view is mounted at a time (the other is unmounted to avoid sync complexity).

### Auto-save

- Fires 2 seconds after the last content change (debounced).
- Skipped for new files with no path — user must Ctrl+S to trigger Save As.
- Status bar states: `Saving…` → `Saved` / `Modified` (if write fails).

### Theme

- Initialised from `nativeTheme.shouldUseDarkColors` in main process; passed to renderer via IPC on startup.
- User override stored in `electron-store` and applied on next launch.
- All colours are CSS custom properties on `:root`; a single class swap (`data-theme="dark"`) switches the palette.
- Toolbar toggle button (sun/moon icon) dispatches to `ThemeContext`.

---

## Features

### Toolbar Buttons

| Button | Markdown equivalent | Shortcut |
|---|---|---|
| B (Bold) | `**text**` | Ctrl+B |
| I (Italic) | `*text*` | Ctrl+I |
| S (Strikethrough) | `~~text~~` | — |
| H1 / H2 / H3 | `#` / `##` / `###` | — |
| ≡ (Bullet list) | `- item` | — |
| 1≡ (Ordered list) | `1. item` | — |
| " (Blockquote) | `> text` | — |
| 🔗 (Link) | `[text](url)` | Ctrl+K |
| </> (Code block) | ` ```code``` ` | — |
| ━ (Horizontal rule) | `---` | — |
| Source toggle | — | Ctrl+Shift+S |

### Spell Check

Uses Electron/Chromium's built-in spell checker (OS dictionaries on Windows). Enabled by default; can be toggled via Edit menu.

### Recent Files

Stored as an ordered array in `electron-store` (max 10). Added on open, removed if file no longer exists. Accessible via File → Recent Files menu and IPC.

### Export

- **PDF**: `BrowserWindow.webContents.printToPDF({ printBackground: true })`. Renders the current WYSIWYG view.
- **HTML**: Inlines a minimal stylesheet and the rendered TipTap HTML. Saved as a standalone `.html` file.

Both accessible via File menu.

### File Association

Windows: registered in HKCR via Electron Builder's `fileAssociations` config:
```json
{ "ext": "md", "name": "Markdown File", "role": "Editor" }
```
Opens the file directly in a new tab on launch.

---

## Packaging & Distribution

### Electron Builder Config (summary)

```json
{
  "appId": "com.quickmark.app",
  "productName": "QuickMark",
  "win": { "target": "nsis", "icon": "assets/icon.ico" },
  "mac": { "target": "dmg", "icon": "assets/icon.icns" },
  "linux": { "target": ["AppImage", "deb"] },
  "fileAssociations": [{ "ext": "md", "name": "Markdown File", "role": "Editor" }],
  "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
}
```

### GitHub Actions

- **CI workflow**: runs on every push — installs, builds, runs type-check.
- **Release workflow**: triggered by a `v*` tag push — builds Windows installer, attaches to GitHub Release as a downloadable asset.

### Repository

- **Name**: `quickmark`
- **Visibility**: Public
- **Licence**: MIT
- **`.gitignore`**: standard Electron/Node entries + `.superpowers/`

---

## Project Structure

```
quickmark/
├── src/
│   ├── main/
│   │   ├── index.ts        # Electron entry, window creation
│   │   ├── ipc.ts          # All ipcMain handlers
│   │   └── menu.ts         # Application menu definition
│   └── renderer/
│       ├── components/
│       │   ├── TabBar/
│       │   ├── Toolbar/
│       │   ├── Editor/
│       │   │   ├── WysiwygEditor.tsx
│       │   │   └── SourceEditor.tsx
│       │   └── StatusBar/
│       ├── hooks/
│       │   ├── useTabs.ts
│       │   └── useFile.ts
│       ├── context/
│       │   └── ThemeContext.tsx
│       └── App.tsx
├── assets/
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
├── docs/
│   └── superpowers/specs/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── electron-builder.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```
