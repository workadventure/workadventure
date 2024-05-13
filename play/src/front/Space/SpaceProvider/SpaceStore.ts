import { ClientToServerMessage } from "@workadventure/messages";
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
        private socket: WebSocket | undefined = undefined,
        private spaces: Map<string, SpaceInterface> = new Map<string, SpaceInterface>()
    ) {}

    add(spaceName: string, metadata: Map<string, unknown> = new Map<string, unknown>()): SpaceInterface {
        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace: SpaceInterface = new Space(spaceName, metadata, this.socket,ClientToServerMessage);
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

    destroy(){
        this.getAll().forEach((space)=>{
            space.destroy();
        })
    }
}

export class LocalSpaceProviderSingleton {
    private static instance: LocalSpaceProvider | undefined = undefined;
    static getInstance(socket: WebSocket | undefined = undefined): SpaceProviderInterface {
        if (this.instance === undefined) {
            this.instance = new LocalSpaceProvider(socket);
        }
        return this.instance;
    }
}
