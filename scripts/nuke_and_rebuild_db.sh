#!/bin/bash
DB="2d85c5cb-1e52-811f-b188-c469b797dcf7"

echo "Fetching all pages to delete..."
PAGE_IDS=$(curl -s -X POST "https://api.notion.com/v1/databases/$DB/query" \
  -H "Authorization: Bearer $KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | grep -v '2d85c5cb-1e52-811f-b188-c469b797dcf7')

for id in $PAGE_IDS; do
  echo "Archiving page: $id"
  curl -s -X PATCH "https://api.notion.com/v1/pages/$id" \
    -H "Authorization: Bearer $KEY" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    --data '{"archived": true}' > /dev/null
done

echo "Updating Database Schema..."
curl -s -X PATCH "https://api.notion.com/v1/databases/$DB" \
  -H "Authorization: Bearer $KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  --data '{
    "properties": {
      "Issue Level": { "select": {} },
      "Impact Zone": { "rich_text": {} },
      "Pre-Conditions": { "rich_text": {} },
      "Acceptance Criteria": { "rich_text": {} }
    }
  }' > /dev/null
  
echo "DB Cleansed and Remapped!"
