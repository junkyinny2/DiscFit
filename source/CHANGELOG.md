# DiscFit - Changelog

## Version 1.14
*   **Architecture: Full Tauri v2 Migration:** Completely rebuilt from the ground up on Tauri v2 + React + Rust. Eliminated all C# and Electron dependencies. The entire filesystem I/O, bin packing, and export pipeline is now native Rust — no .NET runtime, no Node.js. Final installer is ~8 MB.
*   **Feature: Plugin System:** Introduced an extensible plugin architecture. External executables in any language can be registered via JSON manifests in the app data directory and invoked directly from the right-click context menu on any Set. The target Set's file list is automatically serialized and passed to the plugin as a temporary JSON file.
*   **Feature: Persistent Settings:** Dark mode preference and last-used media size now persist to disk via a native Rust settings backend (`settings.json`). Settings are restored automatically on the next launch, replacing the fragile `localStorage` approach.
*   **Feature: Native Drag-and-Drop onto Set Tabs:** Files and folders can now be dragged directly onto a specific Set tab to append to that set, with real-time capacity enforcement. Files exceeding the target size are skipped and a user alert is shown with the overflow count.
*   **Feature: Cancellable ISO Export:** Long-running ISO generation operations can now be cancelled mid-stream via a Cancel button that appears inline in the status bar. Tasks are tracked server-side via a UUID-based Rust task manager.
*   **Feature: File Menu (Add Files / Add Folder):** Native OS file and folder picker dialogs are now accessible via File → Add Files… and File → Add Folder… as an alternative to drag-and-drop.
*   **Feature: Custom Frameless Titlebar:** A fully custom React-rendered titlebar replaces the OS default, with native minimize/maximize/close controls via Tauri window APIs and synchronized dark/light theme coloring through `setTheme()`.
*   **Feature: App Version from Manifest:** The application version is now read at runtime from `tauri.conf.json` via a Rust command and surfaced in the About dialog and titlebar dynamically.
*   **Enhancement: Native Window Theme Sync:** When toggling dark/light mode, the native OS titlebar chrome now syncs to match via Tauri's `setTheme()` API, eliminating the visual mismatch present in the Electron version.
*   **Enhancement: Debounced Drag Events:** A 250ms deduplication guard prevents Tauri's native double-fire drag-drop event bug on Windows from triggering duplicate file enumeration passes.
*   **Enhancement: Right-Click Remove on File Rows:** Individual file items within any Set can be removed via a right-click context menu option in addition to the Delete key.
*   **Enhancement: Live Export Progress:** Copy, Move, and ISO operations all stream real-time progress back to the status bar via Tauri events.

---

## Version 1.13
*   **Feature: Editable Result Sets:** The last generated bin tab is now fully editable, allowing you to add/remove individual files without re-packing.
*   **Feature: Drag-and-Drop Set Addition:** Drag files or folders directly onto any result set tab to add them on-the-fly. Full paths and folder sizes are preserved.
*   **Feature: Context Menu Set Editing:** Right-click any result set to access "Add Selected Source Items" (from the source list) and "Remove Selected Items" options.
*   **Feature: Max-Size Enforcement:** When adding items to a set, the app prevents exceeding the selected media capacity and displays a warning if overflow would occur.
*   **Enhancement: File Icons on Addition:** Newly added items automatically load their system file icons, matching the look of the initial packing results.
*   **Enhancement: Full Paths in Sets:** When adding files via drag-and-drop or context menu, full file/folder paths are displayed (not just filenames), improving clarity.
*   **Architecture: Non-Self-Contained Executable:** Reduced `.exe` size from 146 MB to ~300 KB by removing the bundled .NET runtime. Users without .NET 8 will see a system install prompt.

## Version 1.12
*   **Feature: Native ISO Export:** Added a new context menu option "Save Set as ISO..." to export generated disc sets directly to ISO 9660 images with Joliet long filename support.
*   **Architecture: Zero-Dependency Engine:** Implemented the ISO generator using the native Windows Image Mastering API v2 (IMAPI2), eliminating the need for external NuGet packages or DLLs.

## Version 1.11
*   **Feature: Empty Folder Support:** Improved drag-and-drop and Add Folder logic to detect and include empty directories.
*   **Bug Fix: Safe Copy Logic:** Prevented crashes when attempting to copy zero-byte directory items; the engine now correctly creates the folder structure without issuing a file-copy command.
*   **Enhancement: Exporter Empty Directory Support:** Updated DXP and ImgBurn exporters to natively support and preserve empty directory nodes.
*   **Change: Removed InfraRecorder:** Deleted the InfraRecorder (.irproj) export functionality to maintain a cleaner, more focused set of modern export options.

## Version 1.10
*   **Feature: Export to ImgBurn (.ibb):** Added a new context menu option to generate an ImgBurn project file, mirroring the folder structure exactly like the CDBurnerXP export.
*   **Feature: Export to InfraRecorder (.irproj):** Added a new context menu option to generate an InfraRecorder XML project file, ensuring nested directories and files are fully preserved.

