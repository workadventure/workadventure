import {GenericContainer} from "testcontainers";
import isPortReachable from "./isPortReachable";

export class RedisContainer extends GenericContainer {
    private redisPort = 0
    constructor() {
        super("redis:6");
    }
    port(port: number) {
        this.redisPort = port
        return this
    }

    async start() {
        // testcontainers doesn't recommend mapping host port, but because of jest mocking constant
        // we need to know the host port beforehand
        this.withExposedPorts({ container: this.redisPort, host: this.redisPort})

        const startedTestContainer = await super.start()
        await isPortReachable(this.redisPort, { host: 'localhost' , timeout: 10000})
        return startedTestContainer
    }
}
