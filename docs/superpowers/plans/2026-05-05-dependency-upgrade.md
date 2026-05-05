# Dependency Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all outdated npm packages to their latest major versions to eliminate known security vulnerabilities and technical debt.

**Architecture:** Four sequential upgrade batches — build tooling first (lowest risk, no app code changes), then Electron, then React, then TipTap (highest risk, requires one line of code change). After each batch, typecheck and tests confirm nothing broke. A final audit task verifies the vulnerability count dropped.

**Tech Stack:** Electron 41, React 19, TipTap 3, electron-vite 5, Vite 8, TypeScript 6, Vitest 4

**Worktree:** All source files are under `.worktrees/feature/dependency-upgrade/` from the project root. Run all commands from inside that directory.

---

### Task 1: Upgrade Build Tooling

**Files:**
- Modify: `.worktrees/feature/dependency-upgrade/package.json` (via npm)
- Possibly modify: `.worktrees/feature/dependency-upgrade/tsconfig.node.json`

> No unit tests — build tooling packages only, no application code changes.

- [ ] **Step 1: Install updated build-tooling packages**

```bash
cd C:\development\projects\markdown_viewer\.worktrees\feature\dependency-upgrade
npm install --save-dev electron-vite@latest electron-builder@latest vite@latest @vitejs/plugin-react@latest typescript@latest vitest@latest jsdom@latest @electron-toolkit/tsconfig@latest @types/node@latest
```

Expected: all packages install, `package.json` devDependencies updated.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

If the error is `Cannot find type definition file for 'electron-vite/node'` (electron-vite 5 moved the type path), open `tsconfig.node.json` and remove the types array:

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": [
    "electron.vite.config.*",
    "src/main/**/*",
    "src/preload/**/*"
  ],
  "compilerOptions": {
    "composite": true
  }
}
```

If TypeScript 6 reports `verbatimModuleSyntax` errors (re-exporting a type without the `type` keyword), prefix the offending import with `type`:
```ts
// Before
import { SomeType } from './module'
// After
import type { SomeType } from './module'
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all 32 tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.node.json
git commit -m "chore: upgrade build tooling (electron-vite 5, vite 8, ts 6, vitest 4)"
```

---

### Task 2: Upgrade Electron 35 → 41

**Files:**
- Modify: `.worktrees/feature/dependency-upgrade/package.json` (via npm)

> No application code changes expected. All Electron APIs used by this project (`ipcMain`, `dialog`, `BrowserWindow`, `nativeTheme`, `shell`, `ipcRenderer`, `contextBridge`) are stable across this range.

- [ ] **Step 1: Install Electron 41**

```bash
cd C:\development\projects\markdown_viewer\.worktrees\feature\dependency-upgrade
npm install --save-dev electron@latest
```

Expected: electron updated in `package.json` devDependencies.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all 32 tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade electron 35→41"
```

---

### Task 3: Upgrade React 18 → 19

**Files:**
- Modify: `.worktrees/feature/dependency-upgrade/package.json` (via npm)
- Possibly modify: `.worktrees/feature/dependency-upgrade/src/renderer/src/**/*.tsx`

> React 19 removes `ReactDOM.render`, `defaultProps` on function components, and `propTypes` — none of which this codebase uses. The `createRoot` pattern already in `main.tsx` is the React 19 standard.

- [ ] **Step 1: Install React 19**

```bash
cd C:\development\projects\markdown_viewer\.worktrees\feature\dependency-upgrade
npm install --save-dev react@latest react-dom@latest @types/react@latest @types/react-dom@latest
```

Expected: all four packages updated.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

React 19 types deprecated the global `JSX` namespace in favour of `React.JSX`. If TypeScript reports `Namespace 'JSX' has no exported member 'Element'`, update the return type annotations across all `.tsx` files that declare `): JSX.Element`. The affected files are:

