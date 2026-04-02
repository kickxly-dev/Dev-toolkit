// Deploy Monitor
export interface DeployProject {
  id: string;
  name: string;
  url: string;
  interval: number; // seconds
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  responseTime: number;
  lastChecked: number;
  history: PingEntry[];
}

export interface PingEntry {
  timestamp: number;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  statusCode: number;
}

// API Playground
export interface ApiRequest {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: KeyValue[];
  body: string;
  timestamp: number;
}

export interface ApiCollection {
  id: string;
  name: string;
  requests: ApiRequest[];
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

// Status Page
export interface StatusPageConfig {
  id: string;
  name: string;
  description: string;
  endpoints: StatusEndpoint[];
  incidents: Incident[];
}

export interface StatusEndpoint {
  id: string;
  name: string;
  url: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  uptime: number;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  timestamp: number;
}

// Code Snapshots
export interface SnapshotConfig {
  code: string;
  language: string;
  theme: string;
  padding: number;
  fontSize: number;
  backgroundColor: string;
  showLineNumbers: boolean;
  windowStyle: 'none' | 'macos' | 'windows';
}

// Script Runner
export interface Script {
  id: string;
  name: string;
  command: string;
  shell: 'bash' | 'zsh' | 'powershell' | 'cmd';
  category: string;
  variables: ScriptVariable[];
  lastRun?: number;
}

export interface ScriptVariable {
  name: string;
  defaultValue: string;
}

export interface ScriptOutput {
  scriptId: string;
  output: string;
  timestamp: number;
  running: boolean;
}
