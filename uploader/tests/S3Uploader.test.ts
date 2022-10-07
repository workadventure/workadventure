import {StartedTestContainer} from "testcontainers";
import {AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CHAT_URL} from "../src/Enum/EnvironmentVariable";
import AWS from "aws-sdk";
import {LocalStackContainer} from "./utils/LocalStackContainer";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon";
import startTestServer from "./startTestServer";
import {ChildProcess} from "child_process";
import isPortReachable from "./utils/isPortReachable";


jest.mock('../src/Enum/EnvironmentVariable', () => ({
    get CHAT_URL() {
        return "http://chat.location"
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

    let s3: AWS.S3
    const testBucket = "storage-bucket"
    jest.setTimeout(30000)
    beforeAll(async ()=> {
        await new LocalStackContainer().run()

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
            CHAT_URL: CHAT_URL
         })
        await isPortReachable(APP_PORT, {host: "localhost"})
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
            s3.deleteBucket({Bucket: testBucket}, ()=> {
                resolve(0)
            })
        })
    })

    afterAll(async ()=> {
        // We should be killing localstack, but for some reason testcontainer never fullfill
        // the start promise. For now, we rely on jest forcing exit to complete the tests
        server?.kill()
        await new Promise(resolve => {
            server?.on("close", ()=> {
                resolve(0)
            })
        })
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
