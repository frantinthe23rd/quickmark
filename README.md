# QuickMark

A lightweight WYSIWYG markdown editor for Windows. Open `.md` files directly, edit with formatting buttons, and save automatically.

## Features

- **WYSIWYG editing** — bold, italic, headings, lists, links, and more via toolbar; no markdown syntax in the way
- **Source toggle** — view and edit raw markdown at any time (Ctrl+Shift+S)
- **Tabbed interface** — open multiple files at once
- **Auto-save** — saves 2 seconds after your last keystroke
- **System theme** — follows Windows light/dark mode; cycle manually with the toolbar toggle
- **Spell check** — OS-level spell checking built in
- **Recent files** — File → Recent Files for quick access
- **Export** — File → Export as PDF or Export as HTML

## Download

Grab the latest Windows installer from [Releases](../../releases).

## Development

Requires [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/jonmoseley3/quickmark.git
cd quickmark
npm install
npm run dev
```

### Build Windows installer

```bash
npm run build:win
# Output: dist/QuickMark Setup *.exe
```

### Run tests

```bash
npx vitest run
```

## Tech stack

Electron · React 18 · TypeScript · TipTap 2 · CodeMirror 6 · Vite · Electron Builder

## Licence

[MIT](LICENSE)
