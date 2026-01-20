#!/usr/bin/env tsx

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractEnvVariables } from "./extractor.js";
import { generateMarkdown } from "./markdown-generator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    console.log("🔍 Extracting environment variables from Zod schemas...");

    // Import the validator modules
    const playModule = await import("workadventure-play/src/pusher/enums/EnvironmentVariableValidator.ts");
    const backModule = await import("workadventureback/src/Enum/EnvironmentVariableValidator.ts");
    const mapStorageModule = await import("map-storage/src/Enum/EnvironmentVariableValidator.ts");

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
    const outputPath = resolve(__dirname, "../../../../docs/others/self-hosting/env-variables.md");
    writeFileSync(outputPath, markdown, "utf-8");

    console.log(`\n✅ Documentation generated successfully!`);
    console.log(`   Output: ${outputPath}`);
}

main().catch((error) => {
    console.error("❌ Error generating documentation:", error);
    process.exit(1);
});
