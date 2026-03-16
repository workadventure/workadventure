// import App from "../src/App";
import {ChildProcess} from "child_process"
import axios from "axios";
import {StartedTestContainer} from "testcontainers";
import {createClient} from "redis";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import {PLAY_URL} from "../src/Enum/EnvironmentVariable.ts";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders.ts";
import {uploadFile} from "./utils/uploadFile.ts";
import {download} from "./utils/download.ts";
import {uploadMultipleFilesTest, uploadSingleFileTest} from "./UploaderTestCommon.ts";
import {RedisContainer} from "./utils/RedisContainer.ts";
import isPortReachable from "./utils/isPortReachable.ts";
import startTestServer from "./startTestServer.ts";
import {isDockerAvailable} from "./utils/isDockerAvailable.ts";
import findAvailablePort from "./utils/findAvailablePort.ts";

vi.mock("../src/Enum/EnvironmentVariable.ts", () => ({
    get PLAY_URL() {
        return "http://play.location";
    },
}));

const describeIfDocker = isDockerAvailable() ? describe : describe.skip;

describeIfDocker("Redis Uploader tests", () => {
    let redisContainer:StartedTestContainer
    let server: ChildProcess| undefined;
    let appPort: number;
    const redisPort = 6379
    beforeAll(async ()=> {
        appPort = await findAvailablePort();
        redisContainer = await new RedisContainer()
            .port(redisPort)
            .start();

        const uploaderUrl = `http://localhost:${appPort}`;
         server = startTestServer({
            SERVER_PORT: appPort.toString(),
            REDIS_HOST: "localhost",
            REDIS_PORT: redisPort.toString(),
            ENABLE_CHAT_UPLOAD: "true",
            UPLOADER_URL: uploaderUrl,
            PLAY_URL: PLAY_URL
         })
        await isPortReachable(appPort, {host: "localhost"})
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
        const uploaderUrl = `http://localhost:${appPort}`;
        const response = await axios.options(`${uploaderUrl}/upload-file`)

        expect(response.status).toBe(204)
        verifyResponseHeaders(response);
    })

    it("should upload one file to redis", async ()=> {
        const responseData = await uploadSingleFileTest(`http://localhost:${appPort}`);

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
        await uploadMultipleFilesTest(`http://localhost:${appPort}`);
    })


    it("should upload and download audio message file to redis", async ()=> {
        const uploaderUrl = `http://localhost:${appPort}`;
        const uploadResponse = await uploadFile(
            `${uploaderUrl}/upload-audio-message`,
            [{name: "temp-server.txt", contents: "temp file contents"}]);

        expect(uploadResponse.status).toBe(200)
        verifyResponseHeaders(uploadResponse);

        const data = uploadResponse.data
        expect(data.path).toEqual(`/download-audio-message/${data.id}`)

        const tempFileUrl = `${uploaderUrl}/download-audio-message/${data.id}`;
        expect(await download(tempFileUrl)).toEqual("temp file contents")
    })
})
