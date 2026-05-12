export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  icon: string | null;
  created_by: string | null;
  mcp_enabled: boolean;
  mcp_capture_data: boolean;
  mcp_mutable: boolean;
  default_persona_id: string | null;
  default_start_nord_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PropertySchema {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: string[];
  card_row?: number;
  config?: Record<string, unknown>;
}

export interface NordType {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string | null;
  accent_color: string | null;
  properties_schema: PropertySchema[];
  scale_property: string | null;
  sort_order: number;
  deleted_at: Date | null;
}

export interface Nord {
  id: string;
  project_id: string;
  type_id: string;
  title: string;
  properties: Record<string, unknown>;
  position_x: number;
  position_y: number;
  scale: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface StageLabel {
  label: string;
  position: number; // 0.0–1.0
}

export interface ConnectionType {
  id: string;
  user_id: string;
  name: string;
  description: string;
  accent_color: string | null;
  stroke_style: string;
  measurement_mode: 'spectrum' | 'quadrant' | 'none';
  x_stage_labels: StageLabel[];
  y_stage_labels: StageLabel[];
  properties_schema: PropertySchema[];
  verb: string | null;
  is_system: boolean;
  sort_order: number;
  deleted_at: Date | null;
}

export interface Connection {
  id: string;
  project_id: string;
  type_id: string;
  source_nord_id: string;
  target_nord_id: string;
  direction: 'forward' | 'reverse' | 'both' | 'neither' | 'none';
  distance_x: number;
  distance_y: number;
  sort_order: number;
  properties: Record<string, unknown>;
  created_at: Date;
  deleted_at: Date | null;
}

export interface Snapshot {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  snapshot_data: Record<string, unknown>;
  created_by: string | null;
  created_at: Date;
}

export interface Comment {
  id: string;
  project_id: string;
  target_type: 'nord' | 'connection' | 'general';
  target_id: string | null;
  parent_comment_id: string | null;
  author_id: string | null;
  body: string;
  resolved: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
