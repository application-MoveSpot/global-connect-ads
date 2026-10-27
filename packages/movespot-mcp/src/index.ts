#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env["MOVESPOT_API_KEY"];
const BASE_URL = (process.env["MOVESPOT_API_URL"] ?? "https://move-spot.com/api/v1").replace(/\/$/, "");

if (!API_KEY) {
  process.stderr.write("Error: MOVESPOT_API_KEY environment variable is required.\n");
  process.exit(1);
}

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as unknown;

  if (!res.ok) {
    const msg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new McpError(ErrorCode.InternalError, msg);
  }

  return json;
}

const server = new Server(
  { name: "movespot", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_wallet",
      description: "Get the advertiser's wallet balance on MoveSpot.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_briefs",
      description: "List advertising briefs created by the advertiser. Optionally filter by status.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "closed", "fulfilled", "cancelled"],
            description: "Filter by brief status",
          },
          limit: { type: "number", description: "Number of results (max 100, default 20)" },
          offset: { type: "number", description: "Pagination offset (default 0)" },
        },
      },
    },
    {
      name: "create_brief",
      description:
        "Create a new advertising brief on MoveSpot. Vehicle owners will be able to submit proposals.",
      inputSchema: {
        type: "object",
        required: ["title", "description", "start_date", "end_date"],
        properties: {
          title: { type: "string", description: "Brief title (max 200 chars)" },
          description: { type: "string", description: "Detailed description of the campaign" },
          start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
          budget_max: { type: "number", description: "Maximum budget in euros" },
          vehicle_count: { type: "number", description: "Number of vehicles needed (default 1)" },
          vehicle_types: {
            type: "array",
            items: { type: "string" },
            description: "Vehicle types, e.g. taxi, vtc, camionnette",
          },
          zones: {
            type: "array",
            items: { type: "string" },
            description: "Target city or zone names, e.g. Paris, Lyon",
          },
          audience_target: { type: "string", description: "Target audience description" },
          ad_format: {
            type: "string",
            description: "Ad format, e.g. covering intégral, sticker latéral",
          },
        },
      },
    },
    {
      name: "list_proposals",
      description: "List proposals received from vehicle owners for a given brief.",
      inputSchema: {
        type: "object",
        required: ["brief_id"],
        properties: {
          brief_id: { type: "string", description: "UUID of the brief" },
        },
      },
    },
    {
      name: "accept_proposal",
      description: "Accept a pending proposal from a vehicle owner.",
      inputSchema: {
        type: "object",
        required: ["proposal_id"],
        properties: {
          proposal_id: { type: "string", description: "UUID of the proposal to accept" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      case "get_wallet": {
        result = await call("GET", "/wallet");
        break;
      }

      case "list_briefs": {
        const params = new URLSearchParams();
        if (a["status"]) params.set("status", String(a["status"]));
        if (a["limit"]) params.set("limit", String(a["limit"]));
        if (a["offset"]) params.set("offset", String(a["offset"]));
        const qs = params.toString();
        result = await call("GET", `/briefs${qs ? `?${qs}` : ""}`);
        break;
      }

      case "create_brief": {
        result = await call("POST", "/briefs", {
          title: a["title"],
          description: a["description"],
          start_date: a["start_date"],
          end_date: a["end_date"],
          budget_max: a["budget_max"],
          vehicle_count: a["vehicle_count"],
          vehicle_types: a["vehicle_types"],
          zones: a["zones"],
          audience_target: a["audience_target"],
          ad_format: a["ad_format"],
        });
        break;
      }

      case "list_proposals": {
        result = await call("GET", `/briefs/${String(a["brief_id"])}/proposals`);
        break;
      }

      case "accept_proposal": {
        result = await call("POST", `/proposals/${String(a["proposal_id"])}/accept`);
        break;
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    if (err instanceof McpError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new McpError(ErrorCode.InternalError, msg);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
