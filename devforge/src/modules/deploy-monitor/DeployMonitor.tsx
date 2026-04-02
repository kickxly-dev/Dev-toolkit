import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Circle } from 'lucide-react';
import { loadData, saveData } from '../../lib/storage';
import type { DeployProject, PingEntry } from '../../types';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

async function pingUrl(url: string): Promise<PingEntry> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const result: any = await invoke('ping_url', { url });
    return {
      timestamp: result.timestamp * 1000,
      status: result.status as 'online' | 'offline' | 'degraded',
      responseTime: result.response_time,
      statusCode: result.status_code,
    };
  }
  // Browser fallback
  const start = Date.now();
  try {
    const resp = await fetch(url, { mode: 'no-cors' });
    return {
      timestamp: Date.now(),
      status: 'online',
      responseTime: Date.now() - start,
      statusCode: resp.status || 200,
    };
  } catch {
    return {
      timestamp: Date.now(),
      status: 'offline',
      responseTime: Date.now() - start,
      statusCode: 0,
    };
  }
}

const statusColors = {
  online: 'text-success',
  offline: 'text-danger',
  degraded: 'text-warning',
  unknown: 'text-text-tertiary',
};

const statusBgColors = {
  online: 'bg-success/10',
  offline: 'bg-danger/10',
  degraded: 'bg-warning/10',
  unknown: 'bg-white/5',
};

export default function DeployMonitor() {
  const [projects, setProjects] = useState<DeployProject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newInterval, setNewInterval] = useState(60);
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    loadData<DeployProject[]>('deploys.json', []).then(setProjects);
  }, []);

  useEffect(() => {
    saveData('deploys.json', projects);
  }, [projects]);

  const checkProject = useCallback(async (project: DeployProject) => {
    const entry = await pingUrl(project.url);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              status: entry.status,
              responseTime: entry.responseTime,
              lastChecked: entry.timestamp,
              history: [...p.history.slice(-99), entry],
            }
          : p
      )
    );
  }, []);

  useEffect(() => {
    // Set up intervals for each project
    const currentIntervals = intervalsRef.current;
    projects.forEach((project) => {
      if (!currentIntervals[project.id]) {
        // Initial check
        checkProject(project);
        currentIntervals[project.id] = setInterval(
          () => checkProject(project),
          project.interval * 1000
        );
      }
    });

    // Clean up removed projects
    Object.keys(currentIntervals).forEach((id) => {
      if (!projects.find((p) => p.id === id)) {
        clearInterval(currentIntervals[id]);
        delete currentIntervals[id];
      }
    });

    return () => {
      Object.values(currentIntervals).forEach(clearInterval);
      intervalsRef.current = {};
    };
  }, [projects.length, checkProject]);

  const addProject = () => {
    if (!newName || !newUrl) return;
    const project: DeployProject = {
      id: generateId(),
      name: newName,
      url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
      interval: newInterval,
      status: 'unknown',
      responseTime: 0,
      lastChecked: 0,
      history: [],
    };
    setProjects((prev) => [...prev, project]);
    setNewName('');
    setNewUrl('');
    setShowAdd(false);
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const refreshProject = (project: DeployProject) => {
    checkProject(project);
  };

  const formatTime = (ts: number) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleTimeString();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div>
          <h1 className="text-lg font-semibold">Deploy Monitor</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Track uptime and response times for your deployments
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Project
        </button>
      </div>

      {showAdd && (
        <div className="px-6 py-4 bg-bg-tertiary border-b border-border-subtle">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My App"
                className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                URL
              </label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://myapp.vercel.app"
                className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="w-28">
              <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                Interval (s)
              </label>
              <input
                type="number"
                value={newInterval}
                onChange={(e) => setNewInterval(Number(e.target.value))}
                min={10}
                className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addProject}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <Activity size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No projects being monitored</p>
            <p className="text-xs mt-1">Add a project to start tracking uptime</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-bg-secondary border border-border-subtle rounded-xl p-4 hover:border-border-default transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Circle
                      size={10}
                      fill="currentColor"
                      className={statusColors[project.status]}
                    />
                    <div>
                      <h3 className="text-sm font-medium">{project.name}</h3>
                      <p className="text-xs text-text-tertiary font-mono">{project.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${statusBgColors[project.status]} ${statusColors[project.status]}`}
                    >
                      {project.status}
                    </span>
                    <button
                      onClick={() => refreshProject(project)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-colors"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => removeProject(project.id)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs text-text-secondary">
                  <span>
                    Response:{' '}
                    <span className="text-text-primary font-mono">{project.responseTime}ms</span>
                  </span>
                  <span>
                    Last checked:{' '}
                    <span className="text-text-primary">{formatTime(project.lastChecked)}</span>
                  </span>
                  <span>
                    Checks:{' '}
                    <span className="text-text-primary font-mono">{project.history.length}</span>
                  </span>
                </div>
                {/* Uptime timeline */}
                {project.history.length > 0 && (
                  <div className="mt-3 flex gap-px">
                    {project.history.slice(-50).map((entry, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-6 rounded-sm ${
                          entry.status === 'online'
                            ? 'bg-success/40'
                            : entry.status === 'degraded'
                              ? 'bg-warning/40'
                              : 'bg-danger/40'
                        }`}
                        title={`${new Date(entry.timestamp).toLocaleString()} - ${entry.status} (${entry.responseTime}ms)`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Activity(props: { size: number; className?: string }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
