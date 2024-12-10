import * as fs from "fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { WAMFileFormat } from "./types";
import { wamFileMigration } from "./Migrations/WamFileMigration";

const jsonSchema = zodToJsonSchema(WAMFileFormat, {
    name: "WAMFileFormat",
});

const latestVersion = wamFileMigration.getLatestVersion();

const schemaDir = __dirname + `/../../../docs/schema/${latestVersion}`;

if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
}

fs.writeFileSync(__dirname + `/../../../docs/schema/${latestVersion}/wam.json`, JSON.stringify(jsonSchema, null, 2));
