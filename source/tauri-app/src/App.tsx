import { useState, useEffect, useCallback, useRef } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { FileItem, Bin, ExportAction, formatBytes, AppPlugin } from './types';
import { tauriClient } from './tauriClient';
import { FileList } from './components/FileList';
import { MediaControls } from './components/MediaControls';
import { BinsViewer } from './components/BinsViewer';
import { ContextMenu } from './components/ContextMenu';
import { Titlebar } from './components/Titlebar';

type CtxState = { x: number; y: number; setIdx: number; itemIdx?: number } | null;

export default function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [oversized, setOversized] = useState<FileItem[]>([]);
  const [mediaSize, setMediaSize] = useState(737280000);
  const [dark, setDark] = useState(true);
  const [status, setStatus] = useState('DiscFit Ready — Add files or folders to begin.');
  const [ctx, setCtx] = useState<CtxState>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [version, setVersion] = useState('1.13.0');
  const [plugins, setPlugins] = useState<AppPlugin[]>([]);

  // Load settings on mount
  useEffect(() => {
    tauriClient.loadSettings().then((s) => {
      setDark(s.dark_mode);
      setMediaSize(s.media_size);
    });
    tauriClient.getAppVersion().then(setVersion);
    tauriClient.getPlugins().then(setPlugins);
  }, []);

  // Save settings on change
  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    tauriClient.saveSettings({ dark_mode: dark, media_size: mediaSize });
    
    // Set native titlebar theme
    import('@tauri-apps/api/window').then(m => {
      m.getCurrentWindow().setTheme(dark ? 'dark' : 'light');
    }).catch(() => {});
  }, [dark, mediaSize]);

  // Handle Drag & Drop globally via Tauri (Debounced to prevent Tauri's native double-fire bug on Windows)
  const lastDrop = useRef<number>(0);
  useEffect(() => {
    let unlisten: import('@tauri-apps/api/event').UnlistenFn | undefined;
    let isUnmounted = false;

    tauriClient.onDragDrop(async (paths, position) => {
      if (!paths || paths.length === 0) return;

      const now = Date.now();
      if (now - lastDrop.current < 250) return; // Suppress duplicate Tauri events
      lastDrop.current = now;
      
      let targetBin = (window as any)._binDropTarget;
      (window as any)._binDropTarget = undefined;

      if (targetBin === undefined && position) {
         const el = document.elementFromPoint(position.x, position.y);
         const btn = el?.closest('[data-bin-target]');
         if (btn) {
            targetBin = Number(btn.getAttribute('data-bin-target'));
         }
      }

      setStatus('Loading dragged files…');
      const found: FileItem[] = [];
      for (const p of paths) {
        const files = await tauriClient.enumeratePath(p);
        found.push(...files);
      }

      if (targetBin !== undefined) {
        // Direct bin append (last set tab behavior)
        let addedCount = 0;
        setBins((prevBins) => {
          const nextBins = [...prevBins];
          if (targetBin >= 0 && targetBin < nextBins.length) {
            const bin = { ...nextBins[targetBin], items: [...nextBins[targetBin].items] };
            let currentSize = bin.items.reduce((a, b) => a + b.item_size, 0);
            for (const f of found) {
              if (mediaSize > 0 && currentSize + f.item_size > mediaSize) continue;
              bin.items.push(f);
              currentSize += f.item_size;
              addedCount++;
            }
            bin.size = currentSize;
            nextBins[targetBin] = bin;
            
            setTimeout(() => {
              if (addedCount > 0) setStatus(`Appended ${addedCount} file(s) to Set ${targetBin + 1}`);
              else setStatus(`No files added (Target capacity reached)`);

              if (addedCount < found.length) {
                alert(`Target media capacity reached! ${found.length - addedCount} file(s) were skipped.`);
              }
            }, 0);
          }
          return nextBins;
        });
      } else {
        // Normal append to file list
        setItems((prev) => {
          const next = [...prev, ...found];
          const total = next.reduce((a, b) => a + b.item_size, 0);
          setStatus(`${next.length} items — ${formatBytes(total)}`);
          return next;
        });
      }
    }).then(fn => { 
      if (isUnmounted) fn(); 
      else unlisten = fn; 
    });

    return () => {
      isUnmounted = true;
      if (unlisten) unlisten();
    };
  }, [mediaSize]);

  // Close context menu on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtx(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Menu actions ──────────────────────────────────────────────────────────

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  const closeMenus = useCallback(() => {
    setFileMenuOpen(false);
    setHelpMenuOpen(false);
  }, []);

  useEffect(() => {
    const handler = () => closeMenus();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [closeMenus]);

  const handleNew = () => { setItems([]); setBins([]); setOversized([]); setStatus('Ready'); closeMenus(); };

  const handleAddFiles = async () => {
    closeMenus();
    const selected = await open({ multiple: true, directory: false });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    setStatus('Loading…');
    const found: FileItem[] = [];
    for (const p of paths) {
      const files = await tauriClient.enumeratePath(p);
      found.push(...files);
    }
    const next = [...items, ...found];
    setItems(next);
    const total = next.reduce((a, b) => a + b.item_size, 0);
    setStatus(`${next.length} items — ${formatBytes(total)}`);
  };

  const handleAddFolder = async () => {
    closeMenus();
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    const p = Array.isArray(selected) ? selected[0] : selected;
    setStatus('Scanning folder…');
    const files = await tauriClient.enumeratePath(p);
    const next = [...items, ...files];
    setItems(next);
    const total = next.reduce((a, b) => a + b.item_size, 0);
    setStatus(`${next.length} items — ${formatBytes(total)}`);
  };

  // ─── Pack ──────────────────────────────────────────────────────────────────

  const handlePack = useCallback(async () => {
    if (items.length === 0) { setStatus('Add files first.'); return; }
    if (!mediaSize || mediaSize <= 0) { setStatus('Please enter a valid media size.'); return; }
    try {
      const result = await tauriClient.packItems(items, mediaSize);
      setBins(result.bins);
      setOversized(result.oversized);
      const packedOutput = `Packed ${items.length} items (${formatBytes(items.reduce((a, b) => a + b.item_size, 0))}) into ${result.bins.length} set(s) [${result.oversized.length} oversized]`;
      setStatus(packedOutput);
    } catch (err) {
      setStatus(`Pack error: ${err}`);
    }
  }, [items, mediaSize]);

  // ─── Export ────────────────────────────────────────────────────────────────

  const allBins: { items: FileItem[]; label: string }[] = [
    ...bins.map((b, i) => ({ items: b.items, label: `Set ${i + 1}` })),
    ...(oversized.length > 0 ? [{ items: oversized, label: 'Oversized' }] : []),
  ];

  const handleExport = useCallback(async (setIdx: number, action: ExportAction) => {
    const binData = allBins[setIdx];
    if (!binData) return;
    const { items: binItems, label } = binData;
    setCtx(null);

    try {
      if (action === 'copy_to_folder' || action === 'move_to_folder') {
        const isMove = action === 'move_to_folder';
        const dir = await open({ directory: true, multiple: false, title: isMove ? 'Select Destination to MOVE to' : 'Select Destination Folder' });
        if (!dir) return;
        const dest = `${Array.isArray(dir) ? dir[0] : dir}\\${label}`;
        setStatus(isMove ? 'Moving files…' : 'Copying files…');

        const unlisten = await tauriClient.onExportProgress((payload) => {
          setStatus(`${isMove ? 'Moving' : 'Copying'}: ${payload}`);
        });
        try {
          await tauriClient.exportToFolder(binItems, dest, isMove);
          setStatus(isMove ? 'Move complete.' : 'Copy complete.');
        } finally { unlisten(); }

      } else if (action === 'export_dxp') {
        const filePath = await save({ title: 'Save CDBurnerXP Project', filters: [{ name: 'CDBurnerXP Project', extensions: ['dxp'] }], defaultPath: `${label}.dxp` });
        if (!filePath) return;
        setStatus('Exporting DXP…');
        await tauriClient.exportToDxp(binItems, filePath);
        setStatus('DXP export complete.');

      } else if (action === 'export_ibb') {
        const filePath = await save({ title: 'Save ImgBurn Project', filters: [{ name: 'ImgBurn Project', extensions: ['ibb'] }], defaultPath: `${label}.ibb` });
        if (!filePath) return;
        setStatus('Exporting IBB…');
        await tauriClient.exportToIbb(binItems, filePath);
        setStatus('IBB export complete.');

      } else if (action === 'export_txt') {
        const filePath = await save({ title: 'Save Text List', filters: [{ name: 'Text File', extensions: ['txt'] }], defaultPath: `${label}.txt` });
        if (!filePath) return;
        setStatus('Exporting text…');
        await tauriClient.exportToText(binItems, filePath);
        setStatus('Text export complete.');

      } else if (action === 'export_iso') {
        const filePath = await save({ title: 'Save ISO Image', filters: [{ name: 'ISO Image', extensions: ['iso'] }], defaultPath: `${label}.iso` });
        if (!filePath) return;
        const taskId = `iso-${Date.now()}`;
        setActiveTaskId(taskId);
        const unlisten = await tauriClient.onIsoProgress((payload) => {
          setStatus(`Generating ISO: ${payload}`);
        });
        try {
          await tauriClient.exportToIso(binItems, filePath, taskId);
          setStatus('ISO export complete.');
        } catch (e) {
          setStatus(`ISO export failed or cancelled.`);
        } finally { 
          unlisten();
          setActiveTaskId(null);
        }
      }
    } catch (err) {
      setStatus(`Export failed: ${err}`);
    }
  }, [allBins]);

  const handlePlugin = useCallback(async (setIdx: number, plugin: AppPlugin) => {
    const binData = allBins[setIdx];
    if (!binData) return;
    const { items: binItems } = binData;
    setCtx(null);
    setStatus(`Running plugin: ${plugin.name}…`);
    try {
      await tauriClient.runPlugin(plugin, binItems);
      setStatus(`Plugin ${plugin.name} finished successfully.`);
    } catch (err) {
      setStatus(`Plugin failed: ${err}`);
    }
  }, [allBins]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalBytes = items.reduce((a, b) => a + b.item_size, 0);

  return (
    <div className="app-shell" onClick={() => setCtx(null)}>
      <Titlebar />

      {/* ── Menu bar ── */}
      <nav className="menu-bar" onClick={(e) => e.stopPropagation()}>
        <div className="menu-item-wrapper">
          <button
            id="file-menu-btn"
            className={`menu-trigger${fileMenuOpen ? ' open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setHelpMenuOpen(false); setFileMenuOpen((v) => !v); }}
          >File</button>
          <div id="file-dropdown" className={`menu-dropdown${fileMenuOpen ? ' show' : ''}`}>
            <div className="menu-option" id="menu-new" onClick={handleNew}>New</div>
            <div className="menu-divider" />
            <div className="menu-option" id="menu-add-files" onClick={handleAddFiles}>Add Files…</div>
            <div className="menu-option" id="menu-add-folder" onClick={handleAddFolder}>Add Folder…</div>
            <div className="menu-divider" />
            <div className="menu-option" id="menu-exit" onClick={() => window.close()}>Exit</div>
          </div>
        </div>

        <div className="menu-item-wrapper">
          <button
            id="help-menu-btn"
            className={`menu-trigger${helpMenuOpen ? ' open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setFileMenuOpen(false); setHelpMenuOpen((v) => !v); }}
          >Help</button>
          <div id="help-dropdown" className={`menu-dropdown${helpMenuOpen ? ' show' : ''}`}>
            <div className="menu-option" id="menu-check-updates" onClick={() => { alert('You are on the latest version!'); closeMenus(); }}>Check for Updates</div>
            <div className="menu-divider" />
            <div className="menu-option" id="menu-about-author" onClick={() => { openUrl('https://github.com/PhiSYS'); closeMenus(); }}>About Author</div>
            <div className="menu-option" id="menu-about" onClick={() => { alert(`DiscFit ${version}\nConverted from C# → Electron → Tauri + React`); closeMenus(); }}>About DiscFit</div>
          </div>
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="main-area">
        {/* Left panel */}
        <div className="left-panel">
          <FileList
            items={items}
            onItemsChange={(next) => {
              setItems(next);
              const total = next.reduce((a, b) => a + b.item_size, 0);
              setStatus(`${next.length} items — ${formatBytes(total)}`);
            }}
            status={status}
            setStatus={setStatus}
          />
          <MediaControls
            mediaSize={mediaSize}
            setMediaSize={setMediaSize}
            dark={dark}
            setDark={setDark}
            onPack={handlePack}
            totalItems={items.length}
            totalBytes={totalBytes}
          />
        </div>

        {/* Right panel — Bins */}
        <div className="right-panel">
          <BinsViewer
            bins={bins}
            oversized={oversized}
            targetSize={mediaSize}
            onContextMenu={setCtx}
            onItemContextMenu={(x, y, setIdx, itemIdx) => setCtx({ x, y, setIdx, itemIdx })}
            onRemoveItem={(binIdx, itemIdx) => {
              if (binIdx >= bins.length) {
                const newOver = [...oversized];
                newOver.splice(itemIdx, 1);
                setOversized(newOver);
              } else {
                const newBins = [...bins];
                const removed = newBins[binIdx].items.splice(itemIdx, 1)[0];
                if (removed) newBins[binIdx].size -= removed.item_size;
                setBins(newBins);
              }
            }}
          />
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="status-bar" id="status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span id="status-text">{status}</span>
        {activeTaskId && (
          <button 
            className="pack-btn" 
            style={{ padding: '2px 8px', fontSize: '11px', background: '#d11' }}
            onClick={() => {
              if (activeTaskId) tauriClient.cancelTask(activeTaskId);
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* ── Context menu (portal) ── */}
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          setIdx={ctx.setIdx}
          itemIdx={ctx.itemIdx}
          plugins={plugins}
          onAction={handleExport}
          onPlugin={handlePlugin}
          onClose={() => setCtx(null)}
          onRemoveItem={(setIdx, itemIdx) => {
            if (setIdx >= bins.length) {
              const newOver = [...oversized];
              newOver.splice(itemIdx, 1);
              setOversized(newOver);
            } else {
              const newBins = [...bins];
              const removed = newBins[setIdx].items.splice(itemIdx, 1)[0];
              if (removed) newBins[setIdx].size -= removed.item_size;
              setBins(newBins);
            }
          }}
        />
      )}
    </div>
  );
}
