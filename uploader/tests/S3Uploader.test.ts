import {ChildProcess} from "child_process";
import {StartedTestContainer} from "testcontainers";
import AWS from "aws-sdk";
import {describe, expect, jest, it, beforeAll, beforeEach, afterAll, afterEach} from '@jest/globals';
import {AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, PLAY_URL} from "../src/Enum/EnvironmentVariable";
import {LocalStackContainer} from "./utils/LocalStackContainer";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon";
import startTestServer from "./startTestServer";
import isPortReachable from "./utils/isPortReachable";


jest.mock('../src/Enum/EnvironmentVariable', () => ({
    get PLAY_URL() {
        return "http://PLAY.location"
    },
    get AWS_ACCESS_KEY_ID() {
        return "mock"
    },
    get AWS_SECRET_ACCESS_KEY() {
        return "mock"
    }
}))

describe("S3 Uploader tests", () => {
    const APP_PORT = 7374
    const UPLOADER_URL = `http://localhost:${APP_PORT}`
    let server: ChildProcess| undefined;
    let localStackContainer: StartedTestContainer|undefined

    let s3: AWS.S3
    const testBucket = "storage-bucket"
    jest.setTimeout(30000)
    beforeAll(async ()=> {
        localStackContainer = await new LocalStackContainer().run()

        AWS.config.update({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });
        const options = {s3ForcePathStyle: true, endpoint: "http://localhost:4566"};
        s3 = new AWS.S3(options);

        server = startTestServer({
            SERVER_PORT: APP_PORT,
            AWS_ACCESS_KEY_ID: "fake-access-key",
            AWS_BUCKET: testBucket,
            AWS_SECRET_ACCESS_KEY: "fake-secret",
            AWS_DEFAULT_REGION: "us-east-1",
            AWS_ENDPOINT: "http://localhost:4566",
            UPLOADER_AWS_SIGNED_URL_EXPIRATION: "60",
            ENABLE_CHAT_UPLOAD: "true",
            UPLOADER_URL: UPLOADER_URL,
            PLAY_URL: PLAY_URL
         })
        await isPortReachable(APP_PORT, {host: "localhost"});
    })

    beforeEach(async () => {
        await new Promise(resolve => {
            s3.createBucket({Bucket: testBucket}, () =>{
                resolve(0)
            })
        })
    })

    afterEach(async ()=> {
        await new Promise(resolve => {
            s3?.deleteBucket({Bucket: testBucket}, ()=> {
                resolve(0)
            })
        })
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

        await localStackContainer?.stop()
    })

    it("should upload one file to s3", async ()=> {
        const responseData = await uploadSingleFileTest(UPLOADER_URL);
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
        const responseData = await uploadMultipleFilesTest(UPLOADER_URL);
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
})
