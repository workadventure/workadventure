/**
 * The list of variables attached to a user
 */
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
        private repository: PlayersVariablesRepositoryInterface
    ) {
        this.roomKey = `pr_${subject}_|@|_${roomUrl}`;
        if (worldUrl) {
            this.worldKey = `pw_${subject}_|@|_${worldUrl}`;
        }
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
        const expire = ttl === undefined ? undefined : new Date().getTime() + ttl * 1000;

        if (this.maxExpireRoom !== undefined) {
            if (expire === undefined) {
                this.maxExpireRoom = undefined;
            } else {
                this.maxExpireRoom = Math.max(this.maxExpireRoom, expire);
            }
        }

        this.roomVariables.set(key, {
            value,
            isPublic,
        });
        this.allVariables = undefined;
        if (persist) {
            await this.repository.saveVariable(this.roomKey, key, value, isPublic, expire, this.maxExpireRoom);
        }
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

        const expire = ttl === undefined ? undefined : new Date().getTime() + ttl * 1000;

        if (this.maxExpireWorld !== undefined) {
            if (expire === undefined) {
                this.maxExpireWorld = undefined;
            } else {
                this.maxExpireWorld = Math.max(this.maxExpireWorld, expire);
            }
        }

        this.worldVariables.set(key, {
            value,
            isPublic,
        });
        this.allVariables = undefined;
        if (persist) {
            await this.repository.saveVariable(this.worldKey, key, value, isPublic, expire, this.maxExpireWorld);
        }
    }
}
