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
            org_id: { type: 'string', format: 'uuid' },
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
          required: ['org_id', 'name'],
          properties: {
            org_id: { type: 'string', format: 'uuid' },
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
      { name: 'Snapshots', description: 'Immutable graph state captures' },
      { name: 'Comments', description: 'Threaded comments on nords, connections, or project-level' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
