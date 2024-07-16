import fs from "fs";
import archiver from "archiver";
import {APIRequestContext, expect} from "@playwright/test";
import {map_storage_url} from "../urls";

/**
 * Reset the map storage to the default WAM maps
 */


async function createZipFile(sourceDir, outPath) {
    return new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(outPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => resolve());
        archive.on('error', err => reject(err));

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

export async function resetWamMaps(request: APIRequestContext) {

    createZipFile("../map-storage/tests/assets", "../map-storage/tests/assets.zip");

    const filePath = "../map-storage/tests/assets.zip";
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }



    const uploadFile1 = await request.post(new URL("upload", map_storage_url).toString(), {
        multipart: {
            file: fs.createReadStream(filePath),
        }
    });
    await expect(uploadFile1.ok()).toBeTruthy();
}
