#!/usr/bin/env tsx

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractEnvVariables } from "./extractor.js";
import { generateMarkdown } from "./markdown-generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    console.log("🔍 Checking environment variables documentation...");

    // Import the validator modules
    const playModule = await import("../../../../play/src/pusher/enums/EnvironmentVariableValidator.js");
    const backModule = await import("../../../../back/src/Enum/EnvironmentVariableValidator.js");
    const mapStorageModule = await import("../../../../map-storage/src/Enum/EnvironmentVariableValidator.js");

    // Extract variables
    const playVars = extractEnvVariables(playModule.EnvironmentVariables);
    const backVars = extractEnvVariables(backModule.EnvironmentVariables);
    const mapStorageVars = extractEnvVariables(mapStorageModule.EnvironmentVariables);

    // Generate expected markdown
    const expectedMarkdown = generateMarkdown(playVars, backVars, mapStorageVars);

    // Read current documentation
    const docPath = resolve(__dirname, "../../../../docs/others/self-hosting/env-variables.md");
    let currentMarkdown: string;

    try {
        currentMarkdown = readFileSync(docPath, "utf-8");
    } catch (error) {
        console.error(`\n❌ Error: Documentation file not found at ${docPath}`);
        console.error("   Run 'npm run generate-env-docs' to generate it.\n");
        process.exit(1);
    }

    // Compare
    if (currentMarkdown.trim() !== expectedMarkdown.trim()) {
        console.error("\n❌ Error: env-variables.md is out of date.");
        console.error("   Run 'npm run generate-env-docs' to update it.\n");
        process.exit(1);
    }

    console.log("\n✅ Documentation is up to date!");
}

main().catch((error) => {
    console.error("❌ Error checking documentation:", error);
    process.exit(1);
});
