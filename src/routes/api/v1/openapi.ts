import { createFileRoute } from "@tanstack/react-router";

const spec = {
  openapi: "3.0.0",
  info: {
    title: "MoveSpot API",
    description:
      "Public REST API for MoveSpot — mobile advertising on vehicles. Allows AI assistants and external tools to manage ad briefs, review proposals, and check wallet balance.",
    version: "1.0.0",
    contact: { email: "api@move-spot.com" },
  },
  servers: [{ url: "https://move-spot.com/api/v1", description: "Production" }],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key prefixed with `ms_`. Generate one at move-spot.com/annonceur/parametres.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
      Brief: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["open", "closed", "fulfilled", "cancelled"] },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date" },
          budget_max: { type: "number", nullable: true },
          vehicle_count: { type: "integer" },
          vehicle_types: { type: "array", items: { type: "string" } },
          zones: { type: "array", items: { type: "string" } },
          audience_target: { type: "string", nullable: true },
          ad_format: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      Proposal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["pending", "accepted", "rejected", "withdrawn"] },
          price_per_day: { type: "number" },
          message: { type: "string", nullable: true },
          vehicle_id: { type: "string", format: "uuid" },
          owner_id: { type: "string", format: "uuid" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          key_prefix: { type: "string" },
          last_used_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
          revoked_at: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
  },
  paths: {
    "/wallet": {
      get: {
        operationId: "getWallet",
        summary: "Get wallet balance",
        description: "Returns the current wallet balance for the authenticated advertiser.",
        responses: {
          "200": {
            description: "Wallet balance",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    balance_cents: { type: "integer", description: "Balance in euro cents" },
                    currency: { type: "string", example: "EUR" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/briefs": {
      get: {
        operationId: "listBriefs",
        summary: "List ad briefs",
        description: "Returns a paginated list of the advertiser's ad briefs.",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "closed", "fulfilled", "cancelled"] } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": {
            description: "List of briefs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    briefs: { type: "array", items: { $ref: "#/components/schemas/Brief" } },
                    total: { type: "integer" },
                    limit: { type: "integer" },
                    offset: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        operationId: "createBrief",
        summary: "Create an ad brief",
        description: "Creates a new advertising brief. Vehicle owners will be able to submit proposals.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "start_date", "end_date"],
                properties: {
                  title: { type: "string", maxLength: 200 },
                  description: { type: "string" },
                  start_date: { type: "string", format: "date", description: "YYYY-MM-DD" },
                  end_date: { type: "string", format: "date", description: "YYYY-MM-DD" },
                  budget_max: { type: "number", description: "Maximum budget in euros" },
                  vehicle_count: { type: "integer", default: 1 },
                  vehicle_types: { type: "array", items: { type: "string" }, description: "e.g. taxi, vtc, camionnette" },
                  zones: { type: "array", items: { type: "string" }, description: "City or zone names" },
                  audience_target: { type: "string" },
                  ad_format: { type: "string", description: "e.g. covering intégral, sticker latéral" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created brief",
            content: { "application/json": { schema: { type: "object", properties: { brief: { $ref: "#/components/schemas/Brief" } } } } },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "422": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/briefs/{briefId}/proposals": {
      get: {
        operationId: "listProposals",
        summary: "List proposals for a brief",
        description: "Returns all proposals submitted by vehicle owners for the given brief.",
        parameters: [{ name: "briefId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "List of proposals",
            content: {
              "application/json": {
                schema: { type: "object", properties: { proposals: { type: "array", items: { $ref: "#/components/schemas/Proposal" } } } },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Brief not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/proposals/{proposalId}/accept": {
      post: {
        operationId: "acceptProposal",
        summary: "Accept a proposal",
        description: "Accepts a pending proposal from a vehicle owner. The proposal must belong to one of your briefs.",
        parameters: [{ name: "proposalId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Proposal accepted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" }, proposal_id: { type: "string" }, status: { type: "string" } },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Proposal not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Proposal already processed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/keys": {
      get: {
        operationId: "listApiKeys",
        summary: "List API keys",
        description: "Returns the list of API keys for the authenticated user.",
        responses: {
          "200": {
            description: "List of keys",
            content: {
              "application/json": {
                schema: { type: "object", properties: { keys: { type: "array", items: { $ref: "#/components/schemas/ApiKey" } } } },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        operationId: "createApiKey",
        summary: "Create a new API key",
        description: "Generates a new API key. The raw key is returned once and cannot be retrieved again. Maximum 5 active keys.",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { name: { type: "string", maxLength: 80 } } },
            },
          },
        },
        responses: {
          "201": {
            description: "New API key — save the key value immediately, it will not be shown again.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { key: { type: "string", description: "Full API key (ms_...)" }, prefix: { type: "string" }, name: { type: "string" } },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Maximum keys reached", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
};

export const Route = createFileRoute("/api/v1/openapi")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(spec, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      },
    },
  },
});
