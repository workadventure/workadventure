import { RedisPlayersVariablesRepository } from "./RedisPlayersVariablesRepository";
import { getRedisClient } from "../RedisClient";
import { VoidPlayersVariablesRepository } from "./VoidPlayersVariablesRepository";
import { PlayersVariablesRepositoryInterface } from "./PlayersVariablesRepositoryInterface";

let playerVariablesRepository: PlayersVariablesRepositoryInterface | undefined;

export async function getPlayersVariablesRepository(): Promise<PlayersVariablesRepositoryInterface> {
    if (playerVariablesRepository) {
        return playerVariablesRepository;
    }

    const redisClient = await getRedisClient();
    if (!redisClient) {
        console.warn("WARNING: Redis is not configured. No players variables will be persisted.");
        return (playerVariablesRepository = new VoidPlayersVariablesRepository());
    } else {
        return (playerVariablesRepository = new RedisPlayersVariablesRepository(redisClient));
    }
}
