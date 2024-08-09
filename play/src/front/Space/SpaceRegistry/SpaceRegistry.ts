import { Subscription } from "rxjs";
import { z } from "zod";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceAlreadyExistError, SpaceDoesNotExistError } from "../Errors/SpaceError";
import { Space } from "../Space";
import { RoomConnection } from "../../Connection/RoomConnection";
import { SpaceRegistryInterface } from "./SpaceRegistryInterface";

/**
 * This class is in charge of creating, joining, leaving and deleting Spaces.
 * It acts both as a factory and a registry.
 */
export class SpaceRegistry implements SpaceRegistryInterface {
    private addSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceUserMessageStreamSubscription: Subscription;
    private removeSpaceUserMessageStreamSubscription: Subscription;
    private updateSpaceMetadataMessageStreamSubscription: Subscription;
    private proximityPublicMessageEventSubscription: Subscription;

    constructor(private roomConnection: RoomConnection, private spaces: Map<string, Space> = new Map<string, Space>()) {
        this.addSpaceUserMessageStreamSubscription = roomConnection.addSpaceUserMessageStream.subscribe((message) => {
            if (!message.user || !message.filterName) return;

            this.spaces
                .get(message.spaceName)
                ?.getSpaceFilter(message.filterName)
                .addUser(message.user)
                .catch((e) => console.error(e));
        });

        this.updateSpaceUserMessageStreamSubscription = roomConnection.updateSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.user || !message.filterName || !message.updateMask) return;

                this.spaces.get(message.spaceName)?.getSpaceFilter(message.filterName).updateUserData(message.user);
            }
        );

        this.removeSpaceUserMessageStreamSubscription = roomConnection.removeSpaceUserMessageStream.subscribe(
            (message) => {
                if (!message.userId || !message.filterName) return;

                this.spaces.get(message.spaceName)?.getSpaceFilter(message.filterName).removeUser(message.userId);
            }
        );

        this.updateSpaceMetadataMessageStreamSubscription = roomConnection.updateSpaceMetadataMessageStream.subscribe(
            (message) => {
                const isMetadata = z.record(z.string(), z.unknown()).safeParse(JSON.parse(message.metadata));
                if (!isMetadata.success) {
                    console.error("Error while parsing metadata", isMetadata.error);
                    return;
                }
                const metadata: Map<string, unknown> = new Map();
                for (const [key, value] of Object.entries(isMetadata.data)) {
                    metadata.set(key, value);
                }

                if (message.metadata) {
                    this.spaces.get(message.spaceName)?.setMetadata(metadata);
                }
            }
        );

        this.proximityPublicMessageEventSubscription = roomConnection.proximityPublicMessageEvent.subscribe(
            (message) => {
                this.spaces.get(message.spaceName)?.dispatchPublicMessage(message);
            }
        );
    }

    joinSpace(spaceName: string, metadata: Map<string, unknown> = new Map<string, unknown>()): SpaceInterface {
        if (this.exist(spaceName)) throw new SpaceAlreadyExistError(spaceName);
        const newSpace = new Space(spaceName, metadata, this.roomConnection);
        this.spaces.set(newSpace.getName(), newSpace);
        return newSpace;
    }
    exist(spaceName: string): boolean {
        return this.spaces.has(spaceName);
    }
    leaveSpace(spaceName: string): void {
        const space = this.spaces.get(spaceName);
        if (!space) {
            throw new SpaceDoesNotExistError(spaceName);
        }
        space.destroy();
        this.spaces.delete(spaceName);
    }
    getAll(): SpaceInterface[] {
        return Array.from(this.spaces.values());
    }
    get(spaceName: string): SpaceInterface {
        const space: SpaceInterface | undefined = this.spaces.get(spaceName);
        if (!space) {
            throw new SpaceDoesNotExistError(spaceName);
        }
        return space;
    }

    destroy() {
        this.addSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceUserMessageStreamSubscription.unsubscribe();
        this.removeSpaceUserMessageStreamSubscription.unsubscribe();
        this.updateSpaceMetadataMessageStreamSubscription.unsubscribe();
        this.proximityPublicMessageEventSubscription.unsubscribe();

        for (const space of this.spaces.values()) {
            space.destroy();
        }
        this.spaces.clear();
    }
}
