import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { exit } from '@tauri-apps/plugin-process';

export const Titlebar: React.FC = () => {
  const appWindow = getCurrentWindow();

  return (
    <div
      className="custom-titlebar"
      onPointerDown={(e) => {
        // Prevent drag initialization when clicking the control buttons
        if ((e.target as HTMLElement).closest('.titlebar-button')) return;
        appWindow.startDragging().catch(err => alert("Drag Error: " + String(err)));
      }}
    >
      <div className="titlebar-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--accent)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
      </div>
      <div className="titlebar-text">
        DiscFit
      </div>
      <div className="titlebar-controls">
        <div className="titlebar-button" onClick={() => appWindow.minimize().catch(err => alert("Min Error: " + String(err)))}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M0,4h10v1H0V4z"/></svg>
        </div>
        <div className="titlebar-button" onClick={() => appWindow.toggleMaximize().catch(err => alert("Max Error: " + String(err)))}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path fill="currentColor" d="M1,1v8h8V1H1z M8,8H2V2h6V8z"/></svg>
        </div>
        <div className="titlebar-button titlebar-close" onClick={() => exit(0)}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 1l8 8m0-8L1 9"/></svg>
        </div>
      </div>
    </div>
  );
};
