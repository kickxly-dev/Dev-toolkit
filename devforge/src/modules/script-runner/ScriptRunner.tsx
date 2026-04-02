import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Play, Square, FolderOpen, Edit3, ChevronRight, X } from 'lucide-react';
import { loadData, saveData } from '../../lib/storage';
import type { Script, ScriptOutput, ScriptVariable } from '../../types';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const SHELLS = ['bash', 'zsh', 'powershell', 'cmd'] as const;

export default function ScriptRunner() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, ScriptOutput>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newShell, setNewShell] = useState<Script['shell']>('bash');
  const [newCategory, setNewCategory] = useState('General');
  const [newVariables, setNewVariables] = useState<ScriptVariable[]>([]);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    loadData<Script[]>('scripts.json', []).then(setScripts);
  }, []);

  useEffect(() => {
    saveData('scripts.json', scripts);
  }, [scripts]);

  const selected = scripts.find((s) => s.id === selectedId);

  const categories = [...new Set(scripts.map((s) => s.category || 'General'))];

  const addScript = () => {
    if (!newName || !newCommand) return;
    const script: Script = {
      id: generateId(),
      name: newName,
      command: newCommand,
      shell: newShell,
      category: newCategory || 'General',
      variables: newVariables.filter((v) => v.name),
    };
    setScripts((prev) => [...prev, script]);
    resetForm();
  };

  const updateScript = () => {
    if (!editingId || !newName || !newCommand) return;
    setScripts((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? {
              ...s,
              name: newName,
              command: newCommand,
              shell: newShell,
              category: newCategory || 'General',
              variables: newVariables.filter((v) => v.name),
            }
          : s
      )
    );
    resetForm();
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewName('');
    setNewCommand('');
    setNewShell('bash');
    setNewCategory('General');
    setNewVariables([]);
  };

  const startEdit = (script: Script) => {
    setEditingId(script.id);
    setNewName(script.name);
    setNewCommand(script.command);
    setNewShell(script.shell);
    setNewCategory(script.category);
    setNewVariables(script.variables);
    setShowAdd(true);
  };

  const removeScript = (id: string) => {
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const resolveCommand = (script: Script): string => {
    let cmd = script.command;
    script.variables.forEach((v) => {
      const value = varValues[v.name] || v.defaultValue;
      cmd = cmd.replace(new RegExp(`\\$\\{${v.name}\\}`, 'g'), value);
      cmd = cmd.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), value);
    });
    return cmd;
  };

  const runScript = async (script: Script) => {
    const command = resolveCommand(script);

    setOutputs((prev) => ({
      ...prev,
      [script.id]: {
        scriptId: script.id,
        output: '> Running...\n',
        timestamp: Date.now(),
        running: true,
      },
    }));

    setScripts((prev) =>
      prev.map((s) => (s.id === script.id ? { ...s, lastRun: Date.now() } : s))
    );

    try {
      let result: string;
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        result = await invoke('run_script', { command, shell: script.shell });
      } else {
        result = `[Browser mode] Would execute: ${command}\n(Run in Tauri for actual execution)`;
      }

      setOutputs((prev) => ({
        ...prev,
        [script.id]: {
          scriptId: script.id,
          output: result || '(no output)',
          timestamp: Date.now(),
          running: false,
        },
      }));
    } catch (err: any) {
      setOutputs((prev) => ({
        ...prev,
        [script.id]: {
          scriptId: script.id,
          output: `Error: ${err.message || String(err)}`,
          timestamp: Date.now(),
          running: false,
        },
      }));
    }
  };

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputs, selectedId]);

  const addVariable = () => {
    setNewVariables((prev) => [...prev, { name: '', defaultValue: '' }]);
  };

  return (
    <div className="flex h-full">
      {/* Scripts list */}
      <div className="w-64 bg-bg-secondary border-r border-border-subtle flex flex-col shrink-0">
        <div className="p-3 border-b border-border-subtle flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary">Scripts</span>
          <button
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="p-1 rounded text-text-tertiary hover:text-accent transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {categories.map((cat) => (
            <div key={cat} className="mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
                <FolderOpen size={11} />
                {cat}
              </div>
              {scripts
                .filter((s) => (s.category || 'General') === cat)
                .map((script) => (
                  <button
                    key={script.id}
                    onClick={() => setSelectedId(script.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      selectedId === script.id
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <ChevronRight size={11} />
                    <span className="truncate">{script.name}</span>
                  </button>
                ))}
            </div>
          ))}
          {scripts.length === 0 && (
            <div className="text-center py-8 text-text-tertiary text-xs">
              No scripts yet
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h1 className="text-lg font-semibold">Script Runner</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Save and execute commands with one click
            </p>
          </div>
        </div>

        {/* Add/Edit form */}
        {showAdd && (
          <div className="px-6 py-4 bg-bg-tertiary border-b border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-secondary">
                {editingId ? 'Edit Script' : 'New Script'}
              </span>
              <button
                onClick={resetForm}
                className="p-1 rounded text-text-tertiary hover:text-text-secondary"
              >
                <X size={12} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Name
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Build Project"
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Shell
                  </label>
                  <select
                    value={newShell}
                    onChange={(e) => setNewShell(e.target.value as Script['shell'])}
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                  >
                    {SHELLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                    Category
                  </label>
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="General"
                    className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
                  Command
                </label>
                <textarea
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  placeholder="npm run build"
                  className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors resize-none h-20"
                  spellCheck={false}
                />
              </div>
              {/* Variables */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
                    Variables
                  </label>
                  <button
                    onClick={addVariable}
                    className="text-[10px] text-text-tertiary hover:text-accent transition-colors"
                  >
                    + Add
                  </button>
                </div>
                {newVariables.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <input
                      value={v.name}
                      onChange={(e) =>
                        setNewVariables((prev) =>
                          prev.map((vv, j) => (j === i ? { ...vv, name: e.target.value } : vv))
                        )
                      }
                      placeholder="VAR_NAME"
                      className="flex-1 bg-bg-primary border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                    <input
                      value={v.defaultValue}
                      onChange={(e) =>
                        setNewVariables((prev) =>
                          prev.map((vv, j) =>
                            j === i ? { ...vv, defaultValue: e.target.value } : vv
                          )
                        )
                      }
                      placeholder="default value"
                      className="flex-1 bg-bg-primary border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      onClick={() => setNewVariables((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1 text-text-tertiary hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-text-tertiary mt-1">
                  Use {'${VAR_NAME}'} or {'{{VAR_NAME}}'} in commands
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingId ? updateScript : addScript}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {editingId ? 'Update' : 'Add Script'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected script detail + output */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle bg-bg-secondary">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{selected.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-text-tertiary font-mono">
                    {selected.shell}
                  </span>
                  <button
                    onClick={() => startEdit(selected)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-colors"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => removeScript(selected.id)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <pre className="text-xs font-mono text-text-secondary bg-bg-primary rounded-lg px-3 py-2 overflow-x-auto">
                {selected.command}
              </pre>

              {/* Variable inputs */}
              {selected.variables.length > 0 && (
                <div className="mt-3 flex gap-3 flex-wrap">
                  {selected.variables.map((v) => (
                    <div key={v.name} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-text-tertiary">{v.name}:</span>
                      <input
                        value={varValues[v.name] ?? v.defaultValue}
                        onChange={(e) =>
                          setVarValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                        }
                        className="bg-bg-primary border border-border-default rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-accent transition-colors w-32"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => runScript(selected)}
                disabled={outputs[selected.id]?.running}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {outputs[selected.id]?.running ? (
                  <>
                    <Square size={13} />
                    Running...
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    Run Script
                  </>
                )}
              </button>
            </div>

            {/* Output */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-2 border-b border-border-subtle">
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
                  Output
                </span>
              </div>
              <pre
                ref={outputRef}
                className="flex-1 overflow-auto px-6 py-4 text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap"
              >
                {outputs[selected.id]?.output || 'Click "Run Script" to execute'}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            <div className="text-center">
              <Terminal size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a script or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Terminal(props: { size: number; className?: string }) {
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
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
