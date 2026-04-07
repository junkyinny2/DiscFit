import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Cache strictly by extension EXCEPT for `.exe` / `.ico` which have file-specific icons
const iconCache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

async function fetchNativeIcon(path: string): Promise<string | null> {
  const extMatch = path.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  const isSpecific = ['exe', 'ico'].includes(ext);
  const cacheKey = isSpecific ? path : ext;

  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;
  if (pending.has(cacheKey)) return pending.get(cacheKey)!;

  const promise = invoke<string | null>('get_file_icon_base64', { path })
    .then((res) => {
      iconCache.set(cacheKey, res);
      pending.delete(cacheKey);
      return res;
    }).catch(() => null);
  
  pending.set(cacheKey, promise);
  return promise;
}

export const NativeIcon: React.FC<{ path: string }> = ({ path }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchNativeIcon(path).then((res) => {
      if (mounted && res) setSrc(res);
    });
    return () => {
      mounted = false;
    };
  }, [path]);

  if (!src) return <div className="file-row__icon">📄</div>;
  return <img src={src} alt="icon" className="file-row__icon" style={{ objectFit: 'contain' }} />;
};
