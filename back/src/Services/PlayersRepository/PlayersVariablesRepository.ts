import { RedisPlayersVariablesRepository } from "./RedisPlayersVariablesRepository";
import { redisClient } from "../RedisClient";
import { VoidPlayersVariablesRepository } from "./VoidPlayersVariablesRepository";
import { PlayersVariablesRepositoryInterface } from "./PlayersVariablesRepositoryInterface";

let playersVariablesRepository: PlayersVariablesRepositoryInterface;
if (!redisClient) {
    console.warn("WARNING: Redis is not configured. No players variables will be persisted.");
    playersVariablesRepository = new VoidPlayersVariablesRepository();
} else {
    playersVariablesRepository = new RedisPlayersVariablesRepository(redisClient);
}

export { playersVariablesRepository };
