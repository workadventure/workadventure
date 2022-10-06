// import App from "../src/App";
import axios from "axios";
import {StartedTestContainer} from "testcontainers";
import {REDIS_PORT, UPLOADER_URL} from "../src/Enum/EnvironmentVariable";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders";
import {uploadFile} from "./utils/uploadFile";
import {download} from "./utils/download";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon";
import {RedisContainer} from "./utils/RedisContainer";

const APP_PORT = 7373

jest.mock('../src/Enum/EnvironmentVariable', () => ({
    get REDIS_HOST () {
        return "localhost"
    },
    get REDIS_PORT() {
        return 6379
    },
    get ENABLE_CHAT_UPLOAD() {
        return true
    },
    get UPLOADER_URL() {
        return `http://localhost:7373`
    },
    get CHAT_URL() {
        return "http://chat.location"
    }
}))

describe("Redis Uploader tests", () => {
    let redisContainer:StartedTestContainer
    const redisPort = parseInt(REDIS_PORT || "0")
    beforeAll(async ()=> {
        redisContainer = await new RedisContainer()
            .port(redisPort)
            .start();

        const App = await require("../src/App").default
        await new Promise( resolve => {
            App.listen(APP_PORT, resolve)
        })
    })

    afterAll(()=> {
        redisContainer?.stop()
    })

    it("should reply options with 200", async ()=> {
        const response = await axios.options(`${UPLOADER_URL}/upload-file`)

        expect(response.status).toBe(200)
        verifyResponseHeaders(response);
    })

    it("should upload one file to redis", async ()=> {
        const responseData = await uploadSingleFileTest();

        const redisStorageProvider = await require("../src/Service/RedisStorageProvider").redisStorageProvider;
        const actual = await redisStorageProvider?.get(responseData.id)

        expect(actual?.toString()).toEqual("file contents")
    })

    it("should upload multiple files to redis", async ()=> {
        await uploadMultipleFilesTest();
    })


    it("should upload and download audio message file  to redis", async ()=> {
        const uploadResponse = await uploadFile(
            `${UPLOADER_URL}/upload-audio-message`,
            [{name: "temp-subject.txt", contents: "temp file contents"}]);

        expect(uploadResponse.status).toBe(200)
        verifyResponseHeaders(uploadResponse);

        const data = uploadResponse.data
        expect(data.path).toEqual(`/download-audio-message/${data.id}`)

        const tempFileUrl = `${UPLOADER_URL}/download-audio-message/${data.id}`;
        expect(await download(tempFileUrl)).toEqual("temp file contents")
    })
})
