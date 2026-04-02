import { useState } from 'react';
import Titlebar from './components/Titlebar';
import Sidebar, { type ModuleId } from './components/Sidebar';
import DeployMonitor from './modules/deploy-monitor/DeployMonitor';
import ApiPlayground from './modules/api-playground/ApiPlayground';
import StatusPage from './modules/status-page/StatusPage';
import CodeSnapshots from './modules/code-snapshots/CodeSnapshots';
import ScriptRunner from './modules/script-runner/ScriptRunner';

const modules: Record<ModuleId, React.ComponentType> = {
  deploy: DeployMonitor,
  api: ApiPlayground,
  status: StatusPage,
  snapshots: CodeSnapshots,
  scripts: ScriptRunner,
};

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('deploy');
  const ActiveComponent = modules[activeModule];

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={activeModule} onChange={setActiveModule} />
        <main className="flex-1 overflow-hidden bg-bg-primary">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
