-- seed_tech_project.sql
-- Rich smoke-test dataset: "Nords Platform v1.0" end-to-end tech project
-- Project: 5413fc94-3245-4153-9641-b9d025367e1d
-- Existing types re-used by ID.

DO $$
DECLARE
  pid UUID := '5413fc94-3245-4153-9641-b9d025367e1d';
  uid TEXT := 'seed-user';

  -- nord type IDs (existing)
  t_task      UUID := '069aa2b4-023e-4d29-87ae-9da6eb958815';
  t_bug       UUID := '6da4e80b-1680-44c3-a60e-19713f8b8132';
  t_person    UUID := '50dc3bf2-7943-405d-9aa3-4cb221e794eb';
  t_artifact  UUID := '1db1a1cd-d341-4de3-9014-bae563db5ef8';
  t_milestone UUID := '2fa31a68-7189-435c-9397-c83af08e753b';

  -- connection type IDs (existing)
  ct_depends  UUID := 'd1daa79e-efdd-470c-8471-605bf0949ed1';
  ct_relates  UUID := 'd4ec08c6-386f-407e-8edc-03e2d6bd03e1';
  ct_assigned UUID := '4ac25c78-3527-48db-aaa9-832b3affb7b1';
  ct_blocks   UUID := '08ffa416-a09e-40a1-a81d-305814121ba1';
  ct_priority UUID := 'a24264e5-3b04-4ed2-83ec-16541c1367b3';

  -- Stakeholder / person nords
  n_ceo       UUID;
  n_cto       UUID;
  n_pm        UUID;
  n_lead      UUID;
  n_fe        UUID;
  n_be        UUID;
  n_design    UUID;
  n_qa        UUID;
  n_devops    UUID;

  -- Epic / milestone nords
  n_m_launch  UUID;
  n_m_beta    UUID;
  n_m_alpha   UUID;

  -- Tech stack artifacts
  n_react     UUID;
  n_postgres  UUID;
  n_node      UUID;
  n_gcp       UUID;
  n_firebase  UUID;
  n_redis     UUID;
  n_docker    UUID;

  -- Backlog tasks
  n_auth      UUID;
  n_kanban    UUID;
  n_graph     UUID;
  n_api       UUID;
  n_deploy    UUID;
  n_search    UUID;
  n_notifs    UUID;
  n_perms     UUID;
  n_export    UUID;
  n_embed     UUID;
  n_collab    UUID;
  n_mobile    UUID;

  -- Bugs
  n_b_drag    UUID;
  n_b_auth    UUID;
  n_b_perf    UUID;

