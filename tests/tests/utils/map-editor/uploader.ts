import fs from "fs";
import { APIRequestContext, expect } from "@playwright/test";
import { map_storage_url } from "../urls";

/**
 * Reset the map storage to the default WAM maps
 */
export async function resetWamMaps(request: APIRequestContext) {
  const uploadFile1 = await request.post(new URL("upload", map_storage_url).toString(), {
    multipart: {
      file: fs.createReadStream("../map-storage/tests/assets.zip"),
    },
  });
  await expect(uploadFile1.ok()).toBeTruthy();
}
