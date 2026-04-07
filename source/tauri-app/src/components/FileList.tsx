import React, { useCallback } from 'react';
import { FileItem, formatBytes } from '../types';
import { NativeIcon } from './NativeIcon';
interface Props {
  items: FileItem[];
  onItemsChange: (items: FileItem[]) => void;
  status: string;
  setStatus: (s: string) => void;
}


export const FileList: React.FC<Props> = ({ items, onItemsChange, setStatus }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      // Actual file processing is handled globally via Tauri onDragDrop in App.tsx
    },
    []
  );

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onItemsChange(next);
    const total = next.reduce((a, b) => a + b.item_size, 0);
    setStatus(`${next.length} items — ${formatBytes(total)}`);
  };

  return (
    <div
      className={`file-list${isDragOver ? ' drag-over' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      {items.length === 0 ? (
        <div className="drop-placeholder">Drag files or folders here</div>
      ) : (
        items.map((item, idx) => (
          <div
            key={`${item.item_path}-${idx}`}
            className="file-row selectable"
            tabIndex={0}
            draggable={true}
            onDragStart={(e) => {
              // Convert path to file URL (using / strictly for the protocol hack)
              const fileUrl = `file:///${item.item_path.replace(/\\/g, '/')}`;
              const fileName = item.item_path.split(/[\\/]/).pop() || 'file';
              e.dataTransfer.setData('DownloadURL', `application/octet-stream:${fileName}:${fileUrl}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Delete') {
                if (window.confirm(`Remove "${item.display_path}" from list?`)) removeItem(idx);
              }
            }}
            title={`Name: ${item.display_path}\nPath: ${item.item_path}\nSize: ${formatBytes(item.item_size)}`}
            onDoubleClick={() => {
              if (window.confirm(`Remove "${item.display_path}" from list?`)) removeItem(idx);
            }}
          >
            <NativeIcon path={item.item_path} />
            <div className="file-row__details">
              <div className="file-row__name">{item.display_path}</div>
              <div className="file-row__path">{item.item_path}</div>
              <div className="file-row__size">{formatBytes(item.item_size)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
