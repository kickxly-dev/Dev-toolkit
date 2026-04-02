import { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Save,
  Clock,
  ChevronDown,
  FolderOpen,
  X,
} from 'lucide-react';
import { loadData, saveData } from '../../lib/storage';
import type { ApiRequest, ApiCollection, ApiResponse, HttpMethod, KeyValue } from '../../types';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const methodColors: Record<HttpMethod, string> = {
  GET: 'text-success',
  POST: 'text-accent',
  PUT: 'text-warning',
  DELETE: 'text-danger',
  PATCH: 'text-purple-400',
};

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-success';
  if (code >= 300 && code < 400) return 'text-accent';
  if (code >= 400 && code < 500) return 'text-warning';
  return 'text-danger';
}

export default function ApiPlayground() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState<KeyValue[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'response'>('headers');
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [history, setHistory] = useState<ApiRequest[]>([]);
  const [showCollections, setShowCollections] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCollection, setSaveCollection] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  useEffect(() => {
    loadData<ApiCollection[]>('collections.json', []).then(setCollections);
    loadData<ApiRequest[]>('api-history.json', []).then(setHistory);
  }, []);

  useEffect(() => {
    saveData('collections.json', collections);
  }, [collections]);

  useEffect(() => {
    saveData('api-history.json', history);
  }, [history]);

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    setActiveTab('response');

    const enabledHeaders: Record<string, string> = {};
    headers.filter((h) => h.enabled && h.key).forEach((h) => {
      enabledHeaders[h.key] = h.value;
    });

    try {
      let result: ApiResponse;

      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        result = await invoke('send_http_request', {
          request: {
            url: url.startsWith('http') ? url : `https://${url}`,
            method,
            headers: enabledHeaders,
            body: ['POST', 'PUT', 'PATCH'].includes(method) ? body || null : null,
          },
        });
      } else {
        const start = Date.now();
        const resp = await fetch(url.startsWith('http') ? url : `https://${url}`, {
          method,
          headers: enabledHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? body || undefined : undefined,
        });
        const respBody = await resp.text();
        const respHeaders: Record<string, string> = {};
        resp.headers.forEach((v, k) => {
          respHeaders[k] = v;
        });
        result = {
          status: resp.status,
          statusText: resp.statusText,
          headers: respHeaders,
          body: respBody,
          time: Date.now() - start,
        };
      }

      setResponse(result);

      // Add to history
      const historyEntry: ApiRequest = {
        id: generateId(),
        name: `${method} ${url}`,
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
      };
      setHistory((prev) => [historyEntry, ...prev.slice(0, 49)]);
    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: err.message || String(err),
        time: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => {
    setHeaders((prev) => [...prev, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, field: keyof KeyValue, value: string | boolean) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const removeHeader = (index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  const saveRequest = () => {
    if (!saveName) return;
    const request: ApiRequest = {
      id: generateId(),
      name: saveName,
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
    };

    if (newCollectionName) {
      const newCol: ApiCollection = {
        id: generateId(),
        name: newCollectionName,
        requests: [request],
      };
      setCollections((prev) => [...prev, newCol]);
    } else if (saveCollection) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === saveCollection ? { ...c, requests: [...c.requests, request] } : c
        )
      );
    }

    setShowSave(false);
    setSaveName('');
    setNewCollectionName('');
  };

  const loadRequest = (req: ApiRequest) => {
    setUrl(req.url);
    setMethod(req.method);
    setHeaders(req.headers);
    setBody(req.body);
    setShowCollections(false);
  };

  const formatJson = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar: Collections & History */}
      <div
        className={`${showCollections ? 'w-64' : 'w-0'} overflow-hidden transition-all duration-200 border-r border-border-subtle bg-bg-secondary flex flex-col`}
      >
        <div className="p-3 border-b border-border-subtle flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary">Collections</span>
          <button
            onClick={() => setShowCollections(false)}
            className="p-1 rounded text-text-tertiary hover:text-text-secondary"
          >
            <X size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {collections.map((col) => (
            <div key={col.id} className="mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
                <FolderOpen size={11} />
                {col.name}
              </div>
              {col.requests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => loadRequest(req)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                >
                  <span className={`text-[10px] font-bold ${methodColors[req.method]}`}>
                    {req.method}
                  </span>
                  <span className="truncate">{req.name}</span>
                </button>
              ))}
            </div>
          ))}
          {/* History */}
          {history.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
                <Clock size={11} />
                History
              </div>
              {history.slice(0, 20).map((req) => (
                <button
                  key={req.id}
                  onClick={() => loadRequest(req)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                >
                  <span className={`text-[10px] font-bold ${methodColors[req.method]}`}>
                    {req.method}
                  </span>
                  <span className="truncate">{req.url}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h1 className="text-lg font-semibold">API Playground</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Test and debug HTTP requests
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCollections(!showCollections)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
            >
              <FolderOpen size={13} />
              Collections
            </button>
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
            >
              <Save size={13} />
              Save
            </button>
          </div>
        </div>

        {/* URL Bar */}
        <div className="px-6 py-3 border-b border-border-subtle">
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                className={`flex items-center gap-1 px-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-sm font-bold ${methodColors[method]} transition-colors`}
              >
                {method}
                <ChevronDown size={12} />
              </button>
              {showMethodDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-bg-elevated border border-border-default rounded-lg shadow-xl z-10 py-1 min-w-[100px]">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMethod(m);
                        setShowMethodDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-sm font-bold ${methodColors[m]} hover:bg-white/5 transition-colors`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
              placeholder="https://api.example.com/endpoint"
              className="flex-1 bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={sendRequest}
              disabled={loading || !url}
              className="flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Send size={14} />
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle">
          {(['headers', 'body', 'response'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
              {tab === 'response' && response && (
                <span className={`ml-2 ${statusColor(response.status)}`}>
                  {response.status}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'headers' && (
            <div className="p-4">
              <div className="space-y-2">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => updateHeader(i, 'enabled', e.target.checked)}
                      className="accent-accent"
                    />
                    <input
                      value={header.key}
                      onChange={(e) => updateHeader(i, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1 bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                    <input
                      value={header.value}
                      onChange={(e) => updateHeader(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      onClick={() => removeHeader(i)}
                      className="p-1 rounded text-text-tertiary hover:text-danger transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addHeader}
                className="mt-3 flex items-center gap-1 text-xs text-text-tertiary hover:text-accent transition-colors"
              >
                <Plus size={12} />
                Add header
              </button>
            </div>
          )}

          {activeTab === 'body' && (
            <div className="p-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full h-64 bg-bg-secondary border border-border-default rounded-lg px-4 py-3 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-none"
              />
              <button
                onClick={() => setBody(formatJson(body))}
                className="mt-2 text-xs text-text-tertiary hover:text-accent transition-colors"
              >
                Format JSON
              </button>
            </div>
          )}

          {activeTab === 'response' && (
            <div className="p-4">
              {!response ? (
                <div className="text-center text-text-tertiary py-12">
                  <Send size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Send a request to see the response</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <span>
                      Status:{' '}
                      <span className={`font-bold ${statusColor(response.status)}`}>
                        {response.status} {response.statusText}
                      </span>
                    </span>
                    <span>
                      Time: <span className="text-text-primary font-mono">{response.time}ms</span>
                    </span>
                  </div>

                  {/* Response headers */}
                  <details className="mb-4">
                    <summary className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold cursor-pointer mb-2">
                      Response Headers ({Object.keys(response.headers).length})
                    </summary>
                    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-3">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="flex text-xs font-mono py-0.5">
                          <span className="text-accent mr-2">{k}:</span>
                          <span className="text-text-secondary">{v}</span>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Response body */}
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
                    Response Body
                  </div>
                  <pre className="bg-bg-secondary border border-border-subtle rounded-lg p-4 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {formatJson(response.body)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save modal */}
        {showSave && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-elevated border border-border-default rounded-xl p-5 w-96">
              <h3 className="text-sm font-semibold mb-4">Save Request</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Name
                  </label>
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Get Users"
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                {collections.length > 0 && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                      Collection
                    </label>
                    <select
                      value={saveCollection}
                      onChange={(e) => setSaveCollection(e.target.value)}
                      className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="">Select collection...</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Or create new collection
                  </label>
                  <input
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="My APIs"
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => setShowSave(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRequest}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
