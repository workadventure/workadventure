#!/usr/bin/env tsx

import fs from "fs";
import { fileURLToPath } from "url";
import { extractEnvVariables } from "./extractor.js";
import { generateMarkdown } from "./markdown-generator.js";

async function main() {
    console.log("🔍 Extracting environment variables from Zod schemas...");

    // Import the validator modules
    const playModule = await import("../../../../play/src/pusher/enums/EnvironmentVariableValidator.js");
    const backModule = await import("../../../../back/src/Enum/EnvironmentVariableValidator.js");
    const mapStorageModule = await import("../../../../map-storage/src/Enum/EnvironmentVariableValidator.js");

    // Extract variables
    const playVars = extractEnvVariables(playModule.EnvironmentVariables);
    const backVars = extractEnvVariables(backModule.EnvironmentVariables);
    const mapStorageVars = extractEnvVariables(mapStorageModule.EnvironmentVariables);

    console.log(`  ✓ Play: ${playVars.length} variables`);
    console.log(`  ✓ Back: ${backVars.length} variables`);
    console.log(`  ✓ Map Storage: ${mapStorageVars.length} variables`);

    // Generate markdown
    console.log("\n📝 Generating markdown documentation...");
    const markdown = generateMarkdown(playVars, backVars, mapStorageVars);

    // Write to file
    const outputPath = fileURLToPath(new URL("../../../../docs/others/self-hosting/env-variables.md", import.meta.url));
    fs.writeFileSync(outputPath, markdown, "utf-8");

    console.log(`\n✅ Documentation generated successfully!`);
    console.log(`   Output: ${outputPath}`);
}

main().catch((error) => {
    console.error("❌ Error generating documentation:", error);
    process.exit(1);
});
