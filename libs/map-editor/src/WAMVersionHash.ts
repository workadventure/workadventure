import fs from "fs";
import crypto from "crypto";

const fileBuffer = fs.readFileSync(__dirname + "/types.ts");
const hashSum = crypto.createHash("sha256");
hashSum.update(fileBuffer);

// This hash is used to make sure we don't serve a "cache file" with outdated versions of the WAM descriptors.
// Each time the WAM descriptor changes, this hash will be updated.
export const WAMVersionHash = hashSum.digest("hex");
