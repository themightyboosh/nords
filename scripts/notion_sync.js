import { Client } from "@notionhq/client";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

async function createNordsDatabase() {
  if (!process.env.NOTION_API_KEY || !parentPageId) {
    console.error("Missing NOTION_API_KEY or NOTION_PARENT_PAGE_ID in .env file.");
    console.error("1. Create an integration at https://www.notion.so/my-integrations");
    console.error("2. Share a specific parent page with your integration.");
    console.error("3. Add the keys to .env and run again.");
    process.exit(1);
  }

  try {
    console.log(`Creating Nords Database inside page: ${parentPageId}...`);

    // 1. Create the Database
    const newDb = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: parentPageId,
      },
      title: [
        {
          type: "text",
          text: {
            content: "Nords Integration Database",
          },
        },
      ],
      properties: {
        Name: {
          title: {},
        },
        Type: {
          select: {
            options: [
              { name: "Task", color: "blue" },
              { name: "Milestone", color: "purple" },
              { name: "Risk", color: "red" },
              { name: "Artifact", color: "yellow" },
            ],
          },
        },
        "Distance (0.0-1.0)": {
          number: {
            format: "number_with_commas",
          },
        },
      },
    });

    console.log(`Database created successfully! ID: ${newDb.id}`);
    console.log(`URL: ${newDb.url}`);

    // 2. Create a Page (Record) inside the newly created Database
    console.log("Adding sample Nords record to the database...");

    const newPage = await notion.pages.create({
      parent: {
        database_id: newDb.id,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: "Implement Spatial Math",
              },
            },
          ],
        },
        Type: {
          select: {
            name: "Task",
          },
        },
        "Distance (0.0-1.0)": {
          number: 0.85,
        },
      },
      children: [
        {
          object: "block",
          heading_2: {
            rich_text: [
              {
                text: {
                  content: "Nords Spatial API Sync",
                },
              },
            ],
          },
        },
        {
          object: "block",
          paragraph: {
            rich_text: [
              {
                text: {
                  content:
                    "This record was created via the Notion API to demonstrate the database and page access capabilities.",
                },
              },
            ],
          },
        },
      ],
    });

    console.log(`Page created successfully! ID: ${newPage.id}`);
    console.log(`URL: ${newPage.url}`);

  } catch (error) {
    console.error("Notion API Error:");
    console.error(error.body || error);
    process.exit(1);
  }
}

createNordsDatabase();
