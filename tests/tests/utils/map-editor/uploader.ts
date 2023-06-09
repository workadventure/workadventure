import fs from "fs";
import {APIRequestContext, expect} from "@playwright/test";

/**
 * Reset the map storage to the default WAM maps
 */
export async function resetWamMaps(request: APIRequestContext) {
    const uploadFile1 = await request.post("upload", {
        multipart: {
            file: fs.createReadStream("../map-storage/tests/assets.zip"),
        }
    });
    await expect(uploadFile1.ok()).toBeTruthy();
}
