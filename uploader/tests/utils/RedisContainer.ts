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
        this.withExposedPorts({ container: this.redisPort, host: this.redisPort})
        const startedTestContainer = await super.start()
        await isPortReachable(this.redisPort, { host: 'localhost' , timeout: 30000})
        return startedTestContainer
    }
}
