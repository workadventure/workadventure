// import App from "../src/App";
import {ChildProcess} from "child_process"
import axios from "axios";
import {StartedTestContainer} from "testcontainers";
import {createClient} from "redis";
import {describe, expect, jest, it, beforeAll, afterAll} from '@jest/globals';
import {PLAY_URL} from "../src/Enum/EnvironmentVariable";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders";
import {uploadFile} from "./utils/uploadFile";
import {download} from "./utils/download";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon";
import {RedisContainer} from "./utils/RedisContainer";
import isPortReachable from "./utils/isPortReachable";
import startTestServer from "./startTestServer";

const APP_PORT = 7373

jest.mock('../src/Enum/EnvironmentVariable', () => ({
    get PLAY_URL() {
        return "http://play.location"
    }
}))

describe("Redis Uploader tests", () => {
    let redisContainer:StartedTestContainer
    let server: ChildProcess| undefined;
    jest.setTimeout(20000)
    const redisPort = 6379
    const UPLOADER_URL = "http://localhost:7373"
    beforeAll(async ()=> {
        redisContainer = await new RedisContainer()
            .port(redisPort)
            .start();

         server = startTestServer({
            REDIS_HOST: "localhost",
            REDIS_PORT: redisPort.toString(),
            ENABLE_CHAT_UPLOAD: "true",
            UPLOADER_URL: UPLOADER_URL,
            PLAY_URL: PLAY_URL
         })
        await isPortReachable(APP_PORT, {host: "localhost"})
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
        await redisContainer?.stop()
    })

    it("should reply options with 204", async ()=> {
        const response = await axios.options(`${UPLOADER_URL}/upload-file`)

        expect(response.status).toBe(204)
        verifyResponseHeaders(response);
    })

    it("should upload one file to redis", async ()=> {
        const responseData = await uploadSingleFileTest(UPLOADER_URL);

        const redisClient = createClient({
            url: `redis://localhost:6379/0`,
        });
        redisClient.on('error', (err: unknown) => console.error('Redis Client Error', err));
        await redisClient.connect();

        const actual = await redisClient.get(responseData.id)
        await redisClient.quit()

        expect(actual?.toString()).toEqual("file contents")
    })

    it("should upload multiple files to redis", async ()=> {
        await uploadMultipleFilesTest(UPLOADER_URL);
    })


    it("should upload and download audio message file to redis", async ()=> {
        const uploadResponse = await uploadFile(
            `${UPLOADER_URL}/upload-audio-message`,
            [{name: "temp-server.txt", contents: "temp file contents"}]);

        expect(uploadResponse.status).toBe(200)
        verifyResponseHeaders(uploadResponse);

        const data = uploadResponse.data
        expect(data.path).toEqual(`/download-audio-message/${data.id}`)

        const tempFileUrl = `${UPLOADER_URL}/download-audio-message/${data.id}`;
        expect(await download(tempFileUrl)).toEqual("temp file contents")
    })
})
