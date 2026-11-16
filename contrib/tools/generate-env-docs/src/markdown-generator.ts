import { EnvVariable } from "./types.js";

/**
 * Variables only the Go server (server-go/) reads: it has no zod schema to extract them from, so they are listed
 * here, by hand, until it replaces the TypeScript containers. Keep in sync with server-go/internal/config/config.go.
 */
const goServerVars: EnvVariable[] = [
    {
        name: "TRUSTED_PROXIES",
        type: "string",
        required: false,
        description:
            "Comma-separated CIDRs of the reverse proxies in front of the server. The client IP (IP bans, logs) is the right-most X-Forwarded-For address that is not one of them, the peer included. Defaults to the private ranges: 127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7",
    },
    {
        name: "RESUME_BUFFER_BUDGET_BYTES",
        type: "number",
        required: false,
        description:
            "Maximum bytes all the connections keep, together, to replay messages after a short disconnection. Once spent, new connections get no replay buffer and reconnect from scratch after a drop. 0 for no cap. Defaults to 268435456 (256 MiB)",
    },
];

/**
 * Generate markdown documentation from environment variables
 */
export function generateMarkdown(
    playVars: EnvVariable[],
    backVars: EnvVariable[],
    mapStorageVars: EnvVariable[]
): string {
    const lines: string[] = [];

    // Header
    lines.push("# Environment Variables");
    lines.push("");
    lines.push(
        "This document lists all environment variables used by WorkAdventure services. These variables are defined in the `.env` file."
    );
    lines.push("");
    lines.push(
        "> ⚠️ **Auto-generated file** - Do not edit manually. Run `npm run generate-env-docs` to update."
    );
    lines.push("");

    // Play Service
    const playActive = playVars.filter((v) => !v.name.startsWith("OPID_"));
    const playDeprecated = playVars.filter((v) => v.name.startsWith("OPID_"));

    lines.push("## Play Service");
    lines.push("");
    lines.push("Environment variables for the Play service (frontend and pusher).");
    lines.push("");
    lines.push(...generateTable(playActive));
    lines.push("");

    // Back Service
    lines.push("## Back Service");
    lines.push("");
    lines.push("Environment variables for the Back service (backend API).");
    lines.push("");
    lines.push(...generateTable(backVars));
    lines.push("");

    // Map Storage Service
    lines.push("## Map Storage Service");
    lines.push("");
    lines.push("Environment variables for the Map Storage service.");
    lines.push("");
    lines.push(...generateTable(mapStorageVars));
    lines.push("");

    // Go server
    lines.push("## Go Server");
    lines.push("");
    lines.push(
        "The Go server (`server-go/`) replaces the play, back, map-storage and uploader containers and reads their variables. It also reads these ones:"
    );
    lines.push("");
    lines.push(...generateTable(goServerVars));
    lines.push("");

    // Deprecated Variables
    if (playDeprecated.length > 0) {
        lines.push("## Deprecated Variables");
        lines.push("");
        lines.push(
            "The following variables are deprecated and will be removed in a future version. Please use the `OPENID_*` equivalents instead."
        );
        lines.push("");
        lines.push(...generateTable(playDeprecated));
        lines.push("");
    }

    return lines.join("\n");
}

/**
 * Generate a markdown table for environment variables
 */
function generateTable(variables: EnvVariable[]): string[] {
    const lines: string[] = [];

    // Table header
    lines.push("| Variable | Required | Description |");
    lines.push("|----------|----------|-------------|");

    // Table rows
    for (const variable of variables) {
        const name = escapeMarkdown(variable.name);
        const required = variable.required ? "Yes" : "No";
        const description = escapeMarkdown(variable.description.replace(/\n/g, " "));

        lines.push(`| \`${name}\` | ${required} | ${description} |`);
    }

    return lines;
}

/**
 * Escape markdown special characters in table cells
 */
function escapeMarkdown(text: string): string {
    // Escape pipe characters in table cells
    return text.replace(/\|/g, "\\|");
}
