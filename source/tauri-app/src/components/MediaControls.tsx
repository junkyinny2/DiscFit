import React from 'react';
import { MEDIA_PRESETS, formatBytes } from '../types';

interface Props {
  mediaSize: number;
  setMediaSize: (n: number) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  onPack: () => void;
  totalItems: number;
  totalBytes: number;
}

export const MediaControls: React.FC<Props> = ({
  mediaSize,
  setMediaSize,
  dark,
  setDark,
  onPack,
  totalItems,
  totalBytes,
}) => {
  const [selected, setSelected] = React.useState<number | 'custom'>(737280000);

  const handlePreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setSelected('custom');
    } else {
      const n = Number(val);
      setSelected(n);
      setMediaSize(n);
    }
  };

  return (
    <fieldset className="media-group">
      <legend>Target Media</legend>
      <div className="media-controls">
        <label>Media Type</label>
        <select value={selected === 'custom' ? 'custom' : String(selected)} onChange={handlePreset}>
          {MEDIA_PRESETS.map((p) => (
            <option key={String(p.value)} value={String(p.value)}>
              {p.label}
            </option>
          ))}
        </select>

        <label htmlFor="media-size-input">Size (Bytes):</label>
        <input
          id="media-size-input"
          type="number"
          value={mediaSize}
          disabled={selected !== 'custom'}
          onChange={(e) => setMediaSize(Number(e.target.value))}
        />

        <div className="pack-row">
          <label className="dark-toggle">
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
            />
            Dark Mode
          </label>
          <button
            className="pack-btn"
            onClick={onPack}
            disabled={totalItems === 0}
            title={`Pack ${totalItems} items (${formatBytes(totalBytes)})`}
          >
            Pack
          </button>
        </div>
      </div>
    </fieldset>
  );
};
