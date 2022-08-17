import { RedisVariablesRepository } from "./RedisVariablesRepository";
import { getRedisClient } from "../RedisClient";
import { VoidVariablesRepository } from "./VoidVariablesRepository";
import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface";

let variablesRepository: VariablesRepositoryInterface | undefined;

export async function getVariablesRepository(): Promise<VariablesRepositoryInterface> {
    if (variablesRepository) {
        return variablesRepository;
    }

    const redisClient = await getRedisClient();
    if (!redisClient) {
        console.warn("WARNING: Redis is not configured. No variables will be persisted.");
        return (variablesRepository = new VoidVariablesRepository());
    } else {
        return (variablesRepository = new RedisVariablesRepository(redisClient));
    }
}
