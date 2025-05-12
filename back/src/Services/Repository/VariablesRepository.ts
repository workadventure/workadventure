import { asError } from "catch-unknown";
import { getRedisClient } from "../RedisClient";
import { RedisVariablesRepository } from "./RedisVariablesRepository";
import { VoidVariablesRepository } from "./VoidVariablesRepository";
import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface";

let variablesRepositoryPromise: Promise<VariablesRepositoryInterface> | undefined;

export async function getVariablesRepository(): Promise<VariablesRepositoryInterface> {
    if (variablesRepositoryPromise) {
        return variablesRepositoryPromise;
    }

    variablesRepositoryPromise = new Promise<VariablesRepositoryInterface>((resolve, reject) => {
        getRedisClient()
            .then((redisClient) => {
                if (!redisClient) {
                    console.warn("WARNING: Redis is not configured. No variables will be persisted.");
                    resolve(new VoidVariablesRepository());
                } else {
                    resolve(new RedisVariablesRepository(redisClient));
                }
            })
            .catch((err) => {
                reject(asError(err));
            });
    });
    return variablesRepositoryPromise;
}
