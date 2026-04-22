import fs from "fs";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { WAMFileFormat } from "./types";
import { wamFileMigration } from "./Migrations/WamFileMigration";

const jsonSchema = zodToJsonSchema(WAMFileFormat, {
    name: "WAMFileFormat",
});

const latestVersion = wamFileMigration.getLatestVersion();

const schemaDir = fileURLToPath(new URL(`../../../docs/schema/${latestVersion}`, import.meta.url));

if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
}

fs.writeFileSync(fileURLToPath(new URL("wam.json", schemaDir)), JSON.stringify(jsonSchema, null, 2));