- `src/renderer/src/components/Editor/WysiwygEditor.tsx`
- `src/renderer/src/components/Editor/CodeBlockView.tsx`
- `src/renderer/src/components/Editor/SourceEditor.tsx`
- `src/renderer/src/context/ThemeContext.tsx`
- `src/renderer/src/components/Editor/Editor.tsx`
- `src/renderer/src/components/StatusBar/StatusBar.tsx`
- `src/renderer/src/components/TabBar/TabBar.tsx`
- `src/renderer/src/components/Toolbar/Toolbar.tsx`
- `src/renderer/src/App.tsx`

For each file, apply this change:

```tsx
// Before (no React import needed, global JSX namespace)
export function MyComponent(): JSX.Element {

// After
import React from 'react'
export function MyComponent(): React.JSX.Element {
```

Only do this if typecheck actually fails — `@types/react@19.x` still re-exports the global `JSX` namespace for backwards compatibility so the change may not be needed.

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all 32 tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src
git commit -m "chore: upgrade react 18→19"
```

---

### Task 4: Upgrade TipTap 2 → 3, tiptap-markdown, uuid

**Files:**
- Modify: `.worktrees/feature/dependency-upgrade/package.json` (via npm)
- Modify: `.worktrees/feature/dependency-upgrade/src/renderer/src/components/Editor/WysiwygEditor.tsx`

TipTap v3 bundles the Link extension inside StarterKit. The project already uses `Link.configure({ openOnClick: false })` as a separate explicit extension — registering it alongside StarterKit's built-in Link would throw a duplicate extension error at runtime. The fix is one line: add `link: false` to `StarterKit.configure(...)` to disable the built-in copy.

- [ ] **Step 1: Install TipTap v3 packages, tiptap-markdown, and uuid**

```bash
cd C:\development\projects\markdown_viewer\.worktrees\feature\dependency-upgrade
npm install @tiptap/react@latest @tiptap/starter-kit@latest @tiptap/extension-link@latest @tiptap/extension-code-block-lowlight@latest tiptap-markdown@latest uuid@latest
```

Expected: all six packages updated in `package.json` dependencies.

- [ ] **Step 2: Fix duplicate Link extension in `WysiwygEditor.tsx`**

File: `src/renderer/src/components/Editor/WysiwygEditor.tsx`, line 39.

Find:
```tsx
StarterKit.configure({ codeBlock: false }),
```

Replace with:
```tsx
StarterKit.configure({ codeBlock: false, link: false }),
```

This tells StarterKit to skip its bundled Link extension so the explicit `Link.configure({ openOnClick: false })` below it in the array remains the active one. No other changes to this file.

- [ ] **Step 3: Remove `@types/uuid` — uuid v14 ships its own TypeScript types**

```bash
npm uninstall @types/uuid
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `tiptap-markdown` v0.9 removed `transformCopiedText`, update the call in `WysiwygEditor.tsx`:
```tsx
// Current (line 43)
Markdown.configure({ html: false, transformCopiedText: true })
// If transformCopiedText no longer exists, drop it:
Markdown.configure({ html: false })
```

If `NodeViewProps`, `NodeViewWrapper`, or `NodeViewContent` moved to a different package in TipTap 3 (error: `has no exported member`), update the import in `CodeBlockView.tsx` — but these are expected to remain in `@tiptap/react`.

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: all 32 tests pass. The 4 `MermaidDiagram` tests mock `mermaid` directly and have no TipTap dependency, so they are unaffected by the TipTap upgrade.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/renderer/src/components/Editor/WysiwygEditor.tsx
git commit -m "chore: upgrade tiptap 2→3, tiptap-markdown, uuid; drop @types/uuid"
```

---

### Task 5: Final Audit

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
cd C:\development\projects\markdown_viewer\.worktrees\feature\dependency-upgrade
npx vitest run
```

Expected: all 32 tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Check vulnerability count**

```bash
npm audit
```

Expected: 0 critical, 0 high vulnerabilities. Any remaining issues should be `moderate` or `low` severity inside `electron-builder`'s deep transitive dependency chain — these are build-time tools and do not ship in the app. If any critical or high remain, run `npm audit` and fix the specific package flagged.

- [ ] **Step 4: Commit audit result**

```bash
git add package-lock.json
git commit -m "chore: post-upgrade lockfile — all critical/high vulns resolved"
```

(Skip if `package-lock.json` has no new changes.)
