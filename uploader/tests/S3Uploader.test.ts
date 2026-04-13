import {ChildProcess} from "child_process";
import {MinioContainer, StartedMinioContainer} from "@testcontainers/minio";
import AWS from "aws-sdk";
import {describe, expect, vi, it, beforeAll, beforeEach, afterAll, afterEach} from 'vitest';
import {PLAY_URL} from "../src/Enum/EnvironmentVariable";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon";
import startTestServer from "./startTestServer";
import isPortReachable from "./utils/isPortReachable";

const MINIO_IMAGE = "minio/minio:RELEASE.2025-09-07T16-13-09Z";
const MINIO_ACCESS_KEY = "fake-access-key";
const MINIO_SECRET_KEY = "fake-secret";
const TEST_BUCKET = "storage-bucket";

vi.mock('../src/Enum/EnvironmentVariable', () => ({
    get PLAY_URL() {
        return "http://PLAY.location"
    }
}))

describe("S3 Uploader tests", () => {
    const APP_PORT = 7374
    const UPLOADER_URL = `http://localhost:${APP_PORT}`
    let server: ChildProcess| undefined;
    let minioContainer: StartedMinioContainer | undefined
    let endpoint: string

    let s3: AWS.S3
    vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })
    beforeAll(async ()=> {
        minioContainer = await new MinioContainer(MINIO_IMAGE)
            .withUsername(MINIO_ACCESS_KEY)
            .withPassword(MINIO_SECRET_KEY)
            .start()

        endpoint = minioContainer.getConnectionUrl()

        AWS.config.update({
            accessKeyId: MINIO_ACCESS_KEY,
            secretAccessKey: MINIO_SECRET_KEY,
            region: "us-east-1"
        });
        const options = {
            s3ForcePathStyle: true,
            endpoint: endpoint,
            accessKeyId: MINIO_ACCESS_KEY,
            secretAccessKey: MINIO_SECRET_KEY
        };
        s3 = new AWS.S3(options);

        server = startTestServer({
            SERVER_PORT: APP_PORT,
            AWS_ACCESS_KEY_ID: MINIO_ACCESS_KEY,
            AWS_BUCKET: TEST_BUCKET,
            AWS_SECRET_ACCESS_KEY: MINIO_SECRET_KEY,
            AWS_DEFAULT_REGION: "us-east-1",
            AWS_ENDPOINT: endpoint,
            REDIS_HOST: "",
            REDIS_PORT: "",
            REDIS_PASSWORD: "",
            REDIS_DB_NUMBER: "",
            UPLOADER_AWS_SIGNED_URL_EXPIRATION: "60",
            ENABLE_CHAT_UPLOAD: "true",
            UPLOADER_URL: UPLOADER_URL,
            PLAY_URL: PLAY_URL
         })
        await isPortReachable(APP_PORT, {host: "localhost"});
    })

    beforeEach(async () => {
        await s3.createBucket({Bucket: TEST_BUCKET}).promise()
    })

    afterEach(async ()=> {
        const objects = await s3.listObjectsV2({Bucket: TEST_BUCKET}).promise();
        if ((objects.Contents?.length ?? 0) > 0) {
            await s3.deleteObjects({
                Bucket: TEST_BUCKET,
                Delete: {
                    Objects: objects.Contents?.flatMap((object) => object.Key ? [{Key: object.Key}] : []) ?? []
                }
            }).promise();
        }
        await s3.deleteBucket({Bucket: TEST_BUCKET}).promise();
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
        if (minioContainer) {
            const stream = await minioContainer.logs();
            stream
                //.on("data", line => console.log(line))
                .on("err", line => console.error(line))
                .on("end", () => console.log("Stream closed"));
        }

        await minioContainer?.stop()
    })

    it("should upload one file to s3", async ()=> {
        const responseData = await uploadSingleFileTest(UPLOADER_URL);
        await new Promise((resolve, reject) => {
            s3.listObjects({Bucket: TEST_BUCKET}, (err, objects) => {
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
        const responseData = await uploadMultipleFilesTest(UPLOADER_URL);
        const file1 = responseData[0]
        const file2 = responseData[1]

        await new Promise((resolve, reject) => {
            s3.listObjects({Bucket: TEST_BUCKET}, (err, objects) => {
                if (err) reject()
                const files = objects?.Contents || []
                const fileNames = files.map(f=>f.Key)
                expect(fileNames).toContain(file1.id)
                expect(fileNames).toContain(file2.id)
                resolve(0)
            })
        })
    })
})
