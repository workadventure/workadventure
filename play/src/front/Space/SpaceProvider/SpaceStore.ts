import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import { RoomConnection } from "../../Connection/RoomConnection";
import { SpaceProviderInterface } from "./SpaceProviderInterface";

export class LocalSpaceProvider implements SpaceProviderInterface {
    constructor(
        private roomConnection: RoomConnection,
        private spaces: Map<string, SpaceInterface> = new Map<string, SpaceInterface>()
    ) {}

    add(spaceName: string, metadata: Map<string, unknown> = new Map<string, unknown>()): SpaceInterface {
        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace: SpaceInterface = new Space(spaceName, metadata, this.roomConnection);
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

    destroy() {
        this.getAll().forEach((space) => {
            space.destroy();
        });
        this.spaces.clear();
    }
}
