import { promisify } from "util";
import { RedisClient } from "redis";
import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface";

/**
 * Class in charge of saving/loading variables from the data store
 */
export class RedisVariablesRepository implements VariablesRepositoryInterface {
    private readonly hgetall: OmitThisParameter<(arg1: string) => Promise<{ [p: string]: string }>>;
    private readonly hset: OmitThisParameter<(arg1: [string, ...string[]]) => Promise<number>>;

    constructor(redisClient: RedisClient) {
        // @eslint-disable-next-line @typescript-eslint/unbound-method
        this.hgetall = promisify(redisClient.hgetall).bind(redisClient);
        // @eslint-disable-next-line @typescript-eslint/unbound-method
        this.hset = promisify(redisClient.hset).bind(redisClient);
    }

    /**
     * Load all variables for a room.
     *
     * Note: in Redis, variables are stored in a hashmap and the key is the roomUrl
     */
    async loadVariables(roomUrl: string): Promise<{ [key: string]: string }> {
        return this.hgetall(roomUrl);
    }

    async saveVariable(roomUrl: string, key: string, value: string): Promise<number> {
        // TODO: handle the case for "undefined"
        // TODO: handle the case for "undefined"
        // TODO: handle the case for "undefined"
        // TODO: handle the case for "undefined"
        // TODO: handle the case for "undefined"

        // TODO: SLOW WRITING EVERY 2 SECONDS WITH A TIMEOUT

        // @ts-ignore See https://stackoverflow.com/questions/63539317/how-do-i-use-hmset-with-node-promisify
        return this.hset(roomUrl, key, value);
    }
}
