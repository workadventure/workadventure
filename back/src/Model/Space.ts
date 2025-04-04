import { applyFieldMask } from "protobuf-fieldmask";
import merge from "lodash/merge";
import * as Sentry from "@sentry/node";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    PrivateEvent,
    PublicEvent,
    RemoveSpaceUserMessage,
    SpaceUser,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { SpacesWatcher } from "./SpacesWatcher";
import { EventProcessor } from "./EventProcessor";
import { CommunicationManager } from "./CommunicationManager";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;
    private metadata: Map<string, unknown>;
    private communicationManager: ICommunicationManager;
    constructor(name: string, private eventProcessor: EventProcessor, private propertiesToSync: string[]) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<string, SpaceUser>>();
        this.metadata = new Map<string, unknown>();
        this.communicationManager = new CommunicationManager(this);
        debug(`${name} => created`);
    }

    public addUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersList(sourceWatcher);
        usersList.set(spaceUser.spaceUserId, spaceUser);
        this.notifyWatchers(
            {
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                        spaceName: this.name,
                        user: spaceUser,
                    }),
                },
            },
            sourceWatcher
        );
        this.communicationManager.handleUserAdded(spaceUser);
        debug(`${this.name} : user => added ${spaceUser.spaceUserId}`);
    }

    public updateUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser, updateMask: string[]) {
        const usersList = this.usersList(sourceWatcher);
        const user = usersList.get(spaceUser.spaceUserId);
        if (!user) {
            console.error("User not found in this space", spaceUser);
            Sentry.captureMessage(`User not found in this space ${spaceUser.spaceUserId}`);
            return;
        }

        const updateValues = applyFieldMask(spaceUser, updateMask);

        merge(user, updateValues);

        usersList.set(spaceUser.spaceUserId, user);
        this.notifyWatchers(
            {
                message: {
                    $case: "updateSpaceUserMessage",
                    updateSpaceUserMessage: {
                        spaceName: this.name,
                        user: spaceUser,
                        updateMask,
                    },
                },
            },
            sourceWatcher
        );
        this.communicationManager.handleUserUpdated(spaceUser);
        debug(`${this.name} : user => updated ${spaceUser.spaceUserId}`);
    }
    public removeUser(sourceWatcher: SpacesWatcher, spaceUserId: string) {
        const usersList = this.usersList(sourceWatcher);
        const user = usersList.get(spaceUserId);
        if (!user) {
            console.error("User not found in this space", spaceUserId);
            Sentry.captureMessage(`User not found in this space ${spaceUserId}`);
            return;
        }
        usersList.delete(spaceUserId);

        this.notifyWatchers(
            {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                        spaceName: this.name,
                        spaceUserId: spaceUserId,
                    }),
                },
            },
            sourceWatcher
        );
        this.communicationManager.handleUserDeleted(user);
        debug(`${this.name} : user => removed ${spaceUserId}`);

        if (usersList.size === 0) {
            this.users.delete(sourceWatcher);
        }
    }

    public updateMetadata(watcher: SpacesWatcher, metadata: { [key: string]: unknown }) {
        for (const key in metadata) {
            this.metadata.set(key, metadata[key]);
        }

        this.notifyWatchers({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });
        debug(`${this.name} : metadata => updated`);
    }

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} => watcher added ${watcher.id}`);
        for (const spaceUsers of this.users.values()) {
            for (const spaceUser of spaceUsers.values()) {
                watcher.write({
                    message: {
                        $case: "addSpaceUserMessage",
                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            user: spaceUser,
                        }),
                    },
                });
            }
        }

        const metadata: { [key: string]: unknown } = {};

        for (const key of this.metadata.keys()) {
            metadata[key] = this.metadata.get(key);
        }

        watcher.write({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });
    }
    public removeWatcher(watcher: SpacesWatcher) {
        this.users.delete(watcher);
        debug(`${this.name} => watcher removed ${watcher.id}`);
    }

    /**
     * Notify all watchers expect the one that sent the message
     */
    private notifyWatchers(message: BackToPusherSpaceMessage, exceptWatcher?: SpacesWatcher | undefined) {
        for (const watcher_ of this.users.keys()) {
            if (exceptWatcher && watcher_.id === exceptWatcher.id) {
                continue;
            }
            watcher_.write(message);
        }
    }

    public canBeDeleted(): boolean {
        return this.users.size === 0;
    }

    private usersList(watcher: SpacesWatcher): Map<string, SpaceUser> {
        const usersList = this.users.get(watcher);
        if (!usersList) {
            throw new Error("No users list associated to the watcher");
        }
        return usersList;
    }

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        // TODO : Better way to display date in the /dump
        if (key === "name") {
            return this.name;
        } else if (key === "users") {
            return `Users : ${this.users.size}`;
        }
        return undefined;
    }

    public dispatchPublicEvent(publicEvent: PublicEvent) {
        if (!publicEvent.spaceEvent?.event) {
            // If there is no event, just forward the public event as-is
            this.notifyWatchers({
                message: {
                    $case: "publicEvent",
                    publicEvent,
                },
            });
            return;
        }

        // Process the event
        const processedEvent = this.eventProcessor.processPublicEvent(
            publicEvent.spaceEvent.event,
            publicEvent.senderUserId
        );

        // Create new public event with processed event
        const processedPublicEvent: PublicEvent = {
            ...publicEvent,
            spaceEvent: {
                event: processedEvent,
            },
        };

        this.notifyWatchers({
            message: {
                $case: "publicEvent",
                publicEvent: processedPublicEvent,
            },
        });
    }
    public dispatchPrivateEvent(privateEvent: PrivateEvent) {
        // Let's notify the watcher that contains the user
        if (!privateEvent.spaceEvent?.event) {
            // If there is no event, just forward the private event as-is
            for (const [watcher, users] of this.users.entries()) {
                if (users.has(privateEvent.receiverUserId)) {
                    watcher.write({
                        message: {
                            $case: "privateEvent",
                            privateEvent,
                        },
                    });
                }
            }
            return;
        }

        if (privateEvent.spaceEvent.event.$case === "userReadyForSwitchEvent") {
            this.communicationManager.handleUserReadyForSwitch(privateEvent.senderUserId);
            return;
        }

        // Process the event
        const processedEvent = this.eventProcessor.processPrivateEvent(
            privateEvent.spaceEvent.event,
            privateEvent.senderUserId,
            privateEvent.receiverUserId
        );

        // Create new private event with processed event
        const processedPrivateEvent: PrivateEvent = {
            ...privateEvent,
            spaceEvent: {
                event: processedEvent,
            },
        };

        // Send to target user
        for (const [watcher, users] of this.users.entries()) {
            if (users.has(privateEvent.receiverUserId)) {
                watcher.write({
                    message: {
                        $case: "privateEvent",
                        privateEvent: processedPrivateEvent,
                    },
                });
            }
        }
    }
    public getAllUsers(): SpaceUser[] {
        return Array.from(this.users.values()).flatMap((users) => Array.from(users.values()));
    }
    public getUser(userId: number): SpaceUser | undefined {
        return Array.from(this.users.values())
            .flatMap((users: Map<number, SpaceUser>) => Array.from(users.values()))
            .find((user: SpaceUser) => user.id === userId);
    }
    public getSpaceName(): string {
        return this.name;
    }
    public getPropertiesToSync(): string[] {
        return this.propertiesToSync;
    }
}
