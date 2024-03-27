import { Subscription } from "rxjs";
import { UpdateSpaceMetadataMessage } from "@workadventure/messages";
import { z } from "zod";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { LocalSpaceProviderSingleton } from "../SpaceProvider/SpaceStore";
import { SpaceWatcherInterface } from "./SpaceWatcherInterface";
import { SpaceStreams } from "./SpaceStreamsInterface";

export class StreamSpaceWatcher implements SpaceWatcherInterface {
    private subscribers: Subscription[] = [];

    constructor(private spaceProvider: SpaceProviderInterface, private spaceStreams: SpaceStreams) {
        this.handleAddSpaceUserMessage();
        this.handleRemoveSpaceUserMessage();
        this.handleUpdateSpaceMetadataMessage();
        this.handleUpdateSpaceUserMessage();
    }

    handleAddSpaceUserMessage(): void {
        this.subscribers.push(
            this.spaceStreams.addSpaceUserMessage.subscribe((message) => {
                if (message.user  && message.filterName)
                    this.spaceProvider.get(message.spaceName).getSpaceFilter(message.filterName).addUser(message.user);
            })
        );
    }

    handleRemoveSpaceUserMessage(): void {
        this.subscribers.push(
            this.spaceStreams.removeSpaceUserMessage.subscribe((message) => {
                if (message.userId && message.filterName)
                    this.spaceProvider
                        .get(message.spaceName)
                        .getSpaceFilter(message.filterName)
                        .removeUser(message.userId);
            })
        );
    }

    handleUpdateSpaceMetadataMessage(): void {
        this.subscribers.push(
            this.spaceStreams.updateSpaceMetadataMessage.subscribe((message: UpdateSpaceMetadataMessage) => {
                const isMetadata = z.record(z.string(), z.unknown()).safeParse(JSON.parse(message.metadata));
                if (!isMetadata.success) {
                    console.error("Error while parsing metadata", isMetadata.error);
                    return;
                }
                const metadata : Map<string,unknown>= new Map();
                for (const [key, value] of Object.entries(isMetadata.data)) {
                    metadata.set(key, value);
                }

                if (message.metadata) this.spaceProvider.get(message.spaceName).setMetadata(metadata);
            })
        );
    }

    handleUpdateSpaceUserMessage(): void {
        this.subscribers.push(
            this.spaceStreams.updateSpaceUserMessage.subscribe((message) => {
                if (message.user  && message.filterName)
                    this.spaceProvider
                        .get(message.spaceName)
                        .getSpaceFilter(message.filterName)
                        .updateUserData(message.user);
            })
        );
    }
    public destroy() {
        this.subscribers.forEach((subscriber) => subscriber.unsubscribe());
    }
}

export class StreamSpaceWatcherSingleton {
    private static instance: StreamSpaceWatcher | null = null;
    static getInstance(spaceStreams: SpaceStreams): StreamSpaceWatcher {
        if (this.instance === null) {
            this.instance = new StreamSpaceWatcher(LocalSpaceProviderSingleton.getInstance(), spaceStreams);
        }
        return this.instance;
    }
}
