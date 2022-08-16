import {
    LoadVariablesReturn,
    PlayersVariablesRepositoryInterface,
    VariableWithScope,
} from "./PlayersVariablesRepositoryInterface";

/**
 * Mock class in charge of NOT saving/loading variables from the data store
 */
export class VoidPlayersVariablesRepository implements PlayersVariablesRepositoryInterface {
    loadVariables(hashKey: string): LoadVariablesReturn {
        return Promise.resolve({
            maxExpire: undefined,
            variables: new Map<string, VariableWithScope>(),
        });
    }

    saveVariable(
        redisKey: string,
        key: string,
        value: string,
        isPublic: boolean,
        expire?: number,
        maxExpire?: number
    ): Promise<void> {
        return Promise.resolve();
    }
}
