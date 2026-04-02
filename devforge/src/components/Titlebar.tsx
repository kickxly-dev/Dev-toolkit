import { Minus, Square, X } from 'lucide-react';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

async function minimizeWindow() {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().minimize();
}

async function toggleMaximize() {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().toggleMaximize();
}

async function closeWindow() {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  getCurrentWindow().close();
}

export default function Titlebar() {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-11 bg-bg-primary border-b border-border-subtle select-none shrink-0"
    >
      <div data-tauri-drag-region className="flex items-center gap-2.5 pl-4">
        <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
          <svg viewBox="0 0 32 32" fill="none" className="w-3 h-3">
            <path
              d="M9 8h5.5l-1.5 7h3l-6 9 1.5-6H9l2-10zm8 0h5.5l-1.5 7h3l-6 9 1.5-6H17l2-10z"
              fill="white"
              opacity="0.95"
            />
          </svg>
        </div>
        <span data-tauri-drag-region className="text-xs font-semibold tracking-wide text-text-secondary">
          DevForge
        </span>
      </div>
      <div className="flex items-center h-full">
        <button
          onClick={minimizeWindow}
          className="h-full px-3.5 flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={toggleMaximize}
          className="h-full px-3.5 flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={closeWindow}
          className="h-full px-3.5 flex items-center justify-center text-text-tertiary hover:text-white hover:bg-danger transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
