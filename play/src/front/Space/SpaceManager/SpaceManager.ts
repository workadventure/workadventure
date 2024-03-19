import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { SpaceEventEmitterInterface, SpaceInterface } from "../tests/SpaceManager.test";
import {
    SpaceAlreadyExistError,
    SpaceDoesNotExistError,
    UserAlreadyExistInSpaceError,
    UserDoesNotExistInSpaceError,
} from "../Errors/SpaceError";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { SpaceFilterManagerInterface, SpaceManagerInterface, SpaceUserManagerInterface } from "./SpaceManagerInterface";

export class SpaceManager implements SpaceManagerInterface, SpaceUserManagerInterface, SpaceFilterManagerInterface {
    constructor(
        private spaceProvider: SpaceProviderInterface,
        private spaceEventEmitter: SpaceEventEmitterInterface,
        private spaceUser: SpaceUser
    ) {}

    getAll(): SpaceInterface[] {
        return this.spaceProvider.getAll();
    }

    join(spaceName: string, spaceFilter: Omit<SpaceFilterMessage, "spaceName"> | null = null) {
        if (this.spaceProvider.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);

        const newSpace: SpaceInterface = SpaceFactory.createSpace(spaceName);
        this.spaceProvider.add(newSpace);
        this.spaceEventEmitter.userJoinSpace(spaceName, this.spaceUser);
        if (!spaceFilter) return;
        this.emitAddFilterSpaceEvent(spaceName, spaceFilter);
    }
    leave(spaceName: string) {
        if (!this.spaceExist(spaceName)) throw new SpaceDoesNotExistError(spaceName);
        this.spaceProvider.delete(spaceName);
        this.spaceEventEmitter.userLeaveSpace(spaceName, this.spaceUser);
    }
    updateMetadata(spaceName: string, metadata: string): void {
        if (!this.spaceExist(spaceName)) throw new SpaceDoesNotExistError(spaceName);
        this.spaceProvider.updateMetadata(spaceName, metadata);
        this.spaceEventEmitter.updateSpaceMetadata(spaceName, metadata);
    }
    addUserToSpace(spaceName: string, spaceUser: SpaceUser) {
        if (this.userExistInSpace(spaceName, spaceUser))
            throw new UserAlreadyExistInSpaceError(spaceName, spaceUser.name);
        this.spaceProvider.addUserToSpace(spaceName, spaceUser);
    }
    removeUserToSpace(spaceName: string, spaceUser: SpaceUser) {
        if (!this.userExistInSpace(spaceName, spaceUser))
            throw new UserDoesNotExistInSpaceError(spaceName, spaceUser.name);
        this.spaceProvider.removeUserToSpace(spaceName, spaceUser);
    }
    updateUserData(spaceName: string, spaceUser: SpaceUser) {
        if (!this.userExistInSpace(spaceName, spaceUser))
            throw new UserDoesNotExistInSpaceError(spaceName, spaceUser.name);
        this.spaceProvider.updateUserData(spaceName, spaceUser);
    }
    addFilterToSpace(spaceName: string, spaceFilter: Omit<SpaceFilterMessage, "spaceName">) {
        if (!this.spaceExist(spaceName)) throw new SpaceDoesNotExistError(spaceName);
        this.emitAddFilterSpaceEvent(spaceName, spaceFilter);
    }
    removeFilterToSpace(spaceName: string, filterName: string) {
        if (!this.spaceExist(spaceName)) throw new SpaceDoesNotExistError(spaceName);
        this.spaceEventEmitter.removeSpaceFilter(spaceName, filterName);
    }
    updateFilterOfSpace(spaceName: string, spaceFilter: Omit<SpaceFilterMessage, "spaceName">) {
        if (!this.spaceExist(spaceName)) throw new SpaceDoesNotExistError(spaceName);
        this.spaceEventEmitter.updateSpaceFilter({ ...spaceFilter, spaceName });
    }
    private userExistInSpace(spaceName: string, spaceUser: SpaceUser) {
        if (!this.spaceExist(spaceName)) throw new SpaceDoesNotExistError(spaceName);
        return this.spaceProvider.userExistInSpace(spaceName, spaceUser);
    }
    private spaceExist(spaceName: string) {
        return this.spaceProvider.exist(spaceName);
    }
    private emitAddFilterSpaceEvent(spaceName: string, spaceFilter: Omit<SpaceFilterMessage, "spaceName">) {
        const newSpaceFilter: SpaceFilterMessage = {
            ...spaceFilter,
            spaceName,
        };
        this.spaceEventEmitter.addSpaceFilter(newSpaceFilter);
    }
}
class SpaceFactory {
    static createSpace(name: string): SpaceInterface {
        return {
            getName(): string {
                return name;
            },
        };
    }
}
