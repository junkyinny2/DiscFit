import React from 'react';
import { Bin, FileItem, formatBytes } from '../types';
import { NativeIcon } from './NativeIcon';

interface CtxTarget {
  x: number;
  y: number;
  setIdx: number;
}

interface Props {
  bins: Bin[];
  oversized: FileItem[];
  targetSize: number;
  onContextMenu: (target: CtxTarget) => void;
  onItemContextMenu: (x: number, y: number, setIdx: number, itemIdx: number) => void;
  onRemoveItem?: (binIdx: number, itemIdx: number) => void;
}

export const BinsViewer: React.FC<Props> = ({ bins, oversized, targetSize, onContextMenu, onItemContextMenu, onRemoveItem }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const allTabs: { label: string; bin: Bin }[] = [
    ...bins.map((b, i) => ({ label: `Set ${i + 1}`, bin: b })),
    ...(oversized.length > 0
      ? [{ label: 'Oversized', bin: { size: oversized.reduce((a, b) => a + b.item_size, 0), items: oversized } }]
      : []),
  ];

  const tabsRef = React.useRef<HTMLDivElement>(null);

  if (allTabs.length === 0) {
    return (
      <div className="bins-wrapper">
        <div className="drop-placeholder" style={{ position: 'relative' }}>
          No sets — add files and click Pack
        </div>
      </div>
    );
  }

  const activeSafeTab = Math.min(activeTab, allTabs.length - 1);
  const current = allTabs[activeSafeTab];
  const isOversized = activeSafeTab >= bins.length;

  const pct = isOversized || targetSize === 0 ? null :
    ((current.bin.size / targetSize) * 100).toFixed(1);

  const tooltip = isOversized
    ? `Total: ${formatBytes(current.bin.size)}`
    : `${formatBytes(current.bin.size)} / ${formatBytes(targetSize)}${pct ? ` (${pct}%)` : ''}`;

  const handleCtx = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    onContextMenu({ x: e.clientX, y: e.clientY, setIdx: idx });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };


  const scrollTabs = (offset: number) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: offset });
  };

  return (
    <div className="bins-wrapper">
      <div className="tabs-row-container">
        <button className="tabs-nav-btn" onClick={() => scrollTabs(-150)}>‹</button>
        <div className="tabs-row" onWheel={handleWheel} ref={tabsRef}>
        {allTabs.map((tab, i) => {
          const binSize = tab.bin.size;
          const over = !isOversized && targetSize > 0 && binSize > targetSize;
          const tabPct = targetSize > 0 && i < bins.length
            ? ((binSize / targetSize) * 100).toFixed(0) + '%'
            : '';
          return (
            <button
              key={tab.label}
              className={`tab-btn${activeSafeTab === i ? ' active' : ''}`}
              style={over ? { color: '#e44' } : undefined}
              title={`${formatBytes(binSize)}${targetSize > 0 && i < bins.length ? ' / ' + formatBytes(targetSize) + (tabPct ? ' (' + tabPct + ')' : '') : ''}`}
              data-bin-target={i}
              onClick={() => setActiveTab(i)}
              onContextMenu={(e) => handleCtx(e, i)}
              onDragEnter={(e) => { e.preventDefault(); }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                (window as any)._binDropTarget = i;
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                (window as any)._binDropTarget = undefined;
              }}
              onDrop={(e) => {
                e.preventDefault();
                (window as any)._binDropTarget = i;
              }}
            >
              {tab.label}
            </button>
          );
        })}
        </div>
        <button className="tabs-nav-btn" onClick={() => scrollTabs(150)}>›</button>
      </div>

      <div
        className={`tab-content${isDragOver ? ' drag-over' : ''}`}
        data-bin-target={activeSafeTab}
        style={isDragOver ? { background: 'var(--drag-over-bg)', border: '2px dashed var(--drag-over-border)' } : {}}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsDragOver(true);
          (window as any)._binDropTarget = activeSafeTab;
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          (window as any)._binDropTarget = undefined;
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          (window as any)._binDropTarget = activeSafeTab;
        }}
        title={tooltip}
      >
        {current.bin.items.map((item, idx) => (
          <div
            key={`${item.item_path}-${idx}`}
            className="file-row selectable"
            tabIndex={0}
            draggable={true}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onItemContextMenu(e.clientX, e.clientY, activeSafeTab, idx);
            }}
            onDragStart={(e) => {
              const fileUrl = `file:///${item.item_path.replace(/\\/g, '/')}`;
              const fileName = item.item_path.split(/[\\/]/).pop() || 'file';
              e.dataTransfer.setData('DownloadURL', `application/octet-stream:${fileName}:${fileUrl}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Delete' && onRemoveItem) {
                if (window.confirm(`Remove "${item.display_path}"?`)) {
                   onRemoveItem(activeSafeTab, idx);
                }
              }
            }}
            title={`Name: ${item.display_path}\nPath: ${item.item_path}\nSize: ${formatBytes(item.item_size)}`}
          >
            <NativeIcon path={item.item_path} />
            <div className="file-row__details">
              <div className="file-row__name">{item.display_path}</div>
              <div className="file-row__path">{item.item_path}</div>
              <div className="file-row__size">{formatBytes(item.item_size)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
