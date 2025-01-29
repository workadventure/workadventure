import *  as fs from "fs";
import { APIResponse, expect, test } from '@playwright/test';
import {createZipFromDirectory} from "./utils/zip";
import {RENDERER_MODE} from "./utils/environment";
import {map_storage_url, maps_domain} from "./utils/urls";
import { getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.use({
    baseURL: map_storage_url,
})

test.describe('Map-storage Upload API', () => {
    test.beforeEach(async ({page}) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
            return;
        }
    });
    test('users are asked to reconnect when a map is updated',
        async ({ request, browser }) => {
        const uploadFile1 = await request.put("map1.wam", {
            multipart: {
                file: {
                    name: "map1.wam",
                    mimeType: "application/json",
                    buffer: Buffer.from(JSON.stringify({
                        version: "1.0.0",
                        mapUrl: `${(process.env.MAP_STORAGE_PROTOCOL ?? "http")}://${maps_domain}/tests/E2E/empty.json`,
                        areas: [],
                        entities: {},
                        entityCollections: [],
                    })),
                }
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        const uploadFile2 = await request.put("map2.wam", {
            multipart: {
                file: {
                    name: "map2.wam",
                    mimeType: "application/json",
                    buffer: Buffer.from(JSON.stringify({
                        version: "1.0.0",
                        mapUrl: `${(process.env.MAP_STORAGE_PROTOCOL ?? "http")}://${maps_domain}/tests/E2E/empty.json`,
                        areas: [],
                        entities: {},
                        entityCollections: [],
                    })),
                }
            }
        });
        await expect(uploadFile2.ok()).toBeTruthy();
        const page = await getPage(browser, 'Alice', `/~/map1.wam?phaserMode=${RENDERER_MODE}`);
        const page2 = await getPage(browser, 'Bob', `/~/map2.wam?phaserMode=${RENDERER_MODE}`);

        // Let's trigger a reload of map 1 only
        const uploadFile3 = await request.put("map1.wam", {
            multipart: {
                file: {
                    name: "map1.wam",
                    mimeType: "application/json",
                    buffer: Buffer.from(JSON.stringify({
                        version: "1.0.0",
                        mapUrl: `http://${maps_domain}/tests/E2E/empty.json`,
                        areas: [],
                        entities: {},
                        entityCollections: [],
                    })),
                }
            }
        });
        await expect(uploadFile3.ok()).toBeTruthy();

        // Now let's check the user in map1 did reload, but not on map2
        await expect((await (page.locator(".test-class")).innerText())).toEqual("New version of map detected. Refresh needed");
        await expect(page2.getByText("New version of map detected. Refresh needed")).toBeHidden();
        await page2.close();
        await page2.context().close();
        await page.close();
        await page.context().close();
    });

    test('can upload ZIP file', async ({ request }) => {
        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
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

        createZipFromDirectory("./assets/file2/", "./assets/file2.zip");
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

    test('not authenticated requests are rejected', async ({ request }) => {
        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
        const uploadFile1 = await request.post(new URL("upload", (process.env.MAP_STORAGE_PROTOCOL ?? "http") + "://bad:credentials@" + (process.env.MAP_STORAGE_ENDPOINT ?? 'map-storage.workadventure.localhost')).toString(), {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect(uploadFile1.status()).toBe(401);
    });

    test('download', async ({ request }) => {
        createZipFromDirectory("./assets/file2/", "./assets/file2.zip");
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

    test('create new .wam file for every .tmj file', async ({ request }) => {
        createZipFromDirectory("./assets/create-wam-files/", "./assets/create-wam-files.zip");
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

    // Test marked as local because CDN might cache the old wam file and serve it back.
    test('old .wam file is replaced by new .wam file @local', async ({ request }) => {
        createZipFromDirectory("./assets/wam-files-base/", "./assets/wam-files-base.zip");
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

        createZipFromDirectory("./assets/wam-files-upload-1/", "./assets/wam-files-upload-1.zip");
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

    test('old .wam file is removed along with its .tmj file', async ({ request }) => {
        createZipFromDirectory("./assets/wam-files-base/", "./assets/wam-files-base.zip");
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

        createZipFromDirectory("./assets/wam-files-upload-3/", "./assets/wam-files-upload-3.zip");
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

    test('new .tmj file with the same name is uploaded, old .wam file persists',
        async ({ request }) => {
        createZipFromDirectory("./assets/wam-files-base/", "./assets/wam-files-base.zip");
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

        createZipFromDirectory("./assets/wam-files-upload-2/", "./assets/wam-files-upload-2.zip");
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

    test('cache-control header', async ({ request }) => {
        createZipFromDirectory("./assets/cache-control/", "./assets/cache-control.zip");
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

    test("get list of maps", async ({ request }) => {
        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
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
        let maps = await listOfMaps.json();
        await expect(maps["maps"]["map.wam"]).toBeDefined();
        await expect(maps["maps"]["foo/map.wam"]).toBeDefined();

        const uploadFileAlone = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });

        await expect(uploadFileAlone.ok()).toBeTruthy();
        listOfMaps = await request.get("maps");
        maps = await listOfMaps.json();
        await expect(maps["maps"]["map.wam"]).toBeDefined();
        await expect(Object.keys(maps["maps"])).toHaveLength(1);
    });

    test("delete the root folder", async ({ request }) => {
        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        let maps = await listOfMaps.json();
        await expect(maps["maps"]["map.wam"]).toBeDefined();
        await expect(Object.keys(maps["maps"])).toHaveLength(1);

        const deleteRoot = await request.delete(``);

        await expect(deleteRoot.status()).toBe(204);

        listOfMaps = await request.get("maps");
        maps = await listOfMaps.json();
        await expect(Object.keys(maps["maps"])).toHaveLength(0);
    });

    test("delete a folder", async ({ request }) => {
        const folderName = "toDelete" ;
        const fileName = "map.wam" ;
        const filePath = `${folderName}/${fileName}`;

        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: `/${folderName}`
            }
        });

        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        let maps = await listOfMaps.json();
        await expect(maps["maps"][filePath]).toBeDefined();



        const deleteRoot = await request.delete(folderName);

        await expect(deleteRoot.status() === 204).toBeTruthy();

        listOfMaps = await request.get("maps");
        maps = await listOfMaps.json();
        for (const key in maps["maps"]) {
            await expect(key).not.toContain("toDelete");
        }
    });

    test("move a folder", async ({ request }) => {
        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toMove"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        let maps = await listOfMaps.json();
        await expect(maps["maps"]["toMove/map.wam"]).toBeDefined();

        const moveDir = await request.post(`move`, {
            data: {
                source: "/toMove",
                destination: "/moved",
            }
        });

        await expect(moveDir.ok()).toBeTruthy();

        listOfMaps = await request.get("maps");
        maps = await listOfMaps.json();
        await expect(maps["maps"]["moved/map.wam"]).toBeDefined();
        await expect(maps["maps"]["toMove/map.wam"]).toBeUndefined();
    });

    test("copy a folder", async ({ request }) => {
        createZipFromDirectory("./assets/file1/", "./assets/file1.zip");
        const uploadFileToDir = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toCopy"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("maps");
        let maps = await listOfMaps.json();
        await expect(maps["maps"]["toCopy/map.wam"]).toBeDefined();

        const copyDir = await request.post(`copy`, {
            data: {
                source: "/toCopy",
                destination: "/copied",
            }
        });

        await expect(copyDir.ok()).toBeTruthy();

        listOfMaps = await request.get("maps");
        maps = await listOfMaps.json();
        await expect(maps["maps"]["toCopy/map.wam"]).toBeDefined();
        await expect(maps["maps"]["copied/map.wam"]).toBeDefined();
    });

    test('fails on invalid maps', async ({ request }) => {
        createZipFromDirectory("./assets/missing-image/", "./assets/missing-image.zip");
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/missing-image.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect((await uploadFile1.json())['MissingImage.tmj']['tilesets'][0]['type']).toBe("error");
    });

    test('fails on JSON extension', async ({ request }) => {
        createZipFromDirectory("./assets/json-map/", "./assets/json-map.zip");
        const uploadFile1 = await request.post("upload", {
            multipart: {
                file: fs.createReadStream("./assets/json-map.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect((await uploadFile1.json())['map.json']['map'][0]['message']).toBe('Invalid file extension. Maps should end with the ".tmj" extension.');
    });

    test('upload / patch / delete single file @local', async ({ request }) => {
        const uploadFile1 = await request.put("single-map.wam", {
            multipart: {
                file: {
                    name: "single-map.wam",
                    mimeType: "application/json",
                    buffer: Buffer.from(JSON.stringify({
                        version: "1.0.0",
                        mapUrl: "https://example.com/map.tmj",
                        areas: [],
                        entities: {},
                        entityCollections: [],
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
        const maps = await listOfMaps.json();
        await expect(maps["maps"]["single-map.wam"]).toBeDefined();

        const patch = await request.patch(`single-map.wam`, {
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            data: JSON.stringify([
                { "op": "replace", "path": "/mapUrl", "value": "https://example.com/newmap.tmj" },
            ])
        });
        await expect(patch.ok()).toBeTruthy();

        const accessFile2 = await request.get(`single-map.wam`);
        await expect(accessFile2.ok()).toBeTruthy();
        await expect(await accessFile2.text()).toContain("https://example.com/newmap.tmj");


        const deleteFile = await request.delete(`single-map.wam`);
        await expect(deleteFile.ok()).toBeTruthy();

        const listOfMaps2 = await request.get("maps");
        const maps2 = await listOfMaps2.json();
        await expect(maps2["single-map.wam"]).toBeUndefined();

    });

    test('special characters support', async ({ request }) => {
        createZipFromDirectory("./assets/special_characters/", "./assets/special_characters.zip");
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

        const uploadFile2 = await request.put("🍕.wam", {
            multipart: {
                file: {
                    name: "map1.wam",
                    mimeType: "application/json",
                    buffer: Buffer.from(JSON.stringify({
                        version: "1.0.0",
                        mapUrl: `${(process.env.MAP_STORAGE_PROTOCOL ?? "http")}://${maps_domain}/tests/E2E/empty.json`,
                        areas: [],
                        entities: {},
                        entityCollections: [],
                    })),
                }
            }
        });
        await expect(uploadFile2.ok()).toBeTruthy();

        const accessFileWithEmoji2 = await request.get(`🍕.wam`);
        await expect(accessFileWithEmoji2.ok()).toBeTruthy();

        const patch = await request.patch(`🍕.wam`, {
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            data: JSON.stringify([
                { "op": "replace", "path": "/mapUrl", "value": "https://example.com/newmap.tmj" },
            ])
        });
        await expect(patch.ok()).toBeTruthy();

        const deleteFile = await request.delete(`🍕.wam`);
        await expect(deleteFile.ok()).toBeTruthy();

        const accessFileWithEmoji3 = await request.get(`🍕.wam`);
        await expect(accessFileWithEmoji3.ok()).toBeFalsy();
    });
});
