import * as Sentry from "@sentry/node";
import { RedisClient } from "../RedisClient";
import {
    LoadVariablesReturn,
    PlayersVariablesRepositoryInterface,
    VariableWithScope,
} from "./PlayersVariablesRepositoryInterface";

/**
 * Class in charge of saving/loading variables relative to a player in DB.
 *
 * Data is stored in Redis, in a Hashmap.
 *
 * The key is made of user's "subject" (as in OpenID Connect subject) + world or room URL
 * The key of the maps is the variable names
 * The value is in the form: "TTL:isPublic:JsonString"
 * Note: TTL empty means "no TTL"
 *       isPublic is "1" or "0"
 */
export class RedisPlayersVariablesRepository implements PlayersVariablesRepositoryInterface {
    constructor(private redisClient: RedisClient) {}

    /**
     * Load all variables for a user in a room / world.
     */
    async loadVariables(hashKey: string): LoadVariablesReturn {
        const variables = await this.redisClient.hGetAll(hashKey);

        const map = new Map<string, VariableWithScope>();

        const now = new Date().getTime();

        let maxExpire: number | undefined = 0;
        for (const entry of Object.entries(variables ?? [])) {
            const key = entry[0];
            const [expireStr, isPublicStr] = entry[1].split(":", 2);
            const value = entry[1].split(":").slice(2).join(":");
            if (isPublicStr === undefined || value === undefined) {
                console.error(
                    'Invalid value stored in Redis. Expecting the value to be in the "ttl:0|1:value" format. Got: ',
                    entry[1]
                );
                Sentry.captureException(
                    `Invalid value stored in Redis. Expecting the value to be in the "ttl:0|1:value" format. Got: 
                    ${entry[1]}`
                );
                continue;
            }
            let isPublic: boolean;
            if (isPublicStr === "0") {
                isPublic = false;
            } else if (isPublicStr === "1") {
                isPublic = true;
            } else {
                console.error('Invalid value stored in Redis for isPublic. Expecting "0" or "1"');
                Sentry.captureException('Invalid value stored in Redis for isPublic. Expecting "0" or "1"');
                continue;
            }
            let expire: number | undefined;
            if (expireStr === "") {
                expire = undefined;
                maxExpire = undefined;
            } else {
                expire = parseInt(expireStr);
                if (isNaN(expire)) {
                    console.error("Invalid value stored in Redis. The TTL is not a number");
                    Sentry.captureException("Invalid value stored in Redis. The TTL is not a number");
                    continue;
                }

                // Let's check the TTL. If it is less than current date, let's remove the key.
                if (expire < now) {
                    this.redisClient.hDel(hashKey, key).catch((e) => {
                        console.error(e);
                        Sentry.captureException(e);
                    });
                    continue;
                }

                if (expire === undefined) {
                    maxExpire = undefined;
                } else if (maxExpire !== undefined) {
                    maxExpire = Math.max(expire, maxExpire);
                }
            }

            map.set(key, {
                value,
                isPublic,
            });
        }

        return {
            maxExpire,
            variables: map,
        };
    }

    public async saveVariable(
        redisKey: string,
        key: string,
        value: string,
        isPublic: boolean,
        expire?: number,
        maxExpire?: number
    ): Promise<void> {
        // The value is passed to JSON.stringify client side. If value is "undefined", JSON.stringify returns "undefined"
        // which is translated to empty string when fetching the value in the pusher.
        // Therefore, empty string server side == undefined client side.
        if (value === "") {
            await this.redisClient.hDel(redisKey, key);
            return;
        }

        const storedValue =
            (expire !== undefined ? expire.toString() : "") + ":" + (isPublic ? "1" : "0") + ":" + value;

        // TODO: SLOW WRITING EVERY 2 SECONDS WITH A TIMEOUT

        await this.redisClient.hSet(redisKey, key, storedValue);
        console.log("Saved variable to Redis: ", redisKey, key, storedValue);
        if (maxExpire !== undefined) {
            this.redisClient.expire(redisKey, Math.floor((maxExpire - new Date().getTime()) / 1000)).catch((e) => {
                console.error("Failed calling EXPIRE", e);
                Sentry.captureException(`Failed calling EXPIRE ${JSON.stringify(e)}`);
            });
        }
    }
}