BEGIN

  -- ── People ──────────────────────────────────────────────────────────────
  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Sarah Chen', 'Chief Executive Officer', '{"role":"CEO","team":"Leadership"}', 100, 100, 0.7)
  RETURNING id INTO n_ceo;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Marcus Webb', 'Chief Technology Officer', '{"role":"CTO","team":"Leadership"}', 300, 100, 0.7)
  RETURNING id INTO n_cto;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Priya Patel', 'Product Manager', '{"role":"PM","team":"Product"}', 500, 100, 0.6)
  RETURNING id INTO n_pm;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'James Okafor', 'Tech Lead', '{"role":"Lead Engineer","team":"Engineering"}', 700, 100, 0.6)
  RETURNING id INTO n_lead;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Yuki Tanaka', 'Frontend Engineer', '{"role":"FE","team":"Engineering"}', 200, 300, 0.5)
  RETURNING id INTO n_fe;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Amir Sharif', 'Backend Engineer', '{"role":"BE","team":"Engineering"}', 400, 300, 0.5)
  RETURNING id INTO n_be;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Leila Morrow', 'Designer', '{"role":"UX","team":"Design"}', 600, 300, 0.5)
  RETURNING id INTO n_design;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Tomasz Wierzbicki', 'QA Engineer', '{"role":"QA","team":"Engineering"}', 800, 300, 0.5)
  RETURNING id INTO n_qa;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_person, 'Fatima Al-Rashid', 'DevOps Engineer', '{"role":"DevOps","team":"Infrastructure"}', 1000, 300, 0.5)
  RETURNING id INTO n_devops;

  -- ── Milestones ──────────────────────────────────────────────────────────
  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_milestone, 'Alpha Release', 'Internal alpha for stakeholders', '{"target_date":"2025-06-01","status":"in_progress"}', 200, 500, 0.8)
  RETURNING id INTO n_m_alpha;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_milestone, 'Public Beta', 'Open beta with invite codes', '{"target_date":"2025-08-01","status":"planned"}', 600, 500, 0.8)
  RETURNING id INTO n_m_beta;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_milestone, 'v1.0 Launch', 'General availability launch', '{"target_date":"2025-10-15","status":"planned"}', 1000, 500, 0.8)
  RETURNING id INTO n_m_launch;

  -- ── Tech Stack ──────────────────────────────────────────────────────────
  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'React + Vite', 'Frontend framework', '{"layer":"frontend","language":"TypeScript"}', 100, 700, 0.5)
  RETURNING id INTO n_react;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'PostgreSQL 15', 'Primary relational database', '{"layer":"data","host":"Cloud SQL"}', 300, 700, 0.5)
  RETURNING id INTO n_postgres;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'Node.js + Express', 'REST API server', '{"layer":"backend","language":"TypeScript"}', 500, 700, 0.5)
  RETURNING id INTO n_node;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'Google Cloud Platform', 'Primary cloud provider', '{"layer":"infra","region":"us-central1"}', 700, 700, 0.5)
  RETURNING id INTO n_gcp;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'Firebase Auth', 'Authentication provider', '{"layer":"auth","provider":"Google"}', 900, 700, 0.5)
  RETURNING id INTO n_firebase;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'Redis', 'Session cache + pub/sub', '{"layer":"cache","use":"sessions,realtime"}', 1100, 700, 0.5)
  RETURNING id INTO n_redis;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_artifact, 'Docker + Cloud Run', 'Container deployment', '{"layer":"infra","runtime":"Cloud Run"}', 1300, 700, 0.5)
  RETURNING id INTO n_docker;

  -- ── Backlog Tasks ────────────────────────────────────────────────────────
  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Auth + SSO Integration', 'Firebase Auth with Google SSO', '{"points":5,"sprint":1}', 200, 900, 0.5)
  RETURNING id INTO n_auth;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Kanban Board View', 'Matrix board with drag-drop and swimlanes', '{"points":13,"sprint":1}', 400, 900, 0.5)
  RETURNING id INTO n_kanban;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Graph / Canvas View', 'Force-directed spatial graph editor', '{"points":13,"sprint":2}', 600, 900, 0.5)
  RETURNING id INTO n_graph;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'REST API Layer', 'Express routes + OpenAPI docs', '{"points":8,"sprint":1}', 800, 900, 0.5)
  RETURNING id INTO n_api;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'CI/CD Pipeline', 'GitHub Actions + Cloud Run deploy', '{"points":5,"sprint":2}', 1000, 900, 0.5)
  RETURNING id INTO n_deploy;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Full-text Search', 'Nord title + property search', '{"points":8,"sprint":3}', 200, 1100, 0.5)
  RETURNING id INTO n_search;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Notifications System', 'In-app and email notifications', '{"points":5,"sprint":3}', 400, 1100, 0.5)
  RETURNING id INTO n_notifs;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Role-based Permissions', 'Owner / Editor / Viewer roles', '{"points":8,"sprint":2}', 600, 1100, 0.5)
  RETURNING id INTO n_perms;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Export to CSV / PDF', 'Board and graph export', '{"points":3,"sprint":3}', 800, 1100, 0.5)
  RETURNING id INTO n_export;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Embeddable Widget', 'iFrame-embeddable board view', '{"points":5,"sprint":4}', 1000, 1100, 0.5)
  RETURNING id INTO n_embed;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Real-time Collaboration', 'WebSocket sync for multi-user', '{"points":13,"sprint":4}', 1200, 1100, 0.5)
  RETURNING id INTO n_collab;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_task, 'Mobile PWA', 'Progressive Web App shell', '{"points":8,"sprint":4}', 200, 1300, 0.5)
  RETURNING id INTO n_mobile;

  -- ── Bugs ────────────────────────────────────────────────────────────────
  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_bug, 'Drag ghost misaligned on retina', 'DPI scaling issue with HTML5 drag ghost', '{"severity":"medium","sprint":1}', 400, 1300, 0.5)
  RETURNING id INTO n_b_drag;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_bug, 'Auth token refresh race condition', 'Concurrent requests cause 401 on fresh session', '{"severity":"high","sprint":1}', 600, 1300, 0.5)
  RETURNING id INTO n_b_auth;

  INSERT INTO nords (project_id, type_id, title, description, properties, position_x, position_y, scale)
  VALUES (pid, t_bug, 'Graph render perf on 500+ nords', 'FPS drops below 30 with large graphs', '{"severity":"high","sprint":2}', 800, 1300, 0.5)
  RETURNING id INTO n_b_perf;

  -- ── CONNECTIONS ─────────────────────────────────────────────────────────

  -- Org chart (Relates / bidirectional)
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_ceo, n_cto, 'both', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_cto, n_lead, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_ceo, n_pm, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_lead, n_fe, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_lead, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_lead, n_devops, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_pm, n_design, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_lead, n_qa, 'forward', 0.5, 0.5);

  -- Task assignments (Assigned / forward)
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_auth, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_kanban, n_fe, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_graph, n_fe, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_api, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_deploy, n_devops, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_perms, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_search, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_collab, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_mobile, n_fe, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_b_drag, n_fe, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_b_auth, n_be, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_assigned, n_b_perf, n_lead, 'forward', 0.5, 0.5);

  -- Dependencies (Depends / forward — task depends on another task)
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_kanban, n_api, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_graph, n_api, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_kanban, n_auth, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_search, n_api, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_notifs, n_auth, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_collab, n_api, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_embed, n_kanban, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_deploy, n_api, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_m_alpha, n_auth, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_m_alpha, n_kanban, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_m_beta, n_m_alpha, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_depends, n_m_launch, n_m_beta, 'forward', 0.5, 0.5);

  -- Blocks (Blocks / forward)
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_blocks, n_b_auth, n_auth, 'forward', 0.2, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_blocks, n_b_drag, n_kanban, 'forward', 0.3, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_blocks, n_b_perf, n_graph, 'forward', 0.2, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_blocks, n_b_auth, n_perms, 'forward', 0.1, 0.5);

  -- Tech uses (Relates / both — tech artifacts relate to tasks)
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_react, n_kanban, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_react, n_graph, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_node, n_api, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_postgres, n_api, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_firebase, n_auth, 'both', 0.8, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_redis, n_collab, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_docker, n_deploy, 'both', 0.8, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_gcp, n_postgres, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_gcp, n_docker, 'both', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_relates, n_gcp, n_firebase, 'both', 0.6, 0.5);

  -- Priority connections (spectrum — low/med/high urgency)
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_auth, n_m_alpha, 'forward', 0.9, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_api, n_m_alpha, 'forward', 0.85, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_b_auth, n_m_alpha, 'forward', 0.95, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_kanban, n_m_alpha, 'forward', 0.8, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_graph, n_m_beta, 'forward', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_search, n_m_beta, 'forward', 0.6, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_perms, n_m_beta, 'forward', 0.65, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_collab, n_m_launch, 'forward', 0.5, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_mobile, n_m_launch, 'forward', 0.4, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_embed, n_m_launch, 'forward', 0.3, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_b_drag, n_m_beta, 'forward', 0.45, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_b_perf, n_m_beta, 'forward', 0.7, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_deploy, n_m_alpha, 'forward', 0.75, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_notifs, n_m_launch, 'forward', 0.35, 0.5);
  INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
  VALUES (pid, ct_priority, n_export, n_m_launch, 'forward', 0.25, 0.5);

  -- ── BOARD POSITIONS ──────────────────────────────────────────────────────
  -- Seed positions on Priority board for all relevant nords
  INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
  VALUES
    -- Critical (0.85–1.0)
    (n_b_auth,   ct_priority, 0.95, 0.5),
    (n_auth,     ct_priority, 0.9,  0.5),
    (n_api,      ct_priority, 0.85, 0.5),
    -- High (0.65–0.84)
    (n_kanban,   ct_priority, 0.8,  0.5),
    (n_b_perf,   ct_priority, 0.75, 0.5),
    (n_deploy,   ct_priority, 0.75, 0.5),
    (n_graph,    ct_priority, 0.7,  0.5),
    (n_search,   ct_priority, 0.65, 0.5),
    -- Medium (0.4–0.64)
    (n_perms,    ct_priority, 0.6,  0.5),
    (n_b_drag,   ct_priority, 0.45, 0.5),
    (n_collab,   ct_priority, 0.5,  0.5),
    -- Low (0.0–0.39)
    (n_mobile,   ct_priority, 0.35, 0.5),
    (n_notifs,   ct_priority, 0.35, 0.5),
    (n_embed,    ct_priority, 0.3,  0.5),
    (n_export,   ct_priority, 0.25, 0.5)
  ON CONFLICT (nord_id, type_id) DO NOTHING;

  -- Seed positions on Blocks board for bug nords
  INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
  VALUES
    (n_b_auth,   ct_blocks, 0.2, 0.5),
    (n_b_drag,   ct_blocks, 0.3, 0.5),
    (n_b_perf,   ct_blocks, 0.2, 0.5),
    (n_auth,     ct_blocks, 0.5, 0.5),
    (n_kanban,   ct_blocks, 0.6, 0.5),
    (n_graph,    ct_blocks, 0.7, 0.5),
    (n_perms,    ct_blocks, 0.4, 0.5)
  ON CONFLICT (nord_id, type_id) DO NOTHING;

  -- Seed positions on Depends board
  INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
  VALUES
    (n_auth,     ct_depends, 0.2, 0.5),
    (n_api,      ct_depends, 0.1, 0.5),
    (n_kanban,   ct_depends, 0.4, 0.5),
    (n_graph,    ct_depends, 0.5, 0.5),
    (n_search,   ct_depends, 0.6, 0.5),
    (n_notifs,   ct_depends, 0.5, 0.5),
    (n_collab,   ct_depends, 0.7, 0.5),
    (n_embed,    ct_depends, 0.8, 0.5),
    (n_deploy,   ct_depends, 0.3, 0.5),
    (n_m_alpha,  ct_depends, 0.9, 0.5),
    (n_m_beta,   ct_depends, 0.9, 0.5),
    (n_m_launch, ct_depends, 0.9, 0.5)
  ON CONFLICT (nord_id, type_id) DO NOTHING;

  -- Seed positions on Assigned board (task completion: 25/50/75/100%)
  INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
  VALUES
    (n_auth,      ct_assigned, 0.90, 0.5),
    (n_kanban,    ct_assigned, 0.90, 0.5),
    (n_graph,     ct_assigned, 0.90, 0.5),
    (n_api,       ct_assigned, 0.90, 0.5),
    (n_deploy,    ct_assigned, 0.50, 0.5),
    (n_perms,     ct_assigned, 0.75, 0.5),
    (n_search,    ct_assigned, 0.50, 0.5),
    (n_collab,    ct_assigned, 0.25, 0.5),
    (n_mobile,    ct_assigned, 0.25, 0.5),
    (n_b_drag,    ct_assigned, 0.90, 0.5),
    (n_b_auth,    ct_assigned, 0.75, 0.5),
    (n_b_perf,    ct_assigned, 0.50, 0.5)
  ON CONFLICT (nord_id, type_id) DO NOTHING;

  -- Seed positions on Relates board (org depth: leadership → IC → tools)
  INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
  VALUES
    (n_ceo,       ct_relates, 0.10, 0.5),
    (n_cto,       ct_relates, 0.10, 0.5),
    (n_pm,        ct_relates, 0.30, 0.5),
    (n_lead,      ct_relates, 0.30, 0.5),
    (n_fe,        ct_relates, 0.50, 0.5),
    (n_be,        ct_relates, 0.50, 0.5),
    (n_design,    ct_relates, 0.50, 0.5),
    (n_qa,        ct_relates, 0.50, 0.5),
    (n_devops,    ct_relates, 0.50, 0.5),
    (n_react,     ct_relates, 0.70, 0.5),
    (n_node,      ct_relates, 0.70, 0.5),
    (n_postgres,  ct_relates, 0.80, 0.5),
    (n_gcp,       ct_relates, 0.80, 0.5),
    (n_firebase,  ct_relates, 0.90, 0.5),
    (n_redis,     ct_relates, 0.90, 0.5),
    (n_docker,    ct_relates, 0.90, 0.5),
    (n_kanban,    ct_relates, 0.70, 0.5),
    (n_graph,     ct_relates, 0.70, 0.5),
    (n_api,       ct_relates, 0.70, 0.5)
  ON CONFLICT (nord_id, type_id) DO NOTHING;

  RAISE NOTICE 'Seed complete.';
END $$;
