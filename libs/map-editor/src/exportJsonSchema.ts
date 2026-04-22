import fs from "fs";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { WAMFileFormat } from "./types";
import { wamFileMigration } from "./Migrations/WamFileMigration";

const jsonSchema = zodToJsonSchema(WAMFileFormat, {
    name: "WAMFileFormat",
});

const latestVersion = wamFileMigration.getLatestVersion();

const schemaDir = new URL(`../../../docs/schema/${latestVersion}`, import.meta.url);

const schemaDirPath = fileURLToPath(schemaDir);
if (!fs.existsSync(schemaDirPath)) {
    fs.mkdirSync(schemaDirPath, { recursive: true });
}

fs.writeFileSync(fileURLToPath(new URL("wam.json", schemaDir)), JSON.stringify(jsonSchema, null, 2));
