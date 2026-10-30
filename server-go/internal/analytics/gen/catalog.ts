// Writes the JSON Schema of each event's properties (and of the open properties of the timed events) from
// AnalyticsEventCatalog.ts, for the Go server to check what the fronts report. Run from the repository: server-go/internal/analytics/gen.sh
import { zodToJsonSchema } from "zod-to-json-schema";
import { ANALYTICS_EVENTS } from "../../../../libs/messages/src/JsonMessages/AnalyticsEventCatalog";

const out: Record<string, { source: string; properties: unknown; openProperties?: unknown }> = {};
for (const [name, def] of Object.entries(ANALYTICS_EVENTS) as [string, any][]) {
    out[name] = {
        source: def.source,
        properties: zodToJsonSchema(def.properties.passthrough(), { $refStrategy: "none" }),
        ...(def.openProperties ? { openProperties: zodToJsonSchema(def.openProperties.passthrough(), { $refStrategy: "none" }) } : {}),
    };
}
// Descriptions are for the admin's documentation; the server only needs the shapes.
const shapes = (key: string, value: unknown) => (key === "description" || key === "$schema" ? undefined : value);
process.stdout.write(JSON.stringify(out, shapes, 1) + "\n");
