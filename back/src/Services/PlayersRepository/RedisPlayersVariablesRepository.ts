import { promisify } from "util";
import { RedisClient } from "redis";
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
    private readonly hgetall: OmitThisParameter<(arg1: string) => Promise<{ [p: string]: string }>>;
    private readonly hset: OmitThisParameter<(arg1: [string, ...string[]]) => Promise<number>>;
    private readonly hdel: OmitThisParameter<(arg1: string, arg2: string) => Promise<number>>;
    private readonly expire: OmitThisParameter<(arg1: string, arg2: number) => Promise<number>>;
    //private readonly scan: OmitThisParameter<(arg1: string, arg2: string, arg3: string) => Promise<[string, string[]]>>;

    constructor(private redisClient: RedisClient) {
        /* eslint-disable @typescript-eslint/unbound-method */
        this.hgetall = promisify(redisClient.hgetall).bind(redisClient);
        this.hset = promisify(redisClient.hset).bind(redisClient);
        this.hdel = promisify(redisClient.hdel).bind(redisClient);
        this.expire = promisify(redisClient.expire).bind(redisClient);

        //this.scan = promisify(redisClient.scan).bind(redisClient);
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    // FIXME: SCAN TAKES O(N). BAAAAAD!
    // So we need to use HSET... maybe store TTL inside?
    // This means scanning regularly to remove old keys?
    /*private async scanAll(pattern: string) {
        const found = [];
        let cursor = '0';

        do {
            const reply = await this.scan(cursor, 'MATCH', pattern);

            cursor = reply[0];
            found.push(...reply[1]);
        } while (cursor !== '0');

        return found;
    }*/

    /**
     * Load all variables for a user in a room / world.
     */
    async loadVariables(hashKey: string): LoadVariablesReturn {
        const variables = await this.hgetall(hashKey);

        const map = new Map<string, VariableWithScope>();

        const now = new Date().getTime();

        let maxExpire: number | undefined = 0;
        console.log("RESULT OF HGETALL for key: ", hashKey, variables);
        for (const entry of Object.entries(variables ?? [])) {
            const key = entry[0];
            const [expireStr, isPublicStr, value] = entry[1].split(":", 3);
            if (isPublicStr === undefined || value === undefined) {
                console.error(
                    'Invalid value stored in Redis. Expecting the value to be in the "ttl:0|1:value" format. Got: ',
                    entry[1]
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
                    continue;
                }

                // Let's check the TTL. If it is less than current date, let's remove the key.
                if (expire < now) {
                    this.hdel(hashKey, key).catch((e) => console.error(e));
                    continue;
                }

                if (expire === undefined) {
                    maxExpire === undefined;
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
            await this.hdel(redisKey, key);
            return;
        }

        const storedValue =
            (expire !== undefined ? expire.toString() : "") + ":" + (isPublic ? "1" : "0") + ":" + value;

        // TODO: SLOW WRITING EVERY 2 SECONDS WITH A TIMEOUT

        // @ts-ignore See https://stackoverflow.com/questions/63539317/how-do-i-use-hmset-with-node-promisify
        await this.hset(redisKey, key, storedValue);
        if (maxExpire !== undefined) {
            this.expire(redisKey, Math.floor((maxExpire - new Date().getTime()) / 1000)).catch((e) =>
                console.error("Failed calling EXPIRE", e)
            );
        }
    }
}
