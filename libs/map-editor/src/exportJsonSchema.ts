import * as fs from "fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { WAMFileFormat } from "./types";

const jsonSchema = zodToJsonSchema(WAMFileFormat, {
    name: "WAMFileFormat",
});

fs.writeFileSync(__dirname + "/../../../docs/schema/1.0/wam.json", JSON.stringify(jsonSchema, null, 2));
