import fs from "fs";
import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
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
    expect(uploadFile1.ok()).toBeTruthy();
}

export async function uploadMap(request: APIRequestContext, mapFile: string, path: string): Promise<void> {
    const normalizedPath = path.startsWith("maps/") ? path : `maps/${path}`;
    const mapPath = normalizedPath.endsWith(".wam") ? normalizedPath : `${normalizedPath}.wam`;
    const mapFileName = mapPath.split("/").at(-1) ?? mapPath;
    const uploadFile = await request.put(new URL(mapPath, map_storage_url).toString(), {
        multipart: {
            file: {
                name: mapFileName,
                mimeType: "application/json",
                buffer: await fs.promises.readFile(mapFile),
            },
        },
    });
    expect(uploadFile.ok()).toBeTruthy();
}

export async function uploadEmptyMap(request: APIRequestContext, path: string): Promise<void> {
    return uploadMap(request, "../map-storage/tests/assets/maps/empty.wam", path);
}