## Version 1.9
*   **Architecture Update:** Upgraded the application to a 64-bit (`x64`) executable to eliminate 32-bit memory limits and improve stability when processing massive datasets.

## Version 1.8
*   **Optimization: Async Drag-and-Drop:** Completely rewrote the drag-and-drop handler to run file enumeration on a background thread. Dropping even the largest directories (11GB+, tens of thousands of files) no longer freezes the UI. The status bar shows real-time scanning progress.
*   **Optimization: Extension-Based Icon Caching:** Replaced per-file `SHGetFileInfo` calls with an intelligent extension-based cache, reducing shell calls from ~50,000 to ~20–30 for large folder drops.
*   **Optimization: Fast Packing Results:** Applied extension-based icon caching to pack results rendering, making the set-building phase near-instant even with massive file lists.
*   **Feature: Live Status Bar Progress:** The status bar now provides real-time feedback during file scanning, packing, and set building.
*   **Bug Fix: Media Type Dropdown Crash:** Fixed a `NullReferenceException` crash triggered when clicking the Media Type dropdown, caused by non-public struct visibility blocking ComboBox data binding reflection.
*   **Enhancement: Global Error Logging:** Added a global unhandled exception handler that logs full stack traces to `%TEMP%\DiscFit_crash.log` for diagnostics.
*   **Optimization: Fast Dark Mode Toggle:** Consolidated the theme-switching layout pass, eliminating a multi-second stall when toggling Dark Mode with many result sets open.
*   **Bug Fix: Dark Scrollbars in Results:** Restored `SetWindowTheme("DarkMode_Explorer")` for result set ListViews to correctly render scrollbars in dark mode.

## Version 1.7
*   **Build Optimization: Single-File Executable:** Configured the `.csproj` for framework-dependent single-file publishing with embedded `.pdb` debug symbols.
*   **Codebase Enhancement: Localization:** Translated all auto-generated Visual Studio boilerplate comments from Spanish to English.
*   **Enhancement: Native Windows Copy Dialog:** Overhauled 'Copy Set to Folder' to use the `SHFileOperation` Windows API, triggering the familiar native Windows copy progress dialog with time estimation and overwrite prompting.
*   **UI Enhancements: Dark Mode Text:** Fixed the Dark Mode toggle checkbox so its label text remains static regardless of theme state.

## Version 1.6
*   **Optimization: High-Speed Packing Engine:** Completely rewrote the core Best-Fit bin packing algorithm, replacing an O(N²) array-shifting bottleneck with an O(N) linear iteration. Can now compute configurations for 50,000+ files virtually instantaneously.
*   **Bug Fix: Integer Underflow:** Patched a `ulong` arithmetic vulnerability inside the capacity calculation that triggered impossible negative capacities on oversized files.
*   **Feature: Dark Mode Theme:** Implemented a system-native immersive Windows 11 Dark Mode theme toggle.
*   **UI Enhancements: Stubborn Artifacts:** Engineered custom `DarkTabControl` and `DarkComboBox` rendering subclasses to manually override OS paint commands, eliminating persistent Win32 visual artifacts.
*   **UI Enhancements: Centered Title Bar:** Integrated custom alignment logic using Non-Breaking Spaces to perfectly center the application title, working around Windows 11 DWM whitespace-trimming behaviors.

## Version 1.5
*   **Rebranding:** Globally renamed the project from "BinPacking" to "DiscFit" across all source files and namespaces.
*   **UI Overhaul:** Implemented a modern flat UI design with a clean light-gray/white theme, flat blue accent Pack button, and `Segoe UI` typography.
*   **Dynamic Analytics:** Added a dynamic status bar displaying the total byte size of the currently selected disc tab.
*   **Tab Tooltips:** Added tooltips to generated disc tabs showing the exact total byte size of each set's contents.

## Version 1.4
*   **Feature: Copy Set to Folder:** Added a context menu option to physically copy all files from a generated set into a user-selected destination directory, reconstructing the original nested folder structure.
*   **Feature: Export to Text:** Added a context menu option to generate a `.txt` file containing a raw list of absolute file paths for a selected set.

## Version 1.3
*   **Enhancement: CDBurnerXP Directory Structures:** Completely rewrote the CDBurnerXP `.dxp` XML generator to dynamically reconstruct the original nested XML directory tree from absolute file paths.

## Version 1.2
*   **Feature: Context Menus:** Added right-click context menus to dynamically generated ListView controls for Disc Sets and the Oversized list.
*   **Feature: Export to CDBurnerXP:** Added foundational "Export to CDBurnerXP (.dxp)" functionality.
*   **Bug Fix: Folder Drag-and-Drop:** Fixed a critical flaw where dragging a folder treated the entire folder as a single indivisible object instead of recursively scanning and extracting its files.
*   **Bug Fix: UI Path Display:** Fixed variable scoping bugs causing the Path column to display only filenames or drop paths entirely.
*   **Bug Fix: Icon Crash:** Resolved an unhandled `ArgumentException` crash when `SHGetFileInfo` returned an invalid icon handle. Implemented a system fallback icon.