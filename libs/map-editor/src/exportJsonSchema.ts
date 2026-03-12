import * as fs from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { WAMFileFormat } from "./types.ts";
import { wamFileMigration } from "./Migrations/WamFileMigration.ts";

const jsonSchema = zodToJsonSchema(WAMFileFormat, {
    name: "WAMFileFormat",
});

const latestVersion = wamFileMigration.getLatestVersion();

const schemaDir = join(fileURLToPath(import.meta.url), `/../../../docs/schema/${latestVersion}`);

if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
}

fs.writeFileSync(join(schemaDir, `/wam.json`), JSON.stringify(jsonSchema, null, 2));
