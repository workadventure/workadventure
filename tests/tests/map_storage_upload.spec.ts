import { expect, test } from '@playwright/test';
import * as fs from "fs";

test.use({
    baseURL: 'http://john.doe:password@map-storage.workadventure.localhost',
})

test.describe('Map-storage Upload API', () => {
    test('can upload ZIP file', async ({
                                           request,
                                       }) => {
        const uploadFile1 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile1 = await request.get(`/file1.txt`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain("hello");

        const uploadFile2 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file2.zip"),
            }
        });
        await expect(uploadFile2.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile2 = await request.get(`/subdir/file2.txt`);
        await expect(accessFile2.ok()).toBeTruthy();
        await expect(await accessFile2.text()).toContain("world");

        // Let's check that the old file is gone
        const accessFile3 = await request.get(`/file1.txt`);
        await expect(accessFile3.status()).toBe(404);

        // Now let's try to upload zip1 again, but in a directory
        const uploadFile3 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/foo"
            }
        });
        await expect(uploadFile3.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const accessFile4 = await request.get(`/foo/file1.txt`);
        await expect(accessFile4.ok()).toBeTruthy();
        await expect(await accessFile4.text()).toContain("hello");

        // Because we uploaded in "/foo", the "/subdir" directory should always be here.
        const accessFile5 = await request.get(`/subdir/file2.txt`);
        await expect(accessFile5.ok()).toBeTruthy();
        await expect(await accessFile5.text()).toContain("world");
    });

    test('not authenticated requests are rejected', async ({
                                           request,
                                       }) => {
        const uploadFile1 = await request.post(`http://bad:credentials@map-storage.workadventure.localhost/upload`, {
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
        const uploadFile1 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file2.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        // Now, let's try to fetch the file.
        const downloadFile1 = await request.get(`/download?directory=subdir`);
        await expect(downloadFile1.ok()).toBeTruthy();
        const buffer = await downloadFile1.body();

        // Let's reupload this ZIP file in subdirectory "bar"
        const uploadFile2 = await request.post(`/upload`, {
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
        const accessFile1 = await request.get(`/bar/file2.txt`);
        await expect(accessFile1.ok()).toBeTruthy();
        await expect(await accessFile1.text()).toContain("world");

    });

    test('cache-control header', async ({
                                           request,
                                       }) => {
        // Let's upload the cache-control.zip
        // It contains 2 files: immutable.a45b7e8f.js and normal-file.js.
        // When accessed, normal-file.js should have a small cache-control TTL
        // immutable.a45b7e8f.js should have a "immutable" Cache-Control HTTP header
        const uploadFile1 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/cache-control.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        const accessNormalFile = await request.get(`/normal-file.js`);
        await expect(accessNormalFile.ok()).toBeTruthy();
        await expect(accessNormalFile.headers()['etag']).toBeDefined();
        await expect(accessNormalFile.headers()['cache-control']).toContain('public, s-max-age=10')

        const accessCacheControlFile = await request.get(`/immutable.a45b7e8f.js`);
        await expect(accessCacheControlFile.ok()).toBeTruthy();
        await expect(accessCacheControlFile.headers()['etag']).toBeDefined();
        await expect(accessCacheControlFile.headers()['cache-control']).toContain("immutable");
    });

    test("get list of maps", async ({
        request,
    }) => {
        const uploadFile = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });
        const uploadFileToDir = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/foo"
            }
        });
        await expect(uploadFile.ok()).toBeTruthy();
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("/maps");
        await expect(await listOfMaps.text() === JSON.stringify(["foo/map.tmj","map.tmj"])).toBeTruthy();

        const uploadFileAlone = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });

        await expect(uploadFileAlone.ok()).toBeTruthy();
        listOfMaps = await request.get("/maps");
        await expect(await listOfMaps.text() === JSON.stringify(["map.tmj"])).toBeTruthy();
    });

    test("delete the root folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("/maps");
        await expect(await listOfMaps.text() === JSON.stringify(["map.tmj"])).toBeTruthy();

        const deleteRoot = await request.delete(`/delete?path=/`);

       await expect(deleteRoot.status() === 204).toBeTruthy();

        listOfMaps = await request.get("/maps");
        await expect(await listOfMaps.text() === JSON.stringify([])).toBeTruthy();
    });

    test("delete a folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toDelete"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("/maps");
        await expect(await listOfMaps.text() === JSON.stringify(["toDelete/map.tmj"])).toBeTruthy();

        const deleteRoot = await request.delete(`/delete?path=/toDelete`);

       await expect(deleteRoot.status() === 204).toBeTruthy();

        listOfMaps = await request.get("/maps");
        await expect(await listOfMaps.text() === JSON.stringify([])).toBeTruthy();
    });

    test("move a folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toMove"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("/maps");
        await expect(JSON.parse(await listOfMaps.text()).includes("toMove/map.tmj")).toBeTruthy();

        const moveDir = await request.post(`/move`, {
            data: {
                source: "/toMove",
                destination: "/moved",
            }
        });

        await expect(moveDir.ok()).toBeTruthy();

        listOfMaps = await request.get("/maps");
        await expect(JSON.parse(await listOfMaps.text()).includes("moved/map.tmj")).toBeTruthy();
        await expect(JSON.parse(await listOfMaps.text()).includes("toMove/map.tmj")).toBeFalsy();
    });

    test("copy a folder", async ({
        request,
    }) => {
        const uploadFileToDir = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/file1.zip"),
                directory: "/toCopy"
            }
        });
        await expect(uploadFileToDir.ok()).toBeTruthy();

        let listOfMaps = await request.get("/maps");
        await expect(JSON.parse(await listOfMaps.text()).includes("toCopy/map.tmj")).toBeTruthy();

        const copyDir = await request.post(`/copy`, {
            data: {
                source: "/toCopy",
                destination: "/copied",
            }
        });

        await expect(copyDir.ok()).toBeTruthy();

        listOfMaps = await request.get("/maps");
        const maps = JSON.parse(await listOfMaps.text());
        await expect(["toCopy/map.tmj", "copied/map.tmj"].every((value) => maps.includes(value))).toBeTruthy();
    });

    test('fails on invalid maps', async ({
                                           request,
                                       }) => {
        const uploadFile1 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/missing-image.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect((await uploadFile1.json())['missing-image/MissingImage.tmj'][0]['type']).toBe("error");
    });

    test('fails on JSON extension', async ({
                                             request,
                                         }) => {
        const uploadFile1 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/json-map.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeFalsy();
        await expect((await uploadFile1.json())['map.json'][0]['message']).toBe('Invalid file extension. Maps should end with the ".tmj" extension.');
    });

    test('special characters support', async ({
                                               request,
                                           }) => {
        const uploadFile1 = await request.post(`/upload`, {
            multipart: {
                file: fs.createReadStream("./assets/special_characters.zip"),
            }
        });
        await expect(uploadFile1.ok()).toBeTruthy();

        const accessFileWithSpace = await request.get(`/file+with%20space.txt`);
        await expect(accessFileWithSpace.ok()).toBeTruthy();
        await expect(await accessFileWithSpace.text()).toContain("ok");

        const accessFileWithEmoji = await request.get(`/🍕.txt`);
        await expect(accessFileWithEmoji.ok()).toBeTruthy();
        await expect(await accessFileWithEmoji.text()).toContain("ok");
    });
});
