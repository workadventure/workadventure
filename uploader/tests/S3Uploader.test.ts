import {ChildProcess} from "child_process";
import {StartedTestContainer} from "testcontainers";
import AWS from "aws-sdk";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, PLAY_URL} from "../src/Enum/EnvironmentVariable.ts";
import {LocalStackContainer} from "./utils/LocalStackContainer.ts";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon.ts";
import startTestServer from "./startTestServer.ts";
import isPortReachable from "./utils/isPortReachable.ts";
import {isDockerAvailable} from "./utils/isDockerAvailable.ts";
import findAvailablePort from "./utils/findAvailablePort.ts";


vi.mock("../src/Enum/EnvironmentVariable.ts", () => ({
    get PLAY_URL() {
        return "http://PLAY.location";
    },
    get AWS_ACCESS_KEY_ID() {
        return "mock";
    },
    get AWS_SECRET_ACCESS_KEY() {
        return "mock";
    },
}));

const describeIfDocker = isDockerAvailable() ? describe : describe.skip;

describeIfDocker("S3 Uploader tests", () => {
    let appPort: number
    let server: ChildProcess| undefined;
    let localStackContainer: StartedTestContainer|undefined

    let s3: AWS.S3
    const testBucket = "storage-bucket"
    beforeAll(async ()=> {
        appPort = await findAvailablePort();
        localStackContainer = await new LocalStackContainer().run()

        AWS.config.update({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });
        const options = {s3ForcePathStyle: true, endpoint: "http://localhost:4566"};
        s3 = new AWS.S3(options);
        await ensureBucketExists();

        const uploaderUrl = `http://localhost:${appPort}`;
        server = startTestServer({
            SERVER_PORT: appPort.toString(),
            AWS_ACCESS_KEY_ID: "fake-access-key",
            AWS_BUCKET: testBucket,
            AWS_SECRET_ACCESS_KEY: "fake-secret",
            AWS_DEFAULT_REGION: "us-east-1",
            AWS_ENDPOINT: "http://localhost:4566",
            UPLOADER_AWS_SIGNED_URL_EXPIRATION: "60",
            ENABLE_CHAT_UPLOAD: "true",
            UPLOADER_URL: uploaderUrl,
            PLAY_URL: PLAY_URL
         })
        await isPortReachable(appPort, {host: "localhost"});
    })

    beforeEach(async () => {
        await emptyBucket();
    })

    afterEach(async ()=> {
        await emptyBucket();
    })

    afterAll(async ()=> {
        if (server) {
            const serverToKill = server;
            const promise = new Promise(resolve => {
                serverToKill.on("exit", ()=> {
                    resolve(0)
                })
            });
            serverToKill.kill("SIGKILL")
            await promise;
        }
        if (localStackContainer) {
            const stream = await localStackContainer.logs();
            stream
                //.on("data", line => console.log(line))
                .on("err", line => console.error(line))
                .on("end", () => console.log("Stream closed"));
        }

        await emptyBucket();
        await s3.deleteBucket({Bucket: testBucket}).promise().catch(() => undefined);
        await localStackContainer?.stop()
    })

    it("should upload one file to s3", async ()=> {
        const responseData = await uploadSingleFileTest(`http://localhost:${appPort}`);
        await new Promise((resolve, reject) => {
            s3.listObjects({Bucket: testBucket}, (err, objects) => {
                if (err) reject()
                const files = objects?.Contents || []
                try {
                    expect(files[0]?.Key).toEqual(responseData.id)
                    resolve(0)
                } catch (e) {
                    console.error(e)
                    reject()
                }
            })
        })
    })

    it("should upload multiple files to S3", async ()=> {
        const responseData = await uploadMultipleFilesTest(`http://localhost:${appPort}`);
        const file1 = responseData[0]
        const file2 = responseData[1]

        await new Promise((resolve, reject) => {
            s3.listObjects({Bucket: testBucket}, (err, objects) => {
                if (err) reject()
                const files = objects?.Contents || []
                const fileNames = files.map(f=>f.Key)
                expect(fileNames).toContain(file1.id)
                expect(fileNames).toContain(file2.id)
                resolve(0)
            })
        })
    })

    async function ensureBucketExists() {
        try {
            await s3.headBucket({Bucket: testBucket}).promise();
        } catch {
            await s3.createBucket({Bucket: testBucket}).promise();
        }
    }

    async function emptyBucket() {
        const objects = await s3.listObjectsV2({Bucket: testBucket}).promise();
        const files = objects.Contents
            ?.map((file) => file.Key)
            .filter((key): key is string => !!key) ?? [];

        if (files.length === 0) {
            return;
        }

        await s3.deleteObjects({
            Bucket: testBucket,
            Delete: {
                Objects: files.map((Key) => ({Key})),
            },
        }).promise();
    }
})
