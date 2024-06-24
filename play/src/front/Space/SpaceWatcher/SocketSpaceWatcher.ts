import { z } from "zod";
import { ServerToClientMessage } from "@workadventure/messages";
import { SpaceProviderInterface } from "../SpaceProvider/SpacerProviderInterface";
import { LocalSpaceProviderSingleton } from "../SpaceProvider/SpaceStore";
import { ChatConnectionInterface } from "../../Chat/Connection/ChatConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { WORLD_SPACE_NAME } from "../Space";

export enum SpaceEvent {
    AddSpaceUser = "addSpaceUserMessage",
    UpdateSpaceUser = "updateSpaceUserMessage",
    RemoveSpaceUser = "removeSpaceUserMessage",
    updateSpaceMetadata = "updateSpaceMetadataMessage",
}
export class StreamSpaceWatcher {
    constructor(
        private spaceProvider: SpaceProviderInterface,
        private socket: WebSocket,
        decoder: Required<{ decode: (messageCoded: Uint8Array) => ServerToClientMessage }>,
        chatConnection: ChatConnectionInterface = gameManager.getCurrentGameScene().chatConnection
    ) {
        this.socket.addEventListener("message", (messageEvent: MessageEvent) => {
            const arrayBuffer: ArrayBuffer = messageEvent.data;
            const serverMessage = decoder.decode(new Uint8Array(arrayBuffer));
            const message = serverMessage.message;
            if (message === undefined) return;
            if (message.$case !== "batchMessage") return;
            for (const subMessageWrapper of message.batchMessage.payload) {
                const subMessage = subMessageWrapper.message;
                if (subMessage === undefined) return;

                console.log("$case : ", subMessage.$case);

                switch (subMessage.$case) {
                    case SpaceEvent.AddSpaceUser: {
                        if (!subMessage.addSpaceUserMessage.user || !subMessage.addSpaceUserMessage.filterName) return;

                        this.spaceProvider
                            .get(subMessage.addSpaceUserMessage.spaceName)
                            .getSpaceFilter(subMessage.addSpaceUserMessage.filterName)
                            .addUser(subMessage.addSpaceUserMessage.user)
                            .then((extendedUser) => {
                                if (subMessage.addSpaceUserMessage.spaceName === WORLD_SPACE_NAME)
                                    chatConnection.addUserFromSpace(extendedUser);
                            })
                            .catch((e) => console.error(e));

                        break;
                    }
                    case SpaceEvent.UpdateSpaceUser: {
                        if (!subMessage.updateSpaceUserMessage.user || !subMessage.updateSpaceUserMessage.filterName)
                            return;

                        this.spaceProvider
                            .get(subMessage.updateSpaceUserMessage.spaceName)
                            .getSpaceFilter(subMessage.updateSpaceUserMessage.filterName)
                            .updateUserData(subMessage.updateSpaceUserMessage.user);

                        if (subMessage.updateSpaceUserMessage.spaceName === WORLD_SPACE_NAME)
                            chatConnection.updateUserFromSpace(subMessage.updateSpaceUserMessage.user);
                        break;
                    }
                    case SpaceEvent.RemoveSpaceUser: {
                        if (!subMessage.removeSpaceUserMessage.userId || !subMessage.removeSpaceUserMessage.filterName)
                            return;
                        this.spaceProvider
                            .get(subMessage.removeSpaceUserMessage.spaceName)
                            .getSpaceFilter(subMessage.removeSpaceUserMessage.filterName)
                            .removeUser(subMessage.removeSpaceUserMessage.userId);
                        if (subMessage.removeSpaceUserMessage.spaceName === WORLD_SPACE_NAME)
                            chatConnection.disconnectSpaceUser(subMessage.removeSpaceUserMessage.userId);
                        break;
                    }
                    case SpaceEvent.updateSpaceMetadata: {
                        const isMetadata = z
                            .record(z.string(), z.unknown())
                            .safeParse(JSON.parse(subMessage.updateSpaceMetadataMessage.metadata));
                        if (!isMetadata.success) {
                            console.error("Error while parsing metadata", isMetadata.error);
                            return;
                        }
                        const metadata: Map<string, unknown> = new Map();
                        for (const [key, value] of Object.entries(isMetadata.data)) {
                            metadata.set(key, value);
                        }

                        if (subMessage.updateSpaceMetadataMessage.metadata)
                            this.spaceProvider
                                .get(subMessage.updateSpaceMetadataMessage.spaceName)
                                .setMetadata(metadata);
                        break;
                    }
                }
            }
        });
    }
}

export class StreamSpaceWatcherSingleton {
    private static instance: StreamSpaceWatcher | null = null;
    static getInstance(socket: WebSocket): StreamSpaceWatcher {
        if (this.instance === null) {
            this.instance = new StreamSpaceWatcher(
                LocalSpaceProviderSingleton.getInstance(),
                socket,
                ServerToClientMessage
            );
        }
        return this.instance;
    }
}
