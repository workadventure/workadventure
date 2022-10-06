import App from "../src/App";
import {TemplatedApp} from "uWebSockets.js";
import {StartedTestContainer} from "testcontainers";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_ENDPOINT,
    AWS_SECRET_ACCESS_KEY,
    UPLOADER_URL
} from "../src/Enum/EnvironmentVariable";
import AWS from "aws-sdk";
import {uploadFile} from "./utils/uploadFile";
import {download} from "./utils/download";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders";
import {LocalStackContainer} from "./utils/LocalStackContainer";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon";

const APP_PORT = 7374

jest.mock('../src/Enum/EnvironmentVariable', () => ({
    get ENABLE_CHAT_UPLOAD() {
        return true
    },
    get UPLOADER_URL() {
        return `http://localhost:7374`
    },
    get CHAT_URL() {
        return "http://chat.location"
    },
    get AWS_ACCESS_KEY_ID() {
      return "fake-access-key"
    },
    get AWS_BUCKET() {
        return "storage-bucket"
    },
    get AWS_SECRET_ACCESS_KEY() {
        return "fake-secret"
    },
    get AWS_DEFAULT_REGION() {
        return "us-east-1"
    },
    get AWS_ENDPOINT() {
        return "http://localhost:4566"
    },
    get UPLOADER_AWS_SIGNED_URL_EXPIRATION() {
        return 60
    }
}))

describe("S3 Uploader tests", () => {
    let app:TemplatedApp|undefined
    let localstackContainer:StartedTestContainer
    const options = {s3ForcePathStyle: true, endpoint: AWS_ENDPOINT};
    jest.setTimeout(15000)
    let s3: AWS.S3
    const testBucket = AWS_BUCKET||""
    beforeAll(async ()=> {
        AWS.config.update({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });

        s3 = new AWS.S3(options);
        const check = (resolve: (value: unknown)=>void, reject: ()=>void) => {
            s3.listBuckets( (err: unknown)=>{
                err? reject() : resolve(0)
            })
        }
        await new LocalStackContainer().run(check)

        await new Promise(resolve => {
            app = App.listen(APP_PORT, resolve)
        })
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

    afterAll(()=> {
        localstackContainer?.stop()
    })

    it("should upload one file to s3", async ()=> {
        const responseData = await uploadSingleFileTest();
        await new Promise((resolve, reject) => {
            s3.listObjects({Bucket: testBucket}, (err, objects) => {
                if (err) reject()
                const files = objects?.Contents || []
                expect(files[0]?.Key).toEqual(responseData.id)
                resolve(0)
            })
        })
    })

    it("should upload multiple files to S3", async ()=> {
        const responseData = await uploadMultipleFilesTest();
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
