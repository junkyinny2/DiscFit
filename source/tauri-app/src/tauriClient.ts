import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { FileItem, PackResult, AppPlugin } from './types';

export const tauriClient = {
  // ... existing methods unchanged ...
  packItems: (items: FileItem[], maxSize: number): Promise<PackResult> => 
    invoke('pack_items', { items, maxSize }),
    
  enumeratePath: (path: string): Promise<FileItem[]> => 
    invoke('enumerate_path', { path }),
    
  exportToFolder: (items: FileItem[], outputFolder: string, isMove: boolean): Promise<void> => 
    invoke('export_to_folder', { items, outputFolder, isMove }),
    
  exportToDxp: (items: FileItem[], outputFile: string): Promise<void> => 
    invoke('export_to_dxp', { items, outputFile }),
    
  exportToIbb: (items: FileItem[], outputFile: string): Promise<void> => 
    invoke('export_to_ibb', { items, outputFile }),
    
  exportToText: (items: FileItem[], outputFile: string): Promise<void> => 
    invoke('export_to_text', { items, outputFile }),
    
  exportToIso: (items: FileItem[], outputFile: string, taskId: string): Promise<void> => 
    invoke('export_to_iso', { items, outputFile, taskId }),

  cancelTask: (taskId: string): Promise<void> =>
    invoke('cancel_task', { id: taskId }),

  loadSettings: (): Promise<{ dark_mode: boolean; media_size: number }> =>
    invoke('load_settings'),

  saveSettings: (settings: { dark_mode: boolean; media_size: number }): Promise<void> =>
    invoke('save_settings', { settings }),

  getAppVersion: (): Promise<string> =>
    invoke('get_app_version'),

  getPlugins: (): Promise<AppPlugin[]> =>
    invoke('get_plugins'),

  runPlugin: (plugin: AppPlugin, items: FileItem[]): Promise<void> =>
    invoke('run_plugin', { plugin, items }),

  onExportProgress: (callback: (progress: string) => void): Promise<UnlistenFn> => 
    listen<string>('export_progress', (e) => callback(e.payload)),
    
  onIsoProgress: (callback: (progress: string) => void): Promise<UnlistenFn> => 
    listen<string>('iso_progress', (e) => callback(e.payload)),

  onDragDrop: (callback: (paths: string[], position?: { x: number; y: number }) => void): Promise<UnlistenFn> => 
    getCurrentWebviewWindow().onDragDropEvent((event: any) => {
      if (event.payload.type === 'drop') {
        callback(event.payload.paths, event.payload.position);
      }
    }),
};
