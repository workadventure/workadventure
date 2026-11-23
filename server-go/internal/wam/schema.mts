// Run by go generate (see wam.go): prints the JSON Schema of WAMFileFormat, exported from the zod schema the front
// parses the file with. The "strict" strategy only forbids extra keys on .strict() objects (none): like zod, which
// accepts and drops them.
import { createRequire } from "module";
import { fileURLToPath } from "url";
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(repo + "libs/map-editor/package.json");
const { WAMFileFormat } = await import(repo + "libs/map-editor/src/types.ts");
const { zodToJsonSchema } = await import(require.resolve("zod-to-json-schema"));
process.stdout.write(
    JSON.stringify(zodToJsonSchema(WAMFileFormat, { name: "WAMFileFormat", removeAdditionalStrategy: "strict" }), null, 2) + "\n",
);
