import {
  Activity,
  Send,
  FileBarChart,
  Camera,
  Terminal,
} from 'lucide-react';

export type ModuleId = 'deploy' | 'api' | 'status' | 'snapshots' | 'scripts';

interface SidebarProps {
  active: ModuleId;
  onChange: (id: ModuleId) => void;
}

const modules: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  { id: 'deploy', label: 'Deploy Monitor', icon: <Activity size={18} /> },
  { id: 'api', label: 'API Playground', icon: <Send size={18} /> },
  { id: 'status', label: 'Status Page', icon: <FileBarChart size={18} /> },
  { id: 'snapshots', label: 'Code Snapshots', icon: <Camera size={18} /> },
  { id: 'scripts', label: 'Script Runner', icon: <Terminal size={18} /> },
];

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="w-56 bg-bg-secondary border-r border-border-subtle flex flex-col shrink-0">
      <div className="flex-1 py-3 px-2.5">
        <div className="px-2 mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
            Modules
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => onChange(mod.id)}
              className={`
                flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left
                ${
                  active === mod.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                }
              `}
            >
              <span className={active === mod.id ? 'text-accent' : 'text-text-tertiary'}>
                {mod.icon}
              </span>
              {mod.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="px-4 py-3 border-t border-border-subtle">
        <div className="text-[10px] text-text-tertiary leading-relaxed">
          DevForge v0.1.0
          <br />
          All data stored locally
        </div>
      </div>
    </aside>
  );
}
