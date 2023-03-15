import { SpaceFilterMessage, SpaceUser } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import events from "events";
import { Subscription } from "rxjs";
import { RoomConnection } from "../Connexion/RoomConnection";
import { Readable } from "svelte/store";

export declare interface Space {
    // Emitted when the space is empty after there was a user
    on(event: "empty", listener: () => void): this;
    // Emitted when the space was empty and a new user is added
    on(event: "fill", listener: () => void): this;
}
export class Space extends events.EventEmitter {
    private _users: MapStore<string, SpaceUser>;
    private subscribers: Subscription[];

    constructor(
        private connection: RoomConnection,
        readonly spaceName: string,
        private spaceFilter: SpaceFilterMessage
    ) {
        super();
        this._users = new MapStore<string, SpaceUser>();
        this.subscribers = [];
        this.subscribers.push(
            this.connection.addSpaceUserMessageStream.subscribe((message) => {
                const user = message.user;
                if (
                    message.spaceName === spaceName &&
                    message.filterName === spaceFilter.filterName &&
                    user !== undefined
                ) {
                    this._users.set(user.uuid, user);
                    if (this._users.size === 1) {
                        this.emit("fill");
                    }
                }
            })
        );
        this.subscribers.push(
            this.connection.removeSpaceUserMessageStream.subscribe((message) => {
                if (message.spaceName === spaceName && message.filterName === spaceFilter.filterName) {
                    this._users.delete(message.userUuid);
                    if (this._users.size === 0) {
                        this.emit("empty");
                    }
                }
            })
        );
    }

    public destroy() {
        this.subscribers.forEach((subscriber) => subscriber.unsubscribe());
    }

    get users(): Readable<Map<string, SpaceUser>> {
        return this._users;
    }

    get isEmpty() {
        return this._users.size === 0;
    }
}
