import { RedisVariablesRepository } from "./RedisVariablesRepository.js";
import { getRedisClient } from "../RedisClient.js";
import { VoidVariablesRepository } from "./VoidVariablesRepository.js";
import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface.js";

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
