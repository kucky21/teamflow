import type { ProjectIcon as ProjectIconName, TaskStatus } from '@teamflow/shared';
import {
  Box,
  Briefcase,
  Code2,
  Database,
  FlaskConical,
  Globe,
  Layers,
  Palette,
  Rocket,
  Shield,
  Smartphone,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Vizuální tokeny domény sdílené komponentami (barvy stavů, ikony projektů). */
export const STATUS_COLOR_CLASS: Record<TaskStatus, string> = {
  BACKLOG: 'text-status-backlog',
  TODO: 'text-status-todo',
  IN_PROGRESS: 'text-status-progress',
  REVIEW: 'text-status-review',
  DONE: 'text-status-done',
};

export const STATUS_CSS_VAR: Record<TaskStatus, string> = {
  BACKLOG: 'var(--status-backlog)',
  TODO: 'var(--status-todo)',
  IN_PROGRESS: 'var(--status-progress)',
  REVIEW: 'var(--status-review)',
  DONE: 'var(--status-done)',
};

export const PROJECT_ICON_COMPONENTS: Record<ProjectIconName, LucideIcon> = {
  rocket: Rocket,
  layers: Layers,
  code: Code2,
  smartphone: Smartphone,
  globe: Globe,
  database: Database,
  palette: Palette,
  shield: Shield,
  zap: Zap,
  box: Box,
  briefcase: Briefcase,
  flask: FlaskConical,
};
