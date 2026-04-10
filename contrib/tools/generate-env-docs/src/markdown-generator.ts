import { EnvVariable } from "./types.js";

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
