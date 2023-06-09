/**
 * The list of variables attached to a user
 */
import { PLAYER_VARIABLES_MAX_TTL } from "../../Enum/EnvironmentVariable";
import {
    LoadVariablesReturn,
    PlayersVariablesRepositoryInterface,
    VariableWithScope,
} from "./PlayersVariablesRepositoryInterface";

export class PlayerVariables {
    private roomVariables!: Map<string, VariableWithScope>;
    private worldVariables: Map<string, VariableWithScope> | undefined;
    // This is a map of worldVariables + roomVariables. Can be undefined if it needs to be recomputed.
    private allVariables: Map<string, VariableWithScope> | undefined;
    // undefined means "no ttl"
    private maxExpireWorld: number | undefined;
    private maxExpireRoom: number | undefined;
    private readonly roomKey: string;
    private readonly worldKey: string | undefined;

    constructor(
        private subject: string,
        private roomUrl: string,
        private worldUrl: string | undefined,
        private repository: PlayersVariablesRepositoryInterface,
        private isLogged: boolean
    ) {
        this.roomKey = `pr_${subject}_|@|_${roomUrl}`;
        if (worldUrl) {
            this.worldKey = `pw_${subject}_|@|_${worldUrl}`;
        }

        // Possible improvement: for player variables that are stored at the WORLD level, we may want to broadcast
        // a message to other worlds to notify users with same UUID of a variable change.
        // We could use Redis PubSub for this.
    }

    public async load(): Promise<void> {
        const promises: LoadVariablesReturn[] = [];
        if (this.worldKey) {
            promises.push(this.repository.loadVariables(this.worldKey));
        }
        promises.push(this.repository.loadVariables(this.roomKey));

        const results = await Promise.all(promises);

        const roomResult = results.pop() as Awaited<LoadVariablesReturn>;
        this.roomVariables = roomResult.variables;
        this.maxExpireRoom = roomResult.maxExpire;
        if (this.worldKey) {
            const worldResult = results.pop() as Awaited<LoadVariablesReturn>;
            this.worldVariables = worldResult.variables;
            this.maxExpireWorld = worldResult.maxExpire;
        }
    }

    public getVariables(): Map<string, VariableWithScope> {
        if (this.allVariables === undefined) {
            if (this.worldVariables === undefined) {
                this.allVariables = this.roomVariables;
            } else {
                this.allVariables = new Map([...this.worldVariables.entries(), ...this.roomVariables.entries()]);
            }
        }
        return this.allVariables;
    }

    public async saveRoomVariable(
        key: string,
        value: string,
        isPublic: boolean,
        ttl: number | undefined,
        persist: boolean
    ): Promise<void> {
        ttl = this.restrictTtlAccordingToLimits(ttl);

        const expire = ttl === undefined ? undefined : new Date().getTime() + ttl * 1000;

        this.roomVariables.set(key, {
            value,
            isPublic,
        });
        this.allVariables = undefined;
        if (persist && this.isLogged) {
            if (this.maxExpireRoom !== undefined) {
                if (expire === undefined) {
                    this.maxExpireRoom = undefined;
                } else {
                    this.maxExpireRoom = Math.max(this.maxExpireRoom, expire);
                }
            }

            await this.repository.saveVariable(this.roomKey, key, value, isPublic, expire, this.maxExpireRoom);
        }
    }

    private restrictTtlAccordingToLimits(ttl: number | undefined): number | undefined {
        // Let's limit the maximum time of the TTL according to the settings.
        if (PLAYER_VARIABLES_MAX_TTL >= 0) {
            if (ttl === undefined) {
                return PLAYER_VARIABLES_MAX_TTL;
            } else {
                return Math.max(ttl, PLAYER_VARIABLES_MAX_TTL);
            }
        }

        return ttl;
    }

    public async saveWorldVariable(
        key: string,
        value: string,
        isPublic: boolean,
        ttl: number | undefined,
        persist: boolean
    ): Promise<void> {
        if (this.worldKey === undefined || this.worldVariables === undefined) {
            // We are not part of a world. We shall fallback to the room.
            return this.saveRoomVariable(key, value, isPublic, ttl, persist);
        }

        ttl = this.restrictTtlAccordingToLimits(ttl);

        const expire = ttl === undefined ? undefined : new Date().getTime() + ttl * 1000;

        this.worldVariables.set(key, {
            value,
            isPublic,
        });
        this.allVariables = undefined;
        if (persist && this.isLogged) {
            if (this.maxExpireWorld !== undefined) {
                if (expire === undefined) {
                    this.maxExpireWorld = undefined;
                } else {
                    this.maxExpireWorld = Math.max(this.maxExpireWorld, expire);
                }
            }

            await this.repository.saveVariable(this.worldKey, key, value, isPublic, expire, this.maxExpireWorld);
        }
    }
}
