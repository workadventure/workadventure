import fs from "fs";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ANALYTICS_EVENTS } from "./JsonMessages/AnalyticsEventCatalog";

/**
 * Publishes the analytics catalog as JSON Schema, for the receivers of the
 * admin's `analytics.batch` webhook, at
 * https://docs.workadventu.re/docs/schema/analytics-events.json.
 *
 * It describes one event as `{ eventName, properties }`: one branch per catalog
 * entry, picked by `eventName`, plus a last branch that accepts any name the
 * file does not know yet. The catalog only ever grows and ships with every
 * deploy, so the file is unversioned and a copy fetched today must not reject
 * tomorrow's events.
 *
 * No property is `required`: the admin drops keys a world's consent policy does
 * not allow before sending anything on. Extra keys are allowed, since the
 * pipeline is passthrough so an older or newer front is never rejected.
 */
const ID = "https://docs.workadventu.re/docs/schema/analytics-events.json";

function withoutRequired(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(withoutRequired);
  }
  if (schema === null || typeof schema !== "object") {
    return schema;
  }
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key, value]) => !(key === "required" && Array.isArray(value)))
      .map(([key, value]) => [key, withoutRequired(value)]),
  );
}

const names = Object.keys(ANALYTICS_EVENTS).sort();

const definitions = Object.fromEntries(
  names.map((name) => {
    const { description, properties } =
      ANALYTICS_EVENTS[name as keyof typeof ANALYTICS_EVENTS];
    // Passthrough, as the wire schema of the catalog is.
    const { $schema: _, ...schema } = zodToJsonSchema(
      properties.passthrough(),
      {
        $refStrategy: "none",
      },
    ) as Record<string, unknown>;
    return [
      name,
      { ...(withoutRequired(schema) as object), title: name, description },
    ];
  }),
);

const jsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: ID,
  title: "WorkAdventure analytics event",
  description:
    "One analytics event: its `eventName` and the `properties` that name carries. Properties may be missing (the world's consent policy removes some) and new ones may appear. New event names appear too: they match the last branch.",
  type: "object",
  required: ["eventName"],
  oneOf: [
    ...names.map((name) => ({
      title: name,
      properties: {
        eventName: { const: name },
        properties: { $ref: `#/$defs/${name}` },
      },
    })),
    {
      title: "Any other event",
      properties: { eventName: { not: { enum: names } } },
    },
  ],
  $defs: definitions,
};

fs.writeFileSync(
  fileURLToPath(
    new URL("../../../docs/schema/analytics-events.json", import.meta.url),
  ),
  JSON.stringify(jsonSchema, null, 2) + "\n",
);
