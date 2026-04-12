import {
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
  Square
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NordTypeMock {
  name: string;
  icon: LucideIcon;
  color: string;
  count: number;
}

export interface ConnectionTypeMock {
  name: string;
  color: string;
  count: number;
}

// Global registry since these represent "server" data before Epic 5
export const MOCK_NORD_TYPES: NordTypeMock[] = [
  { name: 'Task', icon: Square, color: '#4da6ff', count: 4 },
  { name: 'Bug', icon: Bug, color: '#f87171', count: 1 },
  { name: 'Person', icon: User, color: '#34d399', count: 1 },
  { name: 'Artifact', icon: FileText, color: '#fbbf24', count: 1 },
  { name: 'Milestone', icon: Target, color: '#a78bfa', count: 1 },
  { name: 'Idea', icon: Lightbulb, color: '#fb923c', count: 1 },
  { name: 'Epic', icon: Layers, color: '#f472b6', count: 1 },
  { name: 'Risk', icon: AlertTriangle, color: '#ef4444', count: 1 },
];

export const MOCK_CONNECTION_TYPES: ConnectionTypeMock[] = [
  { name: 'Blocks', color: '#4da6ff', count: 5 },
  { name: 'Depends', color: '#fbbf24', count: 4 },
  { name: 'Relates', color: '#a78bfa', count: 4 },
  { name: 'Assigned', color: '#34d399', count: 2 },
];

export function useTypeRegistry() {
  return {
    nordTypes: MOCK_NORD_TYPES,
    connectionTypes: MOCK_CONNECTION_TYPES
  };
}
