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

export interface Account {
  id: string;
  name: string;
  owner_user_id: string | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  plan: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  account_id: string | null;
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
  goals_enabled: boolean;
  mcp_system_prompt: string | null;
  mcp_welcome_message: string | null;
  project_mode: 'explore' | 'collect' | 'guided';
  end_prompt_suggestion: string | null;
  default_persona_id: string | null;
  default_start_nord_id: string | null;
  default_end_nord_id: string | null;
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
  /** 'user' = admin-set context (node identity), 'mcp' = AI-collected knowledge (session data). Default: 'user'. */
  source?: 'user' | 'mcp';
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

export interface McpSession {
  id: string;
  project_id: string;
  persona_id: string | null;
  current_nord_id: string | null;
  user_id: string | null;
  token_id: string | null;
  started_at: Date;
  ended_at: Date | null;
  status: 'active' | 'completed' | 'abandoned';
  summary: string | null;
  created_at: Date;
}

export interface McpTraversal {
  id: string;
  session_id: string;
  connection_id: string;
  source_nord_id: string;
  target_nord_id: string;
  direction: 'forward' | 'backward';
  traversal_type: 'read' | 'advance' | 'rework' | 'create' | 'assign' | 'evaluate';
  context: Record<string, unknown>;
  traversed_at: Date;
}

export interface McpNordVisit {
  id: string;
  session_id: string;
  nord_id: string;
  visit_type: 'inspect' | 'update' | 'complete' | 'create' | 'gate_check';
  properties_before: Record<string, unknown> | null;
  properties_after: Record<string, unknown> | null;
  context: Record<string, unknown>;
  visited_at: Date;
}

/** Per-session, per-nord completion state — the INSTANCE layer */
export interface McpSessionNord {
  id: string;
  session_id: string;
  nord_id: string;
  properties: Record<string, unknown>;
  complete: boolean;
  filled_count: number;
  required_count: number;
  first_visited: Date;
  last_visited: Date;
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

export interface UsageEvent {
  id: number;
  account_id: string;
  project_id: string | null;
  event_type: string;
  quantity: number;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface AccountInvoice {
  id: string;
  account_id: string;
  period_start: Date;
  period_end: Date;
  total_requests: number;
  gcp_cost_share_usd: number;
  markup_pct: number;
  total_billed_usd: number;
  stripe_invoice_id: string | null;
  status: string;
  created_at: Date;
}

export interface ProjectAccessToken {
  id: string;
  project_id: string;
  label: string;
  token_hash: string;
  token_prefix: string;
  scopes: string[];
  created_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

export interface McpMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> | null;
  context: Record<string, unknown> | null;
  tokens_in: number | null;
  tokens_out: number | null;
  model: string | null;
  latency_ms: number | null;
  created_at: Date;
}

// ── Goal Orchestration Entities ──

export interface Goal {
  id: string;
  project_id: string;
  name: string;
  description: string;
  icon: string;
  accent_color: string;
  sort_order: number;
  /** null = does not end session, 'reset' = end & full reset, 'continue' = end & carry over */
  end_type: 'reset' | 'continue' | null;
  achieved_prompt: string | null;
  is_implicit: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Directed edge in the goal DAG: source → target */
export interface GoalEdge {
  id: string;
  project_id: string;
  source_goal_id: string;
  target_goal_id: string;
  created_at: Date;
}

export interface GoalProperty {
  id: string;
  goal_id: string;
  nord_id: string;
  property_name: string;
  created_at: Date;
}

export interface McpSessionGoal {
  id: string;
  session_id: string;
  goal_id: string;
  status: 'pending' | 'active' | 'complete' | 'cancelled';
  completed_data: Record<string, unknown> | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PersonaGoalWeight {
  id: string;
  persona_id: string;
  goal_id: string;
  weight: number;
}
