import {AxiosResponse} from "axios";
import {expect} from '@jest/globals';
import {PLAY_URL} from "../../src/Enum/EnvironmentVariable";
export function verifyResponseHeaders(response: AxiosResponse) {
    //expect(response.headers['access-control-allow-headers']).toEqual("Origin, X-Requested-With, Content-Type, Accept, Authorization, Pragma, Cache-Control")
    //expect(response.headers['access-control-allow-methods']).toEqual('GET, POST, OPTIONS, PUT, PATCH, DELETE')
    expect(response.headers['access-control-allow-origin']).toEqual(PLAY_URL)
}
