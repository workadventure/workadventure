import { Observable, Subject } from "rxjs";
import { SpaceEvent } from "@workadventure/messages";
import { RoomConnection } from "../Connection/RoomConnection";
import { SpaceInterface } from "./SpaceInterface";
import { SpaceFilterAlreadyExistError, SpaceFilterDoesNotExistError, SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";

export const WORLD_SPACE_NAME = "allWorldUser";
export const CONNECTED_USER_FILTER_NAME = "connected_users";

type PublicSpaceEvent = SpaceEvent["event"];

type PublicEventRxjsEvent<V extends PublicSpaceEvent> = {
    spaceName: string;
    sender: number;
    type: V["$case"];
    event: V["event"];
};

type PublicEventsObservables = Partial<{
    [K in PublicEventRxjsEvent["type"]]: Observable<PublicEventRxjsEvent<K>>;
}>;

export class Space implements SpaceInterface {
    private readonly name: string;
    private filters: Map<string, SpaceFilterInterface> = new Map<string, SpaceFilterInterface>();
    private readonly publicEventsObservables: PublicEventsObservables = {};

    /**
     * IMPORTANT: The only valid way to create a space is to use the SpaceRegistry.
     * Do not call this constructor directly.
     */
    constructor(name: string, private metadata = new Map<string, unknown>(), private _connection: RoomConnection) {
        if (name === "") {
            throw new SpaceNameIsEmptyError();
        }
        this.name = name;

        this.userJoinSpace();

        // TODO: The public and private messages should be forwarded to a special method here from the Registry.
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
        const newFilter: SpaceFilterInterface = new SpaceFilter(filterName, this.name, this._connection);
        this.filters.set(newFilter.getName(), newFilter);
        return newFilter;
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
        this.filters.delete(filterName);
    }

    private userLeaveSpace() {
        this._connection.emitUnwatchSpace(this.name);
    }

    private userJoinSpace() {
        this._connection.emitWatchSpace(this.name);
    }

    private updateSpaceMetadata(metadata: Map<string, unknown>) {
        this._connection.emitUpdateSpaceMetadata(this.name, Object.fromEntries(metadata.entries()));
    }

    private observePublicEvent<K extends keyof SpaceEvent>(key: K) {
        if (!this.publicEventsObservables[key]) {
            this.publicEventsObservables[key] = new Subject<PublicEventRxjsEvent<K>>();
        }
        return this.publicEventsObservables[key];
    }

    // FIXME: this looks like a hack, it should not belong here.
    // Any chance we can make this more generic?
    emitJitsiParticipantId(participantId: string) {
        this._connection.emitJitsiParticipantIdSpace(this.name, participantId);
    }

    /**
     * IMPORTANT: The only valid way to destroy a space is to use the SpaceRegistry.
     * Do not call this method directly.
     */
    destroy() {
        this.userLeaveSpace();
    }
}
