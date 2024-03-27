import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import {
    SpaceEventEmitterInterface,
    SpaceFilterEventEmitterInterface,
} from "../SpaceEventEmitter/SpaceEventEmitterInterface";
import { SpaceProviderInterface } from "./SpacerProviderInterface";

export type AllSapceEventEmitter = (SpaceFilterEventEmitterInterface & SpaceEventEmitterInterface) | undefined;
export class LocalSpaceProvider implements SpaceProviderInterface {
    

    constructor(
        private allSpaceEventEmitter: AllSapceEventEmitter = undefined,
        private spaces: Map<string, SpaceInterface> = new Map<string, SpaceInterface>()
    ) {}

    add(spaceName: string, metadata: Map<string, unknown> = new Map<string, unknown>()): SpaceInterface {
        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace: SpaceInterface = new Space(spaceName, metadata,this.allSpaceEventEmitter);
                this.spaces.set(newSpace.getName(), newSpace);
                return newSpace;
            }
        exist(spaceName: string): boolean {
            return this.spaces.has(spaceName);
        }
        delete(spaceName: string): void {
            const space: SpaceInterface | undefined = this.spaces.get(spaceName);
        if (!space) throw new SpaceDoesNotExistError(spaceName);
                space.destroy();
        this.spaces.delete(spaceName);
    }
        getAll(): SpaceInterface[] {
            return Array.from(this.spaces.values());
        }
        get(spaceName: string): SpaceInterface {
            const space: SpaceInterface | undefined = this.spaces.get(spaceName);
        if (!space) throw new SpaceDoesNotExistError(spaceName);
                return space;
    }
}

export class LocalSpaceProviderSingleton {
    private static instance: LocalSpaceProvider | null = null;
    static getInstance(spaceEventEmitter: AllSapceEventEmitter = undefined): LocalSpaceProvider {
        if (this.instance === null) {
            this.instance = new LocalSpaceProvider(spaceEventEmitter);
        }
        return this.instance;
    }
}
