# DiscFit - Features Overview

**DiscFit** is a high-performance desktop application built on **Tauri v2 + React** designed to optimally organize and pack massive collections of loose files into manageable sets corresponding perfectly to the capacities of various optical media or bounded file bins. Below is a comprehensive list of all current capabilities.

---

## Core Packing & Logistics
* **Optimum Bin Packing Algorithm**: Analyzes an unstructured drop-list of files and optimally orchestrates them into discrete sets (bins) tailored mathematically to maximize space efficiency on the target disc/storage space while minimizing waste. Implemented natively in Rust for near-instant performance on datasets of 50,000+ files.
* **Predefined Media Profiles**: Out-of-the-box size constraints available via drop-down for:
  * CD-R 700 MB
  * CD-R 700 MB (Overburn)
  * DVD+R / DVD-R
  * DVD+R DL / DVD-R DL
  * BD-R (Blu-ray) / BD-R DL
* **Custom Media Profile**: Allows users to input exact target capacities down to individual bytes.
* **Oversized File Handling**: Files that exceed the absolute maximum size of a single disc are automatically identified, sequestered, and allocated into a specialized "Oversized" tab for easy manual review.
* **Extensible Appending**: Allows users to dynamically drag additional files or folders strictly into any specific set tab or the source list without rebuilding the entire job. Capacity enforcement prevents overflow — files that would exceed the target size are skipped with a user-facing alert.

---

## Workflow & Data Extraction
* **Deep Directory Parsing**: Allows users to drag-and-drop highly nested top-level folder structures. Seamlessly crawls all enclosed depths via Rust's native filesystem APIs to extract and itemize every file.
* **Relative Path Retention**: Preserves precise, relative parent-child directory representations throughout the UI and inside all generated project exports.
* **Native OS File-Icon Extraction**: Displays the real Windows-level system icon mapped to specific file extensions, extracted via `SHGetFileInfo` and encoded as Base64 for the React frontend. Icons are extension-cached to prevent OS thrashing on large file lists.
* **File Addition via Menu**: Add individual files or entire folders via **File → Add Files…** / **File → Add Folder…** using native OS open dialogs in addition to drag-and-drop.

---

## Rich Export Ecosystem
*Once a job finishes packing, right-clicking on a generated Set tab gives access to a robust exporter matrix.*

* **Copy to Folder**: Replicates the files assigned to the Set into a brand new directory. Flawlessly reconstructs all relative nested sub-folder structures from scratch. Displays live per-file copy progress in the status bar.
* **Move to Folder**: Moves files structurally from origin to destination. Features smart fallback copying and automatic bottom-up "source cleanup" — if an origin folder becomes totally empty after a move, it is deleted automatically.
* **ImgBurn Project (.ibb)**: Generates an ImgBurn backup config file mapping precise relative directory architectures.
* **CDBurnerXP Project (.dxp)**: Generates a serialized XML tree layout file for drag-and-drop loading into CDBurnerXP.
* **Plain Text List (.txt)**: Quick dump of all absolute file paths contained in a distinct Set.
* **Native ISO Generator (.iso)**: Integrated ISO 9660 pipeline using `mkisofs.exe` with memory-mapped point grafting, completely avoiding slow system-level file-staging temp copies. Supports Joliet long filenames. Features a live percentage progress tracker and a **Cancel** button in the status bar to abort mid-generation.

---

## Plugin System
* **Extensible Plugin Architecture**: Drop-in external executables can be registered as plugins and invoked directly from the right-click context menu on any Set.
* **JSON Manifest Format**: Each plugin is defined by a `.json` file placed in the app data directory (`%APPDATA%\com.discfit.app\plugins\`), specifying the executable path, optional CLI arguments, and a display name/description.
* **Automatic File Passing**: The selected Set's file list is serialized to a temporary JSON file and passed as a CLI argument to the plugin executable — compatible with any language (Python, Node, batch, etc.).
* **Scanned on Launch**: All installed plugins are discovered and loaded at startup, then surfaced in the context menu.

---

## Persistence & Settings
* **Persistent Settings**: Dark mode preference and last-used media size are persisted to disk via a native Rust-backed settings system (`settings.json` in the app config directory). Settings are restored automatically on next launch.
* **App Version Reporting**: The active application version is read at runtime from `tauri.conf.json` and displayed in the About dialog and titlebar.

---

## Modern Application Interface
* **Native Tauri v2 Runtime**: Rebuilt from C# / Electron to Tauri v2 + React. The Rust backend handles all filesystem I/O, packing, and export logic natively — no Node.js runtime, no .NET dependency. Produces a lean ~8 MB installer.
* **Custom Frameless Titlebar**: A fully custom React-rendered titlebar replaces the OS default, featuring native minimize/maximize/close controls via Tauri window APIs and a synchronized dark/light theme.
* **Menu Bar**: Native-style File and Help menus with keyboard-dismissible dropdowns (Escape key), including New, Add Files, Add Folder, Exit, Check for Updates, About Author, and About DiscFit options.
* **First-Class Dark Theme**: Rich dark mode aesthetics with full CSS variable theming across all panels, scrollbars, modals, tab states, and context menus. Default-on, user-toggleable, and synced to the native Tauri window theme for consistent titlebar coloring.
* **Live Status Bar**: Displays real-time feedback during all major operations — file scanning counts, packing results, copy/move percentage, ISO generation progress, and plugin execution status. The Cancel button appears inline during cancellable operations (ISO export).
* **Right-Click Context Menus**: Full context menu support on Set tabs (export actions + plugins) and on individual file rows within a Set (remove item). Menus dismiss on Escape or click-away.
* **[Delete] Key Support**: Select a file row within a Set and press Delete to remove it. Bin capacity totals auto-update.
* **Drag-and-Drop Onto Set Tabs**: Files and folders can be dragged directly onto a specific Set tab button to append them to that set, with capacity enforcement and user alerts on overflow.
* **Debounced Drag Events**: A 250ms deduplication guard prevents Tauri's native double-fire drag event bug on Windows from triggering duplicate file enumerations.
* **Cancellable Long Operations**: Long-running tasks (ISO export) are tracked via a UUID-based task manager in Rust, allowing mid-operation cancellation from the UI.