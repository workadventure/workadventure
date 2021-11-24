import { RedisVariablesRepository } from "./RedisVariablesRepository";
import { redisClient } from "../RedisClient";
import { VoidVariablesRepository } from "./VoidVariablesRepository";
import { VariablesRepositoryInterface } from "./VariablesRepositoryInterface";
import log from "../../Services/Logger";

let variablesRepository: VariablesRepositoryInterface;
if (!redisClient) {
    log.warn("WARNING: Redis isnot configured. No variables will be persisted.");
    variablesRepository = new VoidVariablesRepository();
} else {
    variablesRepository = new RedisVariablesRepository(redisClient);
}

export { variablesRepository };
