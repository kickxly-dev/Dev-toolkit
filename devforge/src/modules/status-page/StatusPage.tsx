import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, RefreshCw } from 'lucide-react';
import { loadData, saveData } from '../../lib/storage';
import type { StatusPageConfig, StatusEndpoint, Incident } from '../../types';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const statusColors = {
  operational: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-danger',
  unknown: 'bg-text-tertiary',
};

const statusLabels = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  down: 'Major Outage',
  unknown: 'Unknown',
};

export default function StatusPage() {
  const [config, setConfig] = useState<StatusPageConfig>({
    id: 'default',
    name: '',
    description: '',
    endpoints: [],
    incidents: [],
  });
  const [showAddEndpoint, setShowAddEndpoint] = useState(false);
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newIncidentTitle, setNewIncidentTitle] = useState('');
  const [newIncidentDesc, setNewIncidentDesc] = useState('');
  const [newIncidentStatus, setNewIncidentStatus] = useState<Incident['status']>('investigating');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadData<StatusPageConfig>('status-page.json', config).then((data) => {
      if (data.name) setConfig(data);
    });
  }, []);

  useEffect(() => {
    if (config.name) {
      saveData('status-page.json', config);
    }
  }, [config]);

  const addEndpoint = () => {
    if (!newEndpointName || !newEndpointUrl) return;
    const endpoint: StatusEndpoint = {
      id: generateId(),
      name: newEndpointName,
      url: newEndpointUrl.startsWith('http') ? newEndpointUrl : `https://${newEndpointUrl}`,
      status: 'unknown',
      uptime: 100,
    };
    setConfig((prev) => ({ ...prev, endpoints: [...prev.endpoints, endpoint] }));
    setNewEndpointName('');
    setNewEndpointUrl('');
    setShowAddEndpoint(false);
  };

  const removeEndpoint = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      endpoints: prev.endpoints.filter((e) => e.id !== id),
    }));
  };

  const addIncident = () => {
    if (!newIncidentTitle) return;
    const incident: Incident = {
      id: generateId(),
      title: newIncidentTitle,
      description: newIncidentDesc,
      status: newIncidentStatus,
      timestamp: Date.now(),
    };
    setConfig((prev) => ({ ...prev, incidents: [incident, ...prev.incidents] }));
    setNewIncidentTitle('');
    setNewIncidentDesc('');
    setShowAddIncident(false);
  };

  const removeIncident = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      incidents: prev.incidents.filter((i) => i.id !== id),
    }));
  };

  const checkEndpoints = async () => {
    setChecking(true);
    const updated = await Promise.all(
      config.endpoints.map(async (ep) => {
        try {
          let status: StatusEndpoint['status'] = 'unknown';
          if (isTauri()) {
            const { invoke } = await import('@tauri-apps/api/core');
            const result: any = await invoke('ping_url', { url: ep.url });
            status = result.status === 'online' ? 'operational' : result.status === 'degraded' ? 'degraded' : 'down';
          } else {
            await fetch(ep.url, { mode: 'no-cors' });
            status = 'operational';
          }
          return { ...ep, status };
        } catch {
          return { ...ep, status: 'down' as const };
        }
      })
    );
    setConfig((prev) => ({ ...prev, endpoints: updated }));
    setChecking(false);
  };

  const overallStatus = () => {
    if (config.endpoints.length === 0) return 'unknown';
    if (config.endpoints.every((e) => e.status === 'operational')) return 'operational';
    if (config.endpoints.some((e) => e.status === 'down')) return 'down';
    return 'degraded';
  };

  const generateHtml = () => {
    const overall = overallStatus();
    const overallLabel = statusLabels[overall] || 'Unknown';
    const overallColor = overall === 'operational' ? '#22c55e' : overall === 'degraded' ? '#eab308' : overall === 'down' ? '#ef4444' : '#888';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.name || 'Status Page'} - Status</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;padding:40px 20px}
