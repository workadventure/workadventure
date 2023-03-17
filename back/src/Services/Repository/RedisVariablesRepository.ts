import { RedisClient } from "../RedisClient";
import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface";

/**
 * Class in charge of saving/loading variables from the data store
 */
export class RedisVariablesRepository implements VariablesRepositoryInterface {
    constructor(private redisClient: RedisClient) {}

    /**
     * Load all variables for a room.
     *
     * Note: in Redis, variables are stored in a hashmap and the key is the roomUrl
     */
    async loadVariables(roomUrl: string): Promise<{ [key: string]: string }> {
        return this.redisClient.hGetAll(roomUrl);
    }

    async saveVariable(roomUrl: string, key: string, value: string): Promise<number> {
        // The value is passed to JSON.stringify client side. If value is "undefined", JSON.stringify returns "undefined"
        // which is translated to empty string when fetching the value in the pusher.
        // Therefore, empty string server side == undefined client side.
        if (value === "") {
            return this.redisClient.hDel(roomUrl, key);
        }

        // TODO: SLOW WRITING EVERY 2 SECONDS WITH A TIMEOUT

        return this.redisClient.hSet(roomUrl, key, value);
    }
}
