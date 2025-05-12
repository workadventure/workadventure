import { asError } from "catch-unknown";
import { getRedisClient } from "../RedisClient";
import { RedisPlayersVariablesRepository } from "./RedisPlayersVariablesRepository";
import { VoidPlayersVariablesRepository } from "./VoidPlayersVariablesRepository";
import { PlayersVariablesRepositoryInterface } from "./PlayersVariablesRepositoryInterface";

let playerVariablesRepositoryPromise: Promise<PlayersVariablesRepositoryInterface> | undefined;

export async function getPlayersVariablesRepository(): Promise<PlayersVariablesRepositoryInterface> {
    if (playerVariablesRepositoryPromise) {
        return playerVariablesRepositoryPromise;
    }

    playerVariablesRepositoryPromise = new Promise<PlayersVariablesRepositoryInterface>((resolve, reject) => {
        getRedisClient()
            .then((redisClient) => {
                if (!redisClient) {
                    console.warn("WARNING: Redis is not configured. No players variables will be persisted.");
                    resolve(new VoidPlayersVariablesRepository());
                } else {
                    resolve(new RedisPlayersVariablesRepository(redisClient));
                }
            })
            .catch((err) => {
                reject(asError(err));
            });
    });
    return playerVariablesRepositoryPromise;
}
