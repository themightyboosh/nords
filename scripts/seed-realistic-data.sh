#!/usr/bin/env bash
# seed-realistic-data.sh — Insert realistic test data for multiple types and nords.
# 
# Run from the nords project root:
#   bash scripts/seed-realistic-data.sh
#
# This calls the API to create nords and uses direct SQL (via a temp server endpoint)
# for types. For now we use curl against the running API server on localhost:3000.

set -euo pipefail

API="http://localhost:3000/api"
PROJECT_ID="5413fc94-3245-4153-9641-b9d025367e1d"

echo "🌱 Seeding realistic data for project ${PROJECT_ID}..."

# ── Step 1: Insert additional Nord Types via raw SQL endpoint ──
# We'll POST to a temp seed endpoint on the server
curl -s -X POST "${API}/seed" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"${PROJECT_ID}\",
    \"nord_types\": [
      {
        \"name\": \"Bug\",
        \"icon\": \"Bug\",
        \"accent_color\": \"#f87171\",
        \"properties_schema\": [
          { \"name\": \"Severity\", \"type\": \"select\", \"options\": [\"Critical\", \"Major\", \"Minor\", \"Trivial\"], \"card_row\": 1 },
          { \"name\": \"Browser\", \"type\": \"string\", \"card_row\": 2 },
          { \"name\": \"Steps to Reproduce\", \"type\": \"markdown\" },
          { \"name\": \"Affected Version\", \"type\": \"string\" }
        ],
        \"scale_property\": \"Severity\"
      },
      {
        \"name\": \"Person\",
        \"icon\": \"User\",
        \"accent_color\": \"#34d399\",
        \"properties_schema\": [
          { \"name\": \"Role\", \"type\": \"string\", \"card_row\": 1 },
          { \"name\": \"Team\", \"type\": \"string\", \"card_row\": 2 },
          { \"name\": \"Email\", \"type\": \"string\" },
          { \"name\": \"Capacity\", \"type\": \"spectrum_1d\" }
        ]
      },
      {
        \"name\": \"Artifact\",
        \"icon\": \"FileText\",
        \"accent_color\": \"#fbbf24\",
        \"properties_schema\": [
          { \"name\": \"Status\", \"type\": \"select\", \"options\": [\"Draft\", \"Review\", \"Approved\", \"Published\"], \"card_row\": 1 },
          { \"name\": \"Owner\", \"type\": \"string\", \"card_row\": 2 },
          { \"name\": \"File Type\", \"type\": \"string\" },
          { \"name\": \"URL\", \"type\": \"url\" }
        ]
      },
      {
        \"name\": \"Milestone\",
        \"icon\": \"Target\",
        \"accent_color\": \"#a78bfa\",
        \"properties_schema\": [
          { \"name\": \"Due Date\", \"type\": \"date\", \"card_row\": 1 },
          { \"name\": \"Progress\", \"type\": \"spectrum_1d\", \"card_row\": 2 },
          { \"name\": \"Description\", \"type\": \"markdown\" }
        ],
        \"scale_property\": \"Progress\"
      }
    ],
    \"connection_types\": [
      {
        \"name\": \"Depends\",
        \"accent_color\": \"#fbbf24\",
        \"stroke_style\": \"dashed\",
        \"default_direction\": \"forward\",
        \"x_stage_labels\": [\"Could\", \"Should\", \"Must\"],
        \"properties_schema\": [
          { \"name\": \"Dependency Type\", \"type\": \"select\", \"options\": [\"Must\", \"Should\", \"Could\"] },
          { \"name\": \"Lag\", \"type\": \"number\" }
        ]
      },
      {
        \"name\": \"Relates\",
        \"accent_color\": \"#a78bfa\",
        \"stroke_style\": \"dotted\",
        \"default_direction\": \"none\",
        \"x_stage_labels\": [\"Weak\", \"Related\", \"Strong\"],
        \"properties_schema\": [
          { \"name\": \"Relationship\", \"type\": \"string\" }
        ]
      },
      {
        \"name\": \"Assigned\",
        \"accent_color\": \"#34d399\",
        \"stroke_style\": \"solid\",
        \"default_direction\": \"forward\",
        \"x_stage_labels\": [\"25%\", \"50%\", \"75%\", \"100%\"],
        \"properties_schema\": [
          { \"name\": \"Role\", \"type\": \"string\" },
          { \"name\": \"Allocation\", \"type\": \"spectrum_1d\" }
        ]
      }
    ]
  }" | python3 -m json.tool

echo ""
echo "✅ Seed complete! Refresh the canvas to see new data."
