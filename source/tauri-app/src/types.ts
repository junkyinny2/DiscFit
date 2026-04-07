export interface FileItem {
  display_path: string;  // relative path shown in UI
  item_path: string;     // absolute path on disk
  item_size: number;     // bytes
}

export interface Bin {
  size: number;
  items: FileItem[];
}

export interface PackResult {
  bins: Bin[];
  oversized: FileItem[];
}

export interface AppPlugin {
  name: string;
  executable: string;
  args?: string[];
  description?: string;
}

export type ExportAction =
  | 'copy_to_folder'
  | 'move_to_folder'
  | 'export_dxp'
  | 'export_ibb'
  | 'export_txt'
  | 'export_iso';

export const MEDIA_PRESETS: { label: string; value: number | 'custom' }[] = [
  { label: 'CD-R 700 MB', value: 737280000 },
  { label: 'CD-R 700 MB (overburn)', value: 749731840 },
  { label: 'DVD+R', value: 4700372992 },
  { label: 'DVD-R', value: 4707319808 },
  { label: 'DVD-R DL', value: 8543666176 },
  { label: 'DVD+R DL', value: 8547991552 },
  { label: 'BD-R', value: 25025314816 },
  { label: 'BD-R DL', value: 50050629632 },
  { label: 'Custom', value: 'custom' },
];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + ' ' + sizes[i];
}
