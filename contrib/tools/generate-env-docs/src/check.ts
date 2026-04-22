#!/usr/bin/env tsx

import fs from "fs";
import { fileURLToPath } from "url";
import { extractEnvVariables } from "./extractor.js";
import { generateMarkdown } from "./markdown-generator.js";

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
    const docPath = fileURLToPath(new URL("../../../../docs/others/self-hosting/env-variables.md", import.meta.url));
    let currentMarkdown: string;

    try {
        currentMarkdown = fs.readFileSync(docPath, "utf-8");
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
