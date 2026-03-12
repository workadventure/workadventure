import { asError } from "catch-unknown";
import { getRedisClient } from "../RedisClient.ts";
import { RedisPlayersVariablesRepository } from "./RedisPlayersVariablesRepository.ts";
import { VoidPlayersVariablesRepository } from "./VoidPlayersVariablesRepository.ts";
import type { PlayersVariablesRepositoryInterface } from "./PlayersVariablesRepositoryInterface.ts";

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
