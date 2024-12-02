import * as fs from "fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { WAMFileFormat } from "./types";
import { entitiesFileMigration } from "./Migrations/EntitiesFileMigration";

const jsonSchema = zodToJsonSchema(WAMFileFormat, {
    name: "WAMFileFormat",
});

const latestVersion = entitiesFileMigration.getLatestVersion();

fs.writeFileSync(__dirname + `/../../../docs/schema/${latestVersion}/wam.json`, JSON.stringify(jsonSchema, null, 2));
