import { Observable, Subject } from "rxjs";
import { PrivateEvent, PublicEvent, SpaceEvent, UpdateSpaceMetadataMessage } from "@workadventure/messages";
import { PrivateEventsObservables, PublicEventsObservables, SpaceInterface, SpaceUserUpdate } from "./SpaceInterface";
import { SpaceNameIsEmptyError } from "./Errors/SpaceError";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter/SpaceFilter";
import { AllUsersSpaceFilter, AllUsersSpaceFilterInterface } from "./SpaceFilter/AllUsersSpaceFilter";
import { LiveStreamingUsersSpaceFilter } from "./SpaceFilter/LiveStreamingUsersSpaceFilter";
import { RoomConnectionForSpacesInterface } from "./SpaceRegistry/SpaceRegistry";

export class Space implements SpaceInterface {
    private readonly name: string;
    private filters: Map<string, SpaceFilter> = new Map<string, SpaceFilter>();
    private readonly publicEventsObservables: PublicEventsObservables = {};
    private readonly privateEventsObservables: PrivateEventsObservables = {};
    private filterNumber = 0;
    private _onLeaveSpace = new Subject<void>();
    public readonly onLeaveSpace = this._onLeaveSpace.asObservable();

    /**
     * IMPORTANT: The only valid way to create a space is to use the SpaceRegistry.
     * Do not call this constructor directly.
     */
    constructor(
        name: string,
        private metadata = new Map<string, unknown>(),
        private _connection: RoomConnectionForSpacesInterface
    ) {
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

    watchAllUsers(): AllUsersSpaceFilterInterface {
        const filterName = `allUsers_${this.filterNumber}`;
        this.filterNumber += 1;
        const newFilter = new AllUsersSpaceFilter(filterName, this, this._connection);
        this.filters.set(filterName, newFilter);
        return newFilter;
    }

    watchLiveStreamingUsers(): SpaceFilterInterface {
        const filterName = `liveStreamingUsers_${this.filterNumber}`;
        this.filterNumber += 1;
        const newFilter = new LiveStreamingUsersSpaceFilter(filterName, this, this._connection);
        this.filters.set(filterName, newFilter);
        return newFilter;
    }

    getSpaceFilter(filterName: string): SpaceFilter {
        const spaceFilter = this.filters.get(filterName);
        if (!spaceFilter) {
            throw new Error(
                `Could not find spaceFilter named "${filterName}". Maybe it was destroyed just before a message was received?`
            );
        }
        return spaceFilter;
    }

    // TODO: there is no way to cleanup a space filter (this.filters.delete is never called).
    // This is mildly an issue because it is unlikely we will need to create many filters (we have only 2 so far)
    /*stopWatching(spaceFilter: SpaceFilterInterface): void {
        const filterName = spaceFilter.getName();
        const filter = this.filters.get(filterName);
        if (!filter) throw new SpaceFilterDoesNotExistError(this.name, filterName);
        this.filters.delete(filterName);
    }*/

    private userLeaveSpace() {
        this._connection.emitLeaveSpace(this.name);
    }

    private userJoinSpace() {
        this._connection.emitJoinSpace(this.name);
    }

    public emitUpdateSpaceMetadata(metadata: Map<string, unknown>) {
        this._connection.emitUpdateSpaceMetadata(this.name, Object.fromEntries(metadata.entries()));
    }

    public observePublicEvent<K extends keyof PublicEventsObservables>(
        key: K
    ): NonNullable<PublicEventsObservables[K]> {
        const observable = this.publicEventsObservables[key];
        if (!observable) {
            return (this.publicEventsObservables[key] = new Subject() as NonNullable<PublicEventsObservables[K]>);
        }
        return observable;
    }

    public observePrivateEvent<K extends keyof PrivateEventsObservables>(
        key: K
    ): NonNullable<PrivateEventsObservables[K]> {
        const observable = this.privateEventsObservables[key];
        if (!observable) {
            return (this.privateEventsObservables[key] = new Subject() as NonNullable<PrivateEventsObservables[K]>);
        }
        return observable;
    }

    /**
     * Take a message received by the RoomConnection and dispatch it to the right observable.
     */
    public dispatchPublicMessage(message: PublicEvent) {
        const spaceEvent = message.spaceEvent;
        if (spaceEvent === undefined) {
            throw new Error("Received a message without spaceEvent");
        }
        const spaceInnerEvent = spaceEvent.event;
        if (spaceInnerEvent === undefined) {
            throw new Error("Received a message without event");
        }
        const sender = message.senderUserId;

        const subject = this.publicEventsObservables[spaceInnerEvent.$case];
        if (subject) {
            subject.next({
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                spaceName: message.spaceName,
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                sender,
                ...spaceInnerEvent,
            });
        }
    }

    /**
     * Take a message received by the RoomConnection and dispatch it to the right observable.
     */
    public dispatchPrivateMessage(message: PrivateEvent) {
        const spaceEvent = message.spaceEvent;
        if (spaceEvent === undefined) {
            throw new Error("Received a message without spaceEvent");
        }
        const spaceInnerEvent = spaceEvent.event;
        if (spaceInnerEvent === undefined) {
            throw new Error("Received a message without event");
        }
        const sender = message.senderUserId;
        if (sender === undefined) {
            throw new Error("Received a message without senderUserId");
        }
        const subject = this.privateEventsObservables[spaceInnerEvent.$case];
        if (subject) {
            subject.next({
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                spaceName: message.spaceName,
                //@ts-ignore We are hitting a limitation of TypeScript documented here: https://stackoverflow.com/questions/67513032/helper-function-to-un-discriminate-a-discriminated-union
                sender,
                ...spaceInnerEvent,
            });
        }
    }

    public emitPublicMessage(message: NonNullable<SpaceEvent["event"]>): void {
        this._connection.emitPublicSpaceEvent(this.name, message);
    }

    /**
     * Sends a message to the server to update our user in the space.
     */
    public emitUpdateUser(spaceUser: SpaceUserUpdate): void {
        this._connection.emitUpdateSpaceUserMessage(this.name, spaceUser);
    }

    /**
     * IMPORTANT: The only valid way to destroy a space is to use the SpaceRegistry.
     * Do not call this method directly.
     */
    destroy() {
        this.userLeaveSpace();

        for (const subscription of Object.values(this.publicEventsObservables)) {
            subscription.complete();
        }
        for (const subscription of Object.values(this.privateEventsObservables)) {
            subscription.complete();
        }
        this._onLeaveSpace.next();
        this._onLeaveSpace.complete();
    }

    /**
     * @returns an observable that emits the new metadata of the space when it changes.
     */
    watchSpaceMetadata(): Observable<UpdateSpaceMetadataMessage> {
        return this._connection.updateSpaceMetadataMessageStream;
    }
}
