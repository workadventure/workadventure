import App from "../src/App";
import {TemplatedApp} from "uWebSockets.js";
import axios, {AxiosResponse} from "axios";
import {GenericContainer, StartedTestContainer} from "testcontainers";
import * as redis from "redis"
import isPortReachable from "./is-port-reachable";
import FormData from 'form-data';
import {CHAT_URL, UPLOADER_URL} from "../src/Enum/EnvironmentVariable";
import {redisStorageProvider} from "../src/Service/RedisStorageProvider";

const APP_PORT = 7373

jest.mock("redis", ()=> {
    let mockLazyConnect = ()=>{}
    const actualRedis = jest.requireActual("redis")

    return {
        // Mock control method to actually connect
        originalConnect: ()=> {
            mockLazyConnect()
        },
        createClient: (...args: never)=> {
            const original = actualRedis.createClient.apply(args)
            mockLazyConnect = original.connect.bind(original)
            // Disables connect because we don't want the storage to connect to redis until it's actually available
            original.connect = jest.fn()
            return original
        },
        commandOptions: actualRedis.commandOptions
    }
})

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
    let app:TemplatedApp|undefined
    let redisContainer:StartedTestContainer
    beforeAll(async ()=> {
        redisContainer = await new GenericContainer("redis:6")
          .withExposedPorts({ container: 6379, host: 6379})
          .start();

        await new Promise(resolve => {
            app = App.listen(APP_PORT, resolve)
        })
        await isPortReachable(6379, { host: 'localhost' , timeout: 10000})
        //@ts-ignore ignore error because originalConnect is our control method
        redis.originalConnect()

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
        const response = await uploadFile(
            `${UPLOADER_URL}/upload-file`,
            [{name: "upload-subject1.txt", contents: "file contents"}]
            );

        expect(response.status).toBe(200)
        verifyResponseHeaders(response);

        const data = response.data[0]
        expect(data.location).toEqual(`${UPLOADER_URL}/upload-file/${data.id}`)

        const actual = await redisStorageProvider?.get(data.id)
        expect(actual?.toString()).toEqual("file contents")

        expect(await download(data.location)).toEqual("file contents")
    })

    it("should upload multiple files to redis", async ()=> {
        const response = await uploadFile(
            `${UPLOADER_URL}/upload-file`,[
                {name: "upload-subject1.txt", contents: "first file contents"},
                {name: "upload-subject2.txt", contents: "second file contents"}
            ]);
        expect(response.data.length).toEqual(2)

        const file1 = response.data[0]
        expect(file1.location).toEqual(`${UPLOADER_URL}/upload-file/${file1.id}`)

        const file2 = response.data[1]
        expect(file2.location).toEqual(`${UPLOADER_URL}/upload-file/${file2.id}`)

        expect(await download(file1.location)).toEqual("first file contents")
        expect(await download(file2.location)).toEqual("second file contents")
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

    async function uploadFile(uploadUrl: string, fileList: {name: string, contents: string}[]) {
        const formData = new FormData();
        fileList.forEach(entry => {
            const fileBuffer = Buffer.from(entry.contents, "utf-8")
            formData.append('file', fileBuffer, entry.name);
        })

        return await axios.post(uploadUrl, formData.getBuffer(), {
            headers: formData.getHeaders()
        });
    }

    async function download(url: string) {
        const res = await axios.get(url)
        expect(res.status).toBe(200)
        return res.data
    }

    function verifyResponseHeaders(response: AxiosResponse) {
        expect(response.headers['access-control-allow-headers']).toEqual("Origin, X-Requested-With, Content-Type, Accept")
        expect(response.headers['access-control-allow-methods']).toEqual('GET, POST, OPTIONS, PUT, PATCH, DELETE')
        expect(response.headers['access-control-allow-origin']).toEqual(CHAT_URL)
    }
})
