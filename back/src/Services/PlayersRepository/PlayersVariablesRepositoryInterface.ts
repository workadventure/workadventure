export interface VariableWithScope {
    value: string;
    isPublic: boolean;
}

export type LoadVariablesReturn = Promise<{
    maxExpire: number | undefined;
    variables: Map<string, VariableWithScope>;
}>;

export interface PlayersVariablesRepositoryInterface {
    /**
     * Load all variables for a user in a given room.
     *
     * Note: in Redis, variables are stored in a hashmap and the key is the subject+roomUrl or subject+worldUrl
     */
    loadVariables(hashKey: string): LoadVariablesReturn;

    /**
     *
     * @param redisKey
     * @param key
     * @param value
     * @param isPublic
     * @param expire In milliseconds
     * @param maxExpire In milliseconds (maximum expire time of all the keys)
     */
    saveVariable(
        redisKey: string,
        key: string,
        value: string,
        isPublic: boolean,
        expire?: number,
        maxExpire?: number
    ): Promise<void>;
}
