import { RoomConnection } from "../Connection/RoomConnection";
import { SpaceInterface } from "./SpaceInterface";
import { SpaceFilterAlreadyExistError, SpaceFilterDoesNotExistError, SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";

export const WORLD_SPACE_NAME = "allWorldUser";
export const CONNECTED_USER_FILTER_NAME = "connected_users";
export class Space implements SpaceInterface {
    private readonly name: string;

    constructor(
        name: string,
        private metadata = new Map<string, unknown>(),
        private roomConnection: RoomConnection,
        private filters: Map<string, SpaceFilterInterface> = new Map<string, SpaceFilterInterface>()
    ) {
        if (name === "") throw new SpaceNameIsEmptyError();
        this.name = name;

        this.userJoinSpace();
    }

    getName(): string {
        return this.name;
    }
    getMetadata(): Map<string, unknown> {
        return this.metadata;
    }
    setMetadata(metadata: Map<string, unknown>): void {
        metadata.forEach((value, key) => {
            this.metadata.set(key, value);
        });
    }

    watch(filterName: string): SpaceFilterInterface {
        if (this.filters.has(filterName)) throw new SpaceFilterAlreadyExistError(this.name, filterName);
        const newFilter: SpaceFilterInterface = new SpaceFilter(filterName, this.name, undefined, this.roomConnection);
        this.filters.set(newFilter.getName(), newFilter);
        return newFilter;
    }
    getAllSpacesFilter(): SpaceFilterInterface[] {
        return Array.from(this.filters.values());
    }

    getSpaceFilter(filterName: string): SpaceFilterInterface {
        const spaceFilter = this.filters.get(filterName);
        if (!spaceFilter) {
            throw new Error("Something went wrong with filterName");
        }
        return spaceFilter;
    }

    spaceFilterExist(filterName: string): boolean {
        return this.filters.has(filterName);
    }

    stopWatching(filterName: string) {
        const filter: SpaceFilterInterface | undefined = this.filters.get(filterName);
        if (!filter) throw new SpaceFilterDoesNotExistError(this.name, filterName);
        filter.destroy();
        this.filters.delete(filterName);
    }

    private userLeaveSpace() {
        this.roomConnection.emitUnwatchSpace(this.name);
    }

    private userJoinSpace() {
        this.roomConnection.emitWatchSpace(this.name);
    }

    private updateSpaceMetadata(metadata: Map<string, unknown>) {
        this.roomConnection.emitUpdateSpaceMetadata(this.name, Object.fromEntries(metadata.entries()));
    }

    // FIXME: this looks like a hack, it should not belong here.
    // Any chance we can make this more generic?
    emitJitsiParticipantId(participantId: string) {
        this.roomConnection.emitJitsiParticipantIdSpace(this.name, participantId);
    }

    destroy() {
        this.userLeaveSpace();
    }
}
