import {GenericContainer} from "testcontainers";
import isPortReachable from "./isPortReachable";

export class RedisContainer extends GenericContainer {
    private static readonly REDIS_PORT = 6379;

    constructor() {
        super("redis:6");
        this.withExposedPorts(RedisContainer.REDIS_PORT);
    }

    async start() {
        const startedTestContainer = await super.start()
        await isPortReachable(startedTestContainer.getMappedPort(RedisContainer.REDIS_PORT), {
            host: startedTestContainer.getHost(),
            timeout: 30000
        })
        return startedTestContainer
    }
}
