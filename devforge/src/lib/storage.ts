// Local JSON file storage using Tauri fs APIs
// Falls back to localStorage for dev mode in browser

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

async function getTauriFs() {
  const fs = await import('@tauri-apps/plugin-fs');
  const path = await import('@tauri-apps/api/path');
  return { fs, path };
}

async function ensureDir(dirPath: string) {
  const { fs } = await getTauriFs();
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {
    // dir already exists
  }
}

async function getDataPath(filename: string): Promise<string> {
  const { path } = await getTauriFs();
  const appData = await path.appDataDir();
  await ensureDir(appData);
  return `${appData}${filename}`;
}

export async function loadData<T>(filename: string, defaultValue: T): Promise<T> {
  if (!isTauri()) {
    const stored = localStorage.getItem(`devforge:${filename}`);
    return stored ? JSON.parse(stored) : defaultValue;
  }

  try {
    const { fs } = await getTauriFs();
    const filePath = await getDataPath(filename);
    const content = await fs.readTextFile(filePath);
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

export async function saveData<T>(filename: string, data: T): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(`devforge:${filename}`, JSON.stringify(data));
    return;
  }

  try {
    const { fs } = await getTauriFs();
    const filePath = await getDataPath(filename);
    await fs.writeTextFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to save ${filename}:`, err);
  }
}
