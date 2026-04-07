import React, { useRef, useEffect } from 'react';
import { ExportAction, AppPlugin } from '../types';

interface Props {
  x: number;
  y: number;
  setIdx: number;
  plugins: AppPlugin[];
  itemIdx?: number;
  onAction: (setIdx: number, action: ExportAction) => void;
  onPlugin: (setIdx: number, plugin: AppPlugin) => void;
  onClose: () => void;
  onRemoveItem?: (setIdx: number, itemIdx: number) => void;
}

const ITEMS: { label: string; action: ExportAction; dividerBefore?: boolean }[] = [
  { label: 'Copy Set to Folder', action: 'copy_to_folder' },
  { label: 'Move Set to Folder', action: 'move_to_folder' },
  { label: 'Export to CDBurnerXP (.dxp)', action: 'export_dxp', dividerBefore: true },
  { label: 'Export to ImgBurn (.ibb)', action: 'export_ibb' },
  { label: 'Export to Text (.txt)', action: 'export_txt' },
  { label: 'Save Set as ISO (.iso)', action: 'export_iso', dividerBefore: true },
];

export const ContextMenu: React.FC<Props> = ({ x, y, setIdx, itemIdx, plugins, onAction, onPlugin, onClose, onRemoveItem }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const isFileMenu = itemIdx !== undefined;
  
  // Keep menu inside viewport
  const style: React.CSSProperties = { top: y, left: x };
  if (typeof window !== 'undefined') {
    if (x + 210 > window.innerWidth) style.left = window.innerWidth - 215;
    if (y + (isFileMenu ? 34 : ITEMS.length * 34) > window.innerHeight)
      style.top = window.innerHeight - (isFileMenu ? 34 : ITEMS.length * 34) - 8;
  }

  if (isFileMenu) {
    return (
      <div className="ctx-menu" style={style} ref={ref}>
        <div
          className="ctx-menu-item"
          style={{ color: '#ff5c5c' }}
          onMouseDown={(e) => {
            e.preventDefault();
            if (onRemoveItem) onRemoveItem(setIdx, itemIdx!);
            onClose();
          }}
        >
          Remove File from Set
        </div>
      </div>
    );
  }

  return (
    <div className="ctx-menu" style={style} ref={ref}>
      {ITEMS.map((item) => (
        <React.Fragment key={item.action}>
          {item.dividerBefore && <div className="ctx-menu-divider" />}
          <div
            className="ctx-menu-item"
            onMouseDown={(e) => {
              e.preventDefault();
              onAction(setIdx, item.action);
              onClose();
            }}
          >
            {item.label}
          </div>
        </React.Fragment>
      ))}
      {plugins.length > 0 && (
        <>
          <div className="ctx-menu-divider" />
          <div className="ctx-menu-header" style={{ padding: '4px 14px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>External Exporters</div>
          {plugins.map((p) => (
            <div
              key={p.name}
              className="ctx-menu-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onPlugin(setIdx, p);
                onClose();
              }}
              title={p.description}
            >
              {p.name}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
