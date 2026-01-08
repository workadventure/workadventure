import { get, readable, writable } from "svelte/store";
import type { PrivateSpaceEvent, SpaceEvent } from "@workadventure/messages";
import { localUserStore } from "../Connection/LocalUserStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { availabilityStatusStore } from "../Stores/MediaStore";
import LL from "../../i18n/i18n-svelte";
import type { SpaceUserExtended } from "./SpaceInterface";

export const localSpaceUser = (name?: string): SpaceUserExtended => {
    return {
        isLogged: localUserStore.isLogged(),
        availabilityStatus: get(availabilityStatusStore),
        roomName: undefined,
        visitCardUrl: undefined,
        tags: [],
        cameraState: false,
        microphoneState: false,
        screenSharingState: true,
        megaphoneState: false,
        uuid: localUserStore.getLocalUser()?.uuid ?? "",
        chatID: localUserStore.getChatId() ?? undefined,
        showVoiceIndicator: true,
        spaceUserId: "local",
        name: name ?? get(LL).camera.my.nameTag(),
        playUri: "local",
        color: "local",
        jitsiParticipantId: undefined,
        characterTextures: [],
        pictureStore: readable<string | undefined>(undefined, (set) => {
            const unsubscribe = gameManager
                .getCurrentGameScene()
                .CurrentPlayer.pictureStore.subscribe((pictureStore) => {
                    set(pictureStore);
                });
            return () => {
                unsubscribe();
            };
        }),
        emitPrivateEvent: (message: NonNullable<PrivateSpaceEvent["event"]>) => {
            throw new Error("should not be called");
        },
        space: {
            emitPublicMessage: (message: NonNullable<SpaceEvent["event"]>) => {
                throw new Error("should not be called");
            },
        },
        reactiveUser: {
            spaceUserId: "",
            playUri: "",
            roomName: "",
            name: writable(localUserStore.getName() ?? ""),
            color: writable("local"),
            characterTextures: writable([]),
            showVoiceIndicator: writable(true),
            availabilityStatus: writable(get(availabilityStatusStore)),
            isLogged: writable(localUserStore.isLogged()),
            visitCardUrl: writable(undefined),
            tags: writable([]),
            cameraState: writable(false),
            microphoneState: writable(false),
            screenSharingState: writable(true),
            megaphoneState: writable(false),
            jitsiParticipantId: writable(undefined),
            uuid: writable(localUserStore.getLocalUser()?.uuid ?? ""),
            chatID: writable(localUserStore.getChatId() ?? undefined),
        },
    };
};
