import fs from "fs";
import { APIResponse, expect, test } from '@playwright/test';

test.use({
    baseURL: (process.env.MAP_STORAGE_PROTOCOL ?? "http") + "://john.doe:password@" + (process.env.MAP_STORAGE_ENDPOINT ?? 'map-storage.workadventure.localhost'),
})

test.describe('Map-storage Upload API', () => {
    test('can upload ZIP file', async ({
        request,
    }) => {
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile1 = await request.get(`file1.txt`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain("hello");

        const uploadFile2 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file2.zip"),
            }
        });
        await expect(uploadFile2.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile2 = await request.get(`subdir/file2.txt`);
        await expect(accessFile2.ok()).toBeTruthy();
        await expect(await accessFile2.text()).toContain("world");

        // Let's check that the old file is gone
        const accessFile3 = await request.get(`file1.txt`);
        await expect(accessFile3.status()).toBe(404);

        // Now let's try to upload zip1 again, but in a directory
        const uploadFile3 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/foo"
            }
        });
        await expect(uploadFile3.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile4 = await request.get(`foo/file1.txt`);
        await expect(accessFile4.ok()).toBeTruthy();
        await expect(await accessFile4.text()).toContain("hello");

        // Because we uploaded in "/foo", the "/subdir" directory should always be here.
        const accessFile5 = await request.get(`subdir/file2.txt`);
        await expect(accessFile5.ok()).toBeTruthy();
        await expect(await accessFile5.text()).toContain("world");
    });

    test('not authenticated requests are rejected', async ({
        request,
    }) => {
        const uploadFile1 = await request.post((process.env.MAP_STORAGE_PROTOCOL ?? "http") + "://bad:credentials@" + (process.env.MAP_STORAGE_ENDPOINT ?? 'map-storage.workadventure.localhost/') + "upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect(uploadFile1.status()).toBe(401);
    });

    test('download', async ({
        request,
    }) => {
        // upload zip (file2.zip), download the "subdir" that contains only one file, reupload the subdir in "/bar", access the file
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file2.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const downloadFile1 = await request.get(`download?directory=subdir`);
        await expect(downloadFile1.ok()).toBeTruthy();
        const buffer = await downloadFile1.body();

        // Let's reupload this ZIP file in subdirectory "bar"
        const uploadFile2 = await request.post("upload", {
            multipart: {
                file: {
                    buffer,
                    name: "foo.zip",
                    mimeType: "application/zip",
                },
                directory: "/bar"
            }
        });
        await expect(uploadFile2.ok()).toBeTruthy();

        // Now, let's see if file /bar/file2.txt exists
        const accessFile1 = await request.get(`bar/file2.txt`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain("world");

    });

    test('create new .wam file for every .tmj file', async ({
        request,
    }) => {
        const uploadTmjFiles = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/create-wam-files.zip"),
            }
        });
        await expect(uploadTmjFiles.ok()).toBeTruthy();
        // For every .tmj file there should be .wam file created:
        const files = [
            "maps/map.wam",
            "maps/dir/map.wam",
        ];
        const promises: Promise<APIResponse>[] = [];
        for (const file of files) {
            promises.push(request.get(file));
        }
        const responses = await Promise.all(promises);
        for (const response of responses) {
            await expect(response.ok()).toBeTruthy();
        }
    });

    test('old .wam file is replaced by new .wam file', async ({
        request,
    }) => {
        // upload zip (wam-files-base.zip) to act as our current storage state
        const uploadWamFileBase = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/wam-files-base.zip"),
            }
        });
        await expect(uploadWamFileBase.ok()).toBeTruthy();

        // old .wam file should be of version 2.0.0
        const accessOldFile = await request.get(`dir/map.wam`);
        await expect(accessOldFile.ok()).toBeTruthy();
        await expect(await accessOldFile.text()).toContain('"version":"2.0.0"');

        // now we upload .tmj along with new .wam file
        const uploadUpdate1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/wam-files-upload-1.zip"),
            }
        });
        await expect(uploadUpdate1.ok()).toBeTruthy();

        // Old .wam file should be replaced with different version
        const accessFile1 = await request.get(`dir/map.wam`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain('"version":"1.0.0"');
    });

    test('old .wam file is removed along with its .tmj file', async ({
        request,
    }) => {
        // upload zip (wam-files-base.zip) to act as our current storage state
        const uploadWamFileBase = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/wam-files-base.zip"),
            }
        });
        await expect(uploadWamFileBase.ok()).toBeTruthy();

        // check if old .wam file exists
        const accessFile1 = await request.get(`dir/map.wam`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain('"version":"2.0.0"');

        // upload new .tmj file without .wam
        const uploadWithoutWam = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/wam-files-upload-3.zip"),
            }
        });
        await expect(uploadWithoutWam.ok()).toBeTruthy();

        // old .wam file should no longer exist
        const accessFile2 = await request.get(`dir/map.wam`);
        await expect(accessFile2.ok()).toBeFalsy();

        // check if new .wam file exists
        const accessFile3 = await request.get(`dir/map2.wam`);
        await expect(accessFile3.ok()).toBeTruthy();
    });

    test('new .tmj file with the same name is uploaded, old .wam file persists', async ({
        request,
    }) => {
        // upload zip (wam-files-base.zip) to act as our current storage state
        const uploadWamFileBase = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/wam-files-base.zip"),
            }
        });
        await expect(uploadWamFileBase.ok()).toBeTruthy();

        // check if old .wam file exists
        const accessFile1 = await request.get(`dir/map.wam`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain('"version":"2.0.0"');

        // upload new .tmj file with the same name, without .wam
        const uploadWithoutWam = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/wam-files-upload-2.zip"),
            }
        });
        await expect(uploadWithoutWam.ok()).toBeTruthy();

        // old .wam file should still be there
        const accessFile2 = await request.get(`dir/map.wam`);
        await expect(accessFile2.ok()).toBeTruthy();
        await expect(await accessFile2.text()).toContain('"version":"2.0.0"');
    });

    test('cache-control header', async ({
        request,
    }) => {
        // Let's upload the cache-control.zip
        // It contains 2 files: immutable.a45b7e8f.js and normal-file.js.
        // When accessed, normal-file.js should have a small cache-control TTL
        // immutable.a45b7e8f.js should have a "immutable" Cache-Control HTTP header
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/cache-control.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        const accessNormalFile = await request.get(`normal-file.js`);
        await expect(accessNormalFile.ok()).toBeTruthy();
        await expect(accessNormalFile.headers()['etag']).toBeDefined();
        await expect(accessNormalFile.headers()['cache-control']).toContain('public, s-max-age=10')

        const accessCacheControlFile = await request.get(`immutable.a45b7e8f.js`);
        await expect(accessCacheControlFile.ok()).toBeTruthy();
        await expect(accessCacheControlFile.headers()['etag']).toBeDefined();
        await expect(accessCacheControlFile.headers()['cache-control']).toContain("immutable");
    });

    test("get list of maps", async ({
        request,
    }) => {
        const uploadFile = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/foo"
            }
        });
        await expect(uploadFile.ok()).toBeTruthy();
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        await expect(await listOfMaps.text() === JSON.stringify(["foo/map.wam", "map.wam"])).toBeTruthy();

        const uploadFileAlone = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });

        await expect(uploadFileAlone.ok()).toBeTruthy();
        listOfMaps = await request.get("maps");
        await expect(await listOfMaps.text() === JSON.stringify(["map.wam"])).toBeTruthy();
    });

    test("delete the root folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        await expect(await listOfMaps.text() === JSON.stringify(["map.wam"])).toBeTruthy();

        const deleteRoot = await request.delete(`delete?path=/`);

        await expect(deleteRoot.status() === 204).toBeTruthy();

        listOfMaps = await request.get("maps");
        await expect(await listOfMaps.text() === JSON.stringify([])).toBeTruthy();
    });

    test("delete a folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toDelete"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        await expect(await listOfMaps.text() === JSON.stringify(["toDelete/map.wam"])).toBeTruthy();

        const deleteRoot = await request.delete(`delete?path=/toDelete`);

        await expect(deleteRoot.status() === 204).toBeTruthy();

        listOfMaps = await request.get("maps");
        await expect(await listOfMaps.text() === JSON.stringify([])).toBeTruthy();
    });

    test("move a folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toMove"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        await expect(JSON.parse(await listOfMaps.text()).includes("toMove/map.wam")).toBeTruthy();

        const moveDir = await request.post(`move`, {
            data: {
                source: "/toMove",
                destination: "/moved",
            }
        });

        await expect(moveDir.ok()).toBeTruthy();

        listOfMaps = await request.get("maps");
        await expect(JSON.parse(await listOfMaps.text()).includes("moved/map.wam")).toBeTruthy();
        await expect(JSON.parse(await listOfMaps.text()).includes("toMove/map.wam")).toBeFalsy();
    });

    test("copy a folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toCopy"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        await expect(JSON.parse(await listOfMaps.text()).includes("toCopy/map.wam")).toBeTruthy();

        const copyDir = await request.post(`copy`, {
            data: {
                source: "/toCopy",
                destination: "/copied",
            }
        });

        await expect(copyDir.ok()).toBeTruthy();

        listOfMaps = await request.get("maps");
        const maps = JSON.parse(await listOfMaps.text());
        await expect(["toCopy/map.wam", "copied/map.wam"].every((value) => maps.includes(value))).toBeTruthy();
    });

    test('fails on invalid maps', async ({
        request,
    }) => {
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/missing-image.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect((await uploadFile1.json())['missing-image/MissingImage.tmj']['tilesets'][0]['type']).toBe("error");
    });

    test('fails on JSON extension', async ({
        request,
    }) => {
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/json-map.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect((await uploadFile1.json())['map.json']['map'][0]['message']).toBe('Invalid file extension. Maps should end with the ".tmj" extension.');
    });

    test('upload single file', async ({
                                               request,
                                           }) => {
        const uploadFile1 = await request.put("single-map.wam", {
            multipart: {
                file: {
                    name: "single-map.wam",
                    mimeType: "application/json",
                    buffer: Buffer.from(JSON.stringify({
                        version: "1.0.0",
                        mapUrl: "https://example.com/map.tmj",
                        areas: [],
                        entities: [],
                    })),
                }
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile1 = await request.get(`single-map.wam`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain("https://example.com/map.tmj");

        const listOfMaps = await request.get("maps");
        const maps : string[] = JSON.parse(await listOfMaps.text());
        await expect(maps.includes("single-map.wam")).toBeTruthy();
    });

    test('special characters support', async ({
        request,
    }) => {
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/special_characters.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        const accessFileWithSpace = await request.get(`file+with%20space.txt`);
        await expect(accessFileWithSpace.ok()).toBeTruthy();
        await expect(await accessFileWithSpace.text()).toContain("ok");

        const accessFileWithEmoji = await request.get(`🍕.txt`);
        await expect(accessFileWithEmoji.ok()).toBeTruthy();
        await expect(await accessFileWithEmoji.text()).toContain("ok");
    });
});
