// Writes the analytics catalog (AnalyticsEventCatalog.ts) as the JSON the Rust server embeds: per event name, the
// source it is signed with and, for timed events, how the interval is opened and emitted. Property schemas are
// left out: the admin validates them again and its 422 drops an invalid event alone (see analytics.rs).
import { ANALYTICS_EVENTS } from "../../libs/messages/src/JsonMessages/AnalyticsEventCatalog";

const out: Record<string, unknown> = {};
for (const [name, d] of Object.entries(ANALYTICS_EVENTS) as [string, Record<string, unknown>][]) {
    out[name] = {
        source: d.source,
        ...("openProperties" in d
            ? { openableBy: d.openableBy, opensWith: d.opensWith ?? null, minDurationMs: d.minDurationMs, intervalFields: d.intervalFields }
            : {}),
    };
}
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
