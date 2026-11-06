// import App from "../src/App";
import type {ChildProcess} from "child_process"
import axios from "axios";
import type {StartedTestContainer} from "testcontainers";
import {describe, expect, vi, it, beforeAll, afterAll} from 'vitest';
import {PLAY_URL} from "../src/Enum/EnvironmentVariable";
import {verifyResponseHeaders} from "./utils/verifyResponseHeaders";
import {uploadFile} from "./utils/uploadFile";
import {download} from "./utils/download";
import {RedisContainer} from "./utils/RedisContainer";
import isPortReachable from "./utils/isPortReachable";
import startTestServer, {stopTestServer} from "./startTestServer";

const APP_PORT = 7373
const UPLOAD_MAX_FILESIZE = 1024

interface AudioMessageResponse {
    id: string;
    path: string;
}

vi.mock('../src/Enum/EnvironmentVariable', () => ({
    get PLAY_URL() {
        return "http://play.location"
    }
}))

describe("Redis Uploader tests", () => {
    let redisContainer:StartedTestContainer
    let server: ChildProcess| undefined;
    vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })
    const UPLOADER_URL = "http://localhost:7373"
    beforeAll(async ()=> {
        redisContainer = await new RedisContainer().start();

        const redisHost = redisContainer.getHost();
        const redisPort = redisContainer.getMappedPort(6379);

         server = startTestServer({
            REDIS_HOST: redisHost,
            REDIS_PORT: redisPort.toString(),
            UPLOAD_MAX_FILESIZE: UPLOAD_MAX_FILESIZE.toString(),
            PLAY_URL: PLAY_URL
         })
        await isPortReachable(APP_PORT, {host: "localhost"})
    })

    afterAll(async ()=> {
        await stopTestServer(server)
        await redisContainer?.stop()
    })

    it("should reply options with 204", async ()=> {
        const response = await axios.options(`${UPLOADER_URL}/upload-audio-message`)

        expect(response.status).toBe(204)
        verifyResponseHeaders(response);
    })

    it("should not expose the removed file upload routes", async ()=> {
        const upload = await uploadFile(
            `${UPLOADER_URL}/upload-file`,
            [{name: "file.txt", contents: "file contents"}],
            {validateStatus: () => true}
        );
        expect(upload.status).toBe(404)

        const downloadResponse = await axios.get(`${UPLOADER_URL}/upload-file/some-id`, {validateStatus: () => true})
        expect(downloadResponse.status).toBe(404)
    })

    it("should refuse an audio message bigger than the limit", async ()=> {
        const tooBig = "a".repeat(UPLOAD_MAX_FILESIZE + 1);

        const response = await uploadFile(
            `${UPLOADER_URL}/upload-audio-message`,
            [{name: "too-big.mp3", contents: tooBig}],
            {validateStatus: () => true}
        );

        expect(response.status).toBe(413)
    })

    it("should upload and download audio message file to redis", async ()=> {
        const uploadResponse = await uploadFile<AudioMessageResponse>(
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
