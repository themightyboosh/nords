import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Nords Spatial Engine API',
      version: '1.0.0',
      description: `
REST API for the Nords Spatial Engine — a domain-agnostic graph database
with physics-based spatial relationships.

## Key Concepts
- **Nords** are node cards with customizable JSONB property schemas
- **Connections** are edges linking two nords with 0.0–1.0 distance values
- **Types** define the schema for both nords and connections
- **Snapshots** are immutable graph state captures

## Performance
- \`GET /projects/:id/graph\` calls \`fn_load_project_graph()\` — returns the entire graph in one database round trip
- \`PUT /projects/:id/positions\` calls \`fn_batch_update_positions()\` — updates N nords in one statement
- \`POST /projects/:id/snapshots\` calls \`fn_capture_snapshot()\` — assembles and stores the snapshot entirely inside PostgreSQL
      `.trim(),
      contact: {
        name: 'Nords Team',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
      { url: 'https://nords-api-staging.run.app', description: 'Staging' },
      { url: 'https://nords-api.run.app', description: 'Production' },
    ],
    components: {
      schemas: {
        // ── Projects ──
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'My Graph Project' },
            description: { type: 'string', nullable: true },
            icon: { type: 'string', nullable: true },
            created_by: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CreateProjectRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Sprint Planning' },
            description: { type: 'string', example: 'Q2 sprint planning graph' },
            icon: { type: 'string', example: '🎯' },
          },
        },

        // ── Nord Types ──
        PropertySchema: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Status' },
            type: { type: 'string', example: 'select', enum: ['short_text', 'long_text', 'url', 'number', 'currency', 'percentage', 'stage', 'select', 'multi_select', 'boolean', 'date', 'date_range', 'user', 'nord_reference', 'file'] },
            config: { type: 'object', example: { options: ['To Do', 'In Progress', 'Done'] } },
          },
        },
        NordType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Task' },
            icon: { type: 'string', nullable: true, example: 'CheckSquare' },
            accent_color: { type: 'string', nullable: true, example: '#4da6ff' },
            properties_schema: { type: 'array', items: { $ref: '#/components/schemas/PropertySchema' } },
            scale_property: { type: 'string', nullable: true },
            sort_order: { type: 'integer' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },

        // ── Nords ──
        Nord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            type_id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Design Canvas' },
            description: { type: 'string', nullable: true },
            properties: { type: 'object', additionalProperties: true, example: { Status: 'In Progress', Priority: 'High' } },
            position_x: { type: 'number', format: 'float', example: 0.35 },
            position_y: { type: 'number', format: 'float', example: 0.62 },
            scale: { type: 'number', format: 'float', example: 1.0 },
            created_by: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CreateNordRequest: {
          type: 'object',
          required: ['type_id'],
          properties: {
            type_id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'New Node' },
            description: { type: 'string' },
            properties: { type: 'object', additionalProperties: true },
            position_x: { type: 'number', format: 'float', default: 0 },
            position_y: { type: 'number', format: 'float', default: 0 },
            scale: { type: 'number', format: 'float', default: 1.0 },
          },
        },
        UpdateNordRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            properties: { type: 'object', additionalProperties: true },
            position_x: { type: 'number', format: 'float' },
            position_y: { type: 'number', format: 'float' },
            scale: { type: 'number', format: 'float' },
          },
        },

        // ── Connection Types ──
        ConnectionType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Blocks' },
            accent_color: { type: 'string', nullable: true, example: '#f87171' },
            stroke_style: { type: 'string', enum: ['solid', 'dashed', 'dotted'], example: 'solid' },
            default_direction: { type: 'string', enum: ['to', 'from', 'both', 'neither', 'none'] },
            verb: { type: 'string', nullable: true, example: 'blocks' },
            direction_filter: { type: 'string', enum: ['all', 'forward', 'reverse', 'both', 'none'], default: 'all' },
            x_stage_labels: { type: 'array', items: { type: 'string' }, example: ['To Do', 'In Progress', 'Done'] },
            y_stage_labels: { type: 'array', items: { type: 'string' }, example: ['Low', 'Medium', 'High'] },
            properties_schema: { type: 'array', items: { $ref: '#/components/schemas/PropertySchema' } },
            sort_order: { type: 'integer' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },

        // ── Connections ──
        Connection: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            type_id: { type: 'string', format: 'uuid' },
            source_nord_id: { type: 'string', format: 'uuid' },
            target_nord_id: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['forward', 'reverse', 'both', 'neither', 'none'] },
            distance_x: { type: 'number', format: 'float', minimum: 0, maximum: 1, example: 0.75 },
            distance_y: { type: 'number', format: 'float', minimum: 0, maximum: 1, example: 0.5 },
            properties: { type: 'object', additionalProperties: true },
            created_at: { type: 'string', format: 'date-time' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CreateConnectionRequest: {
          type: 'object',
          required: ['type_id', 'source_nord_id', 'target_nord_id'],
          properties: {
            type_id: { type: 'string', format: 'uuid' },
            source_nord_id: { type: 'string', format: 'uuid' },
            target_nord_id: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['forward', 'reverse', 'both', 'neither', 'none'], default: 'none' },
            distance_x: { type: 'number', format: 'float', default: 0.5 },
            distance_y: { type: 'number', format: 'float', default: 0.5 },
            properties: { type: 'object', additionalProperties: true },
          },
        },

        // ── Graph ──
        ProjectGraph: {
          type: 'object',
          description: 'Complete graph payload returned by fn_load_project_graph()',
          properties: {
            nord_types: { type: 'array', items: { $ref: '#/components/schemas/NordType' } },
            nords: { type: 'array', items: { $ref: '#/components/schemas/Nord' } },
            connection_types: { type: 'array', items: { $ref: '#/components/schemas/ConnectionType' } },
            connections: { type: 'array', items: { $ref: '#/components/schemas/Connection' } },
          },
        },
        BatchPositionUpdate: {
          type: 'object',
          required: ['updates'],
          properties: {
            updates: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'x', 'y'],
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  x: { type: 'number', format: 'float' },
                  y: { type: 'number', format: 'float' },
                },
              },
            },
          },
        },

        // ── Snapshots ──
        SnapshotSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Sprint Review' },
            description: { type: 'string', nullable: true },
            created_by: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        SnapshotFull: {
          allOf: [
            { $ref: '#/components/schemas/SnapshotSummary' },
            {
              type: 'object',
              properties: {
                snapshot_data: { $ref: '#/components/schemas/ProjectGraph' },
              },
            },
          ],
        },
        CaptureSnapshotRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Sprint Review Checkpoint' },
            description: { type: 'string', example: 'State before refactor' },
          },
        },

        // ── Comments ──
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            target_type: { type: 'string', enum: ['nord', 'connection', 'general'] },
            target_id: { type: 'string', format: 'uuid', nullable: true },
            parent_comment_id: { type: 'string', format: 'uuid', nullable: true },
            author_id: { type: 'string', format: 'uuid', nullable: true },
            body: { type: 'string', example: 'Should we split this into two nords?' },
            resolved: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CreateCommentRequest: {
          type: 'object',
          required: ['body'],
          properties: {
            target_type: { type: 'string', enum: ['nord', 'connection', 'general'], default: 'general' },
            target_id: { type: 'string', format: 'uuid' },
            parent_comment_id: { type: 'string', format: 'uuid', description: 'Set to create a threaded reply' },
            body: { type: 'string' },
            author_id: { type: 'string', format: 'uuid' },
          },
        },

        // ── Common ──
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Resource not found' },
          },
        },

        // ── MCP Navigate ──
        NavigateResult: {
          type: 'object',
          description: 'Self-contained response from nords_navigate — includes destination, horizon, and runner-ups.',
          properties: {
            navigated: { type: 'boolean', description: 'Whether position was updated (false for fuzzy suggestions)' },
            method: { type: 'string', enum: ['traversed', 'jumped', 'uuid'], description: 'How the navigation occurred' },
            destination: { $ref: '#/components/schemas/Nord' },
            previous_position: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
              },
            },
            horizon: { type: 'object', description: 'Fresh horizon from the destination position' },
            also_considered: {
              type: 'array',
              description: 'Runner-up candidates the system considered but did not navigate to',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  type_name: { type: 'string' },
                  source: { type: 'string', enum: ['neighbor', 'search'] },
                  score: { type: 'number' },
                },
              },
            },
          },
        },

        // ── Goals ──
        Goal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Complete Requirements Gathering' },
            description: { type: 'string', nullable: true },
            completion_rule: { type: 'string', enum: ['all_variables', 'any_variable', 'custom'], example: 'all_variables' },
            is_implicit: { type: 'boolean' },
            end_type: { type: 'string', nullable: true, enum: ['success', 'failure', 'reset', null] },
            achieved_prompt: { type: 'string', nullable: true },
            sort_order: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateGoalRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Capture Patient Demographics' },
            description: { type: 'string' },
            completion_rule: { type: 'string', enum: ['all_variables', 'any_variable', 'custom'], default: 'all_variables' },
            is_implicit: { type: 'boolean', default: false },
            end_type: { type: 'string', nullable: true, enum: ['success', 'failure', 'reset'] },
            achieved_prompt: { type: 'string' },
          },
        },
        GoalVariableBinding: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            goal_id: { type: 'string', format: 'uuid' },
            variable_id: { type: 'string', format: 'uuid' },
            required: { type: 'boolean' },
          },
        },
        GoalEdge: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            source_goal_id: { type: 'string', format: 'uuid' },
            target_goal_id: { type: 'string', format: 'uuid' },
          },
        },

        // ── Project Variables ──
        ProjectVariable: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            collection_group_id: { type: 'string', format: 'uuid', nullable: true },
            name: { type: 'string', example: 'Chief Complaint' },
            description: { type: 'string', example: 'Primary reason for the visit' },
            type: { type: 'string', enum: ['short_text', 'long_text', 'number', 'boolean', 'select', 'multi_select', 'date'], example: 'short_text' },
            options: { type: 'array', items: { type: 'string' }, nullable: true, example: ['Headache', 'Chest Pain', 'Fatigue'] },
            required: { type: 'boolean' },
            hint: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' }, nullable: true },
            sort_order: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateVariableRequest: {
          type: 'object',
          required: ['name', 'type'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string', enum: ['short_text', 'long_text', 'number', 'boolean', 'select', 'multi_select', 'date'] },
            options: { type: 'array', items: { type: 'string' } },
            required: { type: 'boolean', default: false },
            hint: { type: 'string' },
            collection_group_id: { type: 'string', format: 'uuid' },
          },
        },

        // ── Collection Groups ──
        CollectionGroup: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Patient Demographics' },
            description: { type: 'string' },
            icon: { type: 'string', example: 'Layers' },
            accent_color: { type: 'string', example: '#a78bfa' },
            sort_order: { type: 'integer' },
          },
        },

        // ── Test Scenarios & Runs ──
        TestScenario: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Wandering Priya' },
            description: { type: 'string', nullable: true },
            persona_id: { type: 'string', format: 'uuid', nullable: true },
            system_prompt_override: { type: 'string', nullable: true },
            max_turns: { type: 'integer', example: 15 },
            temperature: { type: 'number', format: 'float', example: 0.9 },
            tags: { type: 'array', items: { type: 'string' }, nullable: true },
            sort_order: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        TestRun: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            scenario_id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string', format: 'uuid', nullable: true },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time', nullable: true },
            result: { type: 'object', nullable: true },
          },
        },

        // ── Sessions ──
        SessionSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            persona_id: { type: 'string', format: 'uuid', nullable: true },
            source_type: { type: 'string', enum: ['chat', 'test', 'api', 'share'] },
            status: { type: 'string', enum: ['active', 'completed', 'abandoned'] },
            started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time', nullable: true },
            summary: { type: 'string', nullable: true },
            persona_name: { type: 'string', nullable: true },
            message_count: { type: 'integer' },
            variables_collected: { type: 'integer' },
            goals_completed: { type: 'integer' },
          },
        },
        SessionEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string', format: 'uuid' },
            action_type: { type: 'string', example: 'variable_set' },
            key: { type: 'string', example: 'Chief Complaint' },
            value: { type: 'object', additionalProperties: true },
            event_at: { type: 'string', format: 'date-time' },
          },
        },
        CollectedVariableGroup: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', nullable: true },
            name: { type: 'string', example: 'Patient Demographics' },
            icon: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
            variables: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  type: { type: 'string' },
                  value: {},
                  collected_at: { type: 'string', format: 'date-time' },
                  collected_at_nord: { type: 'string', nullable: true },
                },
              },
            },
          },
        },

        // ── Share Links ──
        ShareLink: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            token: { type: 'string' },
            label: { type: 'string', nullable: true },
            active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Firebase ID Token',
          description: 'Firebase Authentication ID token obtained from the client SDK',
        },
      },
    },
    tags: [
      { name: 'Projects', description: 'Project management' },
      { name: 'Graph', description: 'Full graph load and spatial data operations' },
      { name: 'Nords', description: 'Nord (node card) CRUD' },
      { name: 'Connections', description: 'Connection (edge) CRUD' },
      { name: 'Types', description: 'Nord type and connection type schema management' },
      { name: 'Personas', description: 'AI lens personas, mental models, and category weights' },
      { name: 'Accounts', description: 'Billing accounts, usage metering, and invoices' },
      { name: 'Snapshots', description: 'Immutable graph state captures' },
      { name: 'Comments', description: 'Threaded comments on nords, connections, or project-level' },
      { name: 'Goals', description: 'Goal engine — DAG, variable bindings, completion rules' },
      { name: 'Variables', description: 'Project variables and collection groups' },
      { name: 'Tests', description: 'Test scenarios, runs, and reports' },
      { name: 'Sessions', description: 'Session explorer — browsing, events, metrics, variables' },
      { name: 'Chat', description: 'Chat and share chat endpoints' },
      { name: 'Admin', description: 'Admin user and invite key management' },
      { name: 'Auth', description: 'Registration and authentication' },
      { name: 'System', description: 'Health, logs, seed, UI strings' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