.container{max-width:720px;margin:0 auto}
h1{font-size:24px;font-weight:700;margin-bottom:4px}
.description{color:#888;font-size:14px;margin-bottom:32px}
.overall{padding:20px;border-radius:12px;border:1px solid #222;margin-bottom:32px;display:flex;align-items:center;gap:12px}
.dot{width:12px;height:12px;border-radius:50%}
.overall-label{font-size:16px;font-weight:600}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#555;font-weight:600;margin-bottom:12px}
.endpoint{padding:16px;border:1px solid #1a1a1a;border-radius:10px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}
.ep-name{font-size:14px;font-weight:500}
.ep-status{font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
.incident{padding:16px;border:1px solid #1a1a1a;border-radius:10px;margin-bottom:8px}
.incident-title{font-size:14px;font-weight:600;margin-bottom:4px}
.incident-meta{font-size:12px;color:#888;display:flex;gap:12px}
.incident-desc{font-size:13px;color:#aaa;margin-top:8px}
.footer{text-align:center;color:#555;font-size:11px;margin-top:48px;padding-top:24px;border-top:1px solid #1a1a1a}
.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
</style>
</head>
<body>
<div class="container">
<h1>${config.name || 'Status'}</h1>
<p class="description">${config.description || 'Current system status'}</p>
<div class="overall" style="background:${overallColor}10;border-color:${overallColor}30">
<div class="dot" style="background:${overallColor}"></div>
<span class="overall-label" style="color:${overallColor}">${overallLabel}</span>
</div>
<div class="section-title">Services</div>
${config.endpoints.map((ep) => {
  const c = ep.status === 'operational' ? '#22c55e' : ep.status === 'degraded' ? '#eab308' : ep.status === 'down' ? '#ef4444' : '#888';
  return `<div class="endpoint"><span class="ep-name">${ep.name}</span><span class="ep-status"><span class="dot" style="background:${c};width:8px;height:8px"></span><span style="color:${c}">${statusLabels[ep.status] || 'Unknown'}</span></span></div>`;
}).join('\n')}
${config.incidents.length > 0 ? `
<div class="section-title" style="margin-top:32px">Incidents</div>
${config.incidents.map((inc) => `<div class="incident">
<div class="incident-title">${inc.title}</div>
<div class="incident-meta"><span class="badge" style="background:#3b82f610;color:#3b82f6">${inc.status}</span><span>${new Date(inc.timestamp).toLocaleString()}</span></div>
${inc.description ? `<div class="incident-desc">${inc.description}</div>` : ''}
</div>`).join('\n')}` : ''}
<div class="footer">Generated by DevForge &middot; ${new Date().toLocaleDateString()}</div>
</div>
</body>
</html>`;
  };

  const exportHtml = async () => {
    const html = generateHtml();

    if (isTauri()) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const path = await save({
          filters: [{ name: 'HTML', extensions: ['html'] }],
          defaultPath: `${config.name || 'status'}-page.html`,
        });
        if (path) {
          await writeTextFile(path, html);
        }
      } catch (err) {
        console.error('Export failed:', err);
      }
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.name || 'status'}-page.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <div>
          <h1 className="text-lg font-semibold">Status Page Generator</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Create and export a status page for your services
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkEndpoints}
            disabled={checking || config.endpoints.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-text-secondary text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            Check All
          </button>
          <button
            onClick={exportHtml}
            disabled={!config.name}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Download size={13} />
            Export HTML
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Page config */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                Page Name
              </label>
              <input
                value={config.name}
                onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="My Project Status"
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                Description
              </label>
              <input
                value={config.description}
                onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Current system status and uptime"
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Overall status */}
          {config.endpoints.length > 0 && (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${
                overallStatus() === 'operational'
                  ? 'bg-success/5 border-success/20'
                  : overallStatus() === 'degraded'
                    ? 'bg-warning/5 border-warning/20'
                    : overallStatus() === 'down'
                      ? 'bg-danger/5 border-danger/20'
                      : 'bg-white/5 border-border-default'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${statusColors[overallStatus()]}`}
              />
              <span className="text-sm font-medium">{statusLabels[overallStatus()]}</span>
            </div>
          )}
        </div>

        {/* Endpoints */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
              Endpoints
            </span>
            <button
              onClick={() => setShowAddEndpoint(true)}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {showAddEndpoint && (
            <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 mb-3">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Service Name
                  </label>
                  <input
                    value={newEndpointName}
                    onChange={(e) => setNewEndpointName(e.target.value)}
                    placeholder="API Server"
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    URL
                  </label>
                  <input
                    value={newEndpointUrl}
                    onChange={(e) => setNewEndpointUrl(e.target.value)}
                    placeholder="https://api.example.com/health"
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addEndpoint}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddEndpoint(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {config.endpoints.map((ep) => (
              <div
                key={ep.id}
                className="flex items-center justify-between px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusColors[ep.status]}`} />
                  <div>
                    <p className="text-sm font-medium">{ep.name}</p>
                    <p className="text-xs text-text-tertiary font-mono">{ep.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">
                    {statusLabels[ep.status]}
                  </span>
                  <button
                    onClick={() => removeEndpoint(ep.id)}
                    className="p-1 rounded text-text-tertiary hover:text-danger transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {config.endpoints.length === 0 && (
              <div className="text-center py-8 text-text-tertiary text-sm">
                No endpoints added yet
              </div>
            )}
          </div>
        </div>

        {/* Incidents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
              Incidents
            </span>
            <button
              onClick={() => setShowAddIncident(true)}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {showAddIncident && (
            <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 mb-3">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                      Title
                    </label>
                    <input
                      value={newIncidentTitle}
                      onChange={(e) => setNewIncidentTitle(e.target.value)}
                      placeholder="API Degraded Performance"
                      className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div className="w-44">
                    <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                      Status
                    </label>
                    <select
                      value={newIncidentStatus}
                      onChange={(e) => setNewIncidentStatus(e.target.value as Incident['status'])}
                      className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="investigating">Investigating</option>
                      <option value="identified">Identified</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={newIncidentDesc}
                    onChange={(e) => setNewIncidentDesc(e.target.value)}
                    placeholder="We are investigating increased response times..."
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-none h-20"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAddIncident(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addIncident}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Add Incident
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {config.incidents.map((inc) => (
              <div
                key={inc.id}
                className="px-4 py-3 bg-bg-secondary border border-border-subtle rounded-xl"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium">{inc.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent/10 text-accent capitalize">
                      {inc.status}
                    </span>
                    <button
                      onClick={() => removeIncident(inc.id)}
                      className="p-1 rounded text-text-tertiary hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {inc.description && (
                  <p className="text-xs text-text-secondary mt-1">{inc.description}</p>
                )}
                <p className="text-[10px] text-text-tertiary mt-2">
                  {new Date(inc.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
            {config.incidents.length === 0 && (
              <div className="text-center py-8 text-text-tertiary text-sm">
                No incidents reported
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
