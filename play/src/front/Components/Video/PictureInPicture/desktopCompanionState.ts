import { derived, get, readable, writable, type Readable, type Unsubscriber } from "svelte/store";
import { AvailabilityStatus, AskPositionMessage_AskType } from "@workadventure/messages";
import {
    availabilityStatusStore,
    requestedCameraState,
    requestedMicrophoneState,
    requestedStatusStore,
} from "../../../Stores/MediaStore";
import { resetAllStatusStoreExcept } from "../../../Rules/StatusRules/statusChangerFunctions";
import type { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
import { isInActiveConversationStore } from "../../../Stores/StreamableCollectionStore";
import { requestedScreenSharingState, screenSharingAvailableStore } from "../../../Stores/ScreenSharingStore";
import { gameSceneIsLoadedStore } from "../../../Stores/GameSceneStore";
import { meetingInvitationRequestStore } from "../../../Stores/MeetingInvitationStore";
import { calendarEventsStore, isActivatedStore as isCalendarActivatedStore } from "../../../Stores/CalendarStore";
import { isActivatedStore as isTodoListActivatedStore, todoListsStore } from "../../../Stores/TodoListStore";
import { playersStore } from "../../../Stores/PlayersStore";
import { currentPlayerWokaStore } from "../../../Stores/CurrentPlayerWokaStore";
import { chatVisibilityStore, isMatrixChatEnabledStore } from "../../../Stores/ChatStore";
import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { CharacterLayerManager } from "../../../Phaser/Entity/CharacterLayerManager";
import type { PlayerInterface } from "../../../Phaser/Game/PlayerInterface";
import type { ChatConnectionInterface, ChatMessage, ChatRoom } from "../../../Chat/Connection/ChatConnection";
import { buildCompanionAgenda } from "../../../Api/Desktop/CompanionAgenda";
import type { CompanionAgenda } from "../../../Interfaces/DesktopAppInterfaces";
import { LL } from "../../../../i18n/i18n-svelte";

/** The availability statuses the user picks, as the companion's status dots name them. */
export type CompanionStatus = "online" | "busy" | "back_in_a_moment" | "do_not_disturb";

export type CompanionUser = {
    id: string;
    name: string;
    /** A CompanionStatus, or "away". */
    status: string;
    isSelf: boolean;
    /** Data URL of the user's Woka; the row falls back to an initials disc. */
    woka?: string;
};

export type CompanionConversation = {
    id: string;
    name: string;
    kind: "nearby" | "direct" | "room";
    preview: string;
    lastActivityAt: number;
    unreadCount: number;
    highlightCount: number;
    woka?: string;
};

export type CompanionMedia = {
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    inMeeting: boolean;
    status: CompanionStatus;
    statusLocked: boolean;
};

export const NEARBY_CONVERSATION_ID = "nearby";

// WA locks the status in a meeting or a silent zone: the companion's status menu grays out.
const STATUS_LOCKED_SET: ReadonlySet<AvailabilityStatus> = new Set([
    AvailabilityStatus.LISTENER,
    AvailabilityStatus.SPEAKER,
    AvailabilityStatus.JITSI,
    AvailabilityStatus.LIVEKIT,
    AvailabilityStatus.BBB,
    AvailabilityStatus.DENY_PROXIMITY_MEETING,
    AvailabilityStatus.SILENT,
]);

function requestedStatusKey(status: RequestedStatus | null): CompanionStatus {
    switch (status) {
        case AvailabilityStatus.BUSY:
            return "busy";
        case AvailabilityStatus.BACK_IN_A_MOMENT:
            return "back_in_a_moment";
        case AvailabilityStatus.DO_NOT_DISTURB:
            return "do_not_disturb";
        default:
            return "online";
    }
}

/** Any availability as a status dot: meeting and silent statuses read as busy, AWAY keeps its colour. */
function availabilityKey(status: AvailabilityStatus): string {
    switch (status) {
        case AvailabilityStatus.BUSY:
        case AvailabilityStatus.SILENT:
        case AvailabilityStatus.DENY_PROXIMITY_MEETING:
        case AvailabilityStatus.JITSI:
        case AvailabilityStatus.BBB:
        case AvailabilityStatus.LIVEKIT:
        case AvailabilityStatus.SPEAKER:
        case AvailabilityStatus.LISTENER:
            return "busy";
        case AvailabilityStatus.DO_NOT_DISTURB:
            return "do_not_disturb";
        case AvailabilityStatus.BACK_IN_A_MOMENT:
            return "back_in_a_moment";
        case AvailabilityStatus.AWAY:
            return "away";
        default:
            return "online";
    }
}

export function setCompanionStatus(status: CompanionStatus): void {
    const requested: Record<CompanionStatus, RequestedStatus | null> = {
        online: null,
        busy: AvailabilityStatus.BUSY,
        back_in_a_moment: AvailabilityStatus.BACK_IN_A_MOMENT,
        do_not_disturb: AvailabilityStatus.DO_NOT_DISTURB,
    };
    resetAllStatusStoreExcept(requested[status]);
}

export const companionMediaStore: Readable<CompanionMedia> = derived(
    [
        isInActiveConversationStore,
        requestedMicrophoneState,
        requestedCameraState,
        requestedScreenSharingState,
        requestedStatusStore,
        availabilityStatusStore,
        screenSharingAvailableStore,
    ],
    ([$inMeeting, $mic, $cam, $share, $requested, $availability, $canShare]) => ({
        micEnabled: Boolean($mic),
        cameraEnabled: Boolean($cam),
        screenSharing: Boolean($share),
        // Like the app's own action bar: sharing needs a bubble or a live stream.
        canScreenShare: Boolean($canShare),
        inMeeting: Boolean($inMeeting),
        status: requestedStatusKey($requested),
        statusLocked: STATUS_LOCKED_SET.has($availability),
    }),
);

export function toggleMicrophone(): void {
    if (get(requestedMicrophoneState)) requestedMicrophoneState.disableMicrophone();
    else requestedMicrophoneState.enableMicrophone();
}

export function toggleCamera(): void {
    if (get(requestedCameraState)) requestedCameraState.disableWebcam();
    else requestedCameraState.enableWebcam();
}

export function toggleScreenSharing(): void {
    if (get(requestedScreenSharingState)) requestedScreenSharingState.disableScreenSharing();
    else requestedScreenSharingState.enableScreenSharing();
}

export const companionAgendaStore: Readable<CompanionAgenda | undefined> = derived(
    [
        isCalendarActivatedStore,
        calendarEventsStore,
        isTodoListActivatedStore,
        todoListsStore,
        LL,
        // "In 12 minutes" and what is in progress go stale: recomputed twice a minute.
        readable(new Date(), (set) => {
            const interval = setInterval(() => set(new Date()), 30_000);
            return () => clearInterval(interval);
        }),
    ],
    ([$calendarOn, $events, $todoOn, $lists, $LL, $now]) =>
        buildCompanionAgenda({
            events: $calendarOn ? $events.values() : undefined,
            lists: $todoOn ? $lists.values() : undefined,
            now: $now,
            labels: {
                inProgress: $LL.desktop.companion.inProgress(),
                until: (time) => $LL.desktop.companion.until({ time }),
            },
        }),
);

/** Woka avatars, by character-texture signature (many players share one); generating one renders a snapshot. */
const wokaCache = writable(new Map<string, string>());
const wokaInFlight = new Set<string>();

function wokaSignature(textures: PlayerInterface["characterTextures"]): string {
    return textures.map((texture) => texture.id).join("|");
}

function ensureWoka(signature: string, textures: PlayerInterface["characterTextures"]): void {
    if (!signature || textures.length === 0 || get(wokaCache).has(signature) || wokaInFlight.has(signature)) return;
    if (!get(gameSceneIsLoadedStore)) return;
    wokaInFlight.add(signature);
    // wokaBase64 only reads {id, url} from each texture.
    CharacterLayerManager.wokaBase64(textures as unknown as Parameters<typeof CharacterLayerManager.wokaBase64>[0])
        .then((dataUrl) => wokaCache.update((cache) => new Map(cache).set(signature, dataUrl)))
        .catch(() => {
            /* the initials disc stays */
        })
        .finally(() => wokaInFlight.delete(signature));
}

/** The people of the world, the user first. */
export const companionUsersStore: Readable<CompanionUser[]> = derived(
    [playersStore, availabilityStatusStore, currentPlayerWokaStore, wokaCache],
    ([$players, $availability, $selfWoka, $wokas]) => {
        const self: CompanionUser = {
            id: "self",
            name: gameManager.getPlayerName() || "",
            status: availabilityKey($availability),
            isSelf: true,
            woka: $selfWoka,
        };
        const others = [...$players.values()].map((player): CompanionUser => {
            const signature = wokaSignature(player.characterTextures);
            ensureWoka(signature, player.characterTextures);
            return {
                id: String(player.userId),
                name: player.name,
                status: availabilityKey(player.availabilityStatus),
                isSelf: false,
                woka: $wokas.get(signature),
            };
        });
        return [self, ...others];
    },
);

function playerOf(userId: string): PlayerInterface | undefined {
    return get(playersStore).get(Number(userId));
}

/** Walk to someone, like the app's user list "Go to". */
export function locateUser(userId: string): void {
    const player = playerOf(userId);
    if (!player) return;
    const scene = gameManager.getCurrentGameScene();
    scene.connection?.emitAskPosition(player.userUuid, scene.roomUrl, AskPositionMessage_AskType.MOVE, player.userId);
}

/** Invite someone to a meeting, like the app's user list (antispam rules in InviteManager). */
export function inviteUser(userId: string): void {
    const player = playerOf(userId);
    if (!player) return;
    const scene = gameManager.getCurrentGameScene();
    if (scene.inviteManager?.requestMeetingInvitation(player.userUuid, player.userId)) {
        scene.playSound("meeting-in", 0.15);
    }
}

export function respondToInvitation(accept: boolean): void {
    const request = get(meetingInvitationRequestStore);
    if (!request) return;
    const payload = {
        senderUserUuid: request.senderUserUuid ?? "",
        senderPlayUri: request.senderPlayUri ?? "",
        senderName: request.senderName ?? "",
        senderUserId: request.senderUserId ?? 0,
    };
    const inviteManager = gameManager.getCurrentGameScene().inviteManager;
    if (accept) inviteManager?.handleAccept(payload);
    else inviteManager?.handleDecline(payload);
    meetingInvitationRequestStore.set(null);
}

function sortConversations(list: CompanionConversation[]): CompanionConversation[] {
    return [...list].sort((a, b) => {
        const aUnread = a.unreadCount > 0 || a.highlightCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 || b.highlightCount > 0 ? 1 : 0;
        return bUnread - aUnread || b.lastActivityAt - a.lastActivityAt;
    });
}

function lastMessage(messages: readonly ChatMessage[]): { preview: string; at: number } {
    const last = messages[messages.length - 1];
    return {
        preview: last ? (get(last.content).body ?? "") : "",
        at: last?.date instanceof Date ? last.date.getTime() : 0,
    };
}

/**
 * The chat of the companion: the bubble's proximity chat and the Matrix conversations, and the one that
 * is open. Made when the companion opens, destroyed when it closes (every subscription goes with it).
 */
export function createCompanionChat() {
    const unsubscribers: Unsubscriber[] = [];
    let connection: ChatConnectionInterface | undefined;
    let disposed = false;
    let connectionGeneration = 0;

    const matrixConversations = writable<CompanionConversation[]>([]);
    const nearby = writable<CompanionConversation | null>(null);
    const status = writable<"connecting" | "online" | "unavailable">("connecting");
    const selectedId = writable<string | null>(null);
    const selected = writable<{ id: string; name: string; room: ChatRoom } | null>(null);

    const roomOf = (id: string): ChatRoom | undefined => {
        try {
            return connection?.getRoomByID(id);
        } catch {
            return undefined;
        }
    };
    const nearbyRoom = () => {
        try {
            return gameManager.getCurrentGameScene().proximityChatRoomManager.resolveTargetRoom();
        } catch {
            return undefined;
        }
    };

    let selectedUnsubscribe: Unsubscriber | undefined;
    const streamSelected = () => {
        selectedUnsubscribe?.();
        selectedUnsubscribe = undefined;
        const id = get(selectedId);
        const room = id === null ? undefined : id === NEARBY_CONVERSATION_ID ? nearbyRoom() : roomOf(id);
        if (!id || !room) {
            selected.set(null);
            return;
        }
        selectedUnsubscribe = room.name.subscribe((name) => {
            selected.set({ id, name: id === NEARBY_CONVERSATION_ID ? get(LL).chat.proximity() : name, room });
        });
    };
    unsubscribers.push(() => selectedUnsubscribe?.());

    // The Matrix chat connection is built during the scene load, once chat is enabled.
    let roomsUnsubscribe: Unsubscriber | undefined;
    unsubscribers.push(() => roomsUnsubscribe?.());
    unsubscribers.push(
        isMatrixChatEnabledStore.subscribe((enabled) => {
            const generation = ++connectionGeneration;
            roomsUnsubscribe?.();
            roomsUnsubscribe = undefined;
            connection = undefined;
            if (!enabled) {
                matrixConversations.set([]);
                status.set("unavailable");
                if (get(selectedId) !== NEARBY_CONVERSATION_ID) selected.set(null);
                return;
            }
            gameManager
                .getChatConnection()
                .then((chatConnection) => {
                    if (disposed || generation !== connectionGeneration) return;
                    connection = chatConnection;
                    roomsUnsubscribe?.();
                    const statusUnsubscribe = chatConnection.connectionStatus.subscribe((connectionStatus) =>
                        status.set(
                            connectionStatus === "ONLINE"
                                ? "online"
                                : connectionStatus === "CONNECTING"
                                  ? "connecting"
                                  : "unavailable",
                        ),
                    );
                    const listUnsubscribe = derived(
                        [chatConnection.directRooms, chatConnection.rooms],
                        ([$direct, $rooms], set) => {
                            const entries = [
                                ...$direct.map((room) => ({ room, kind: "direct" as const })),
                                ...$rooms.map((room) => ({ room, kind: "room" as const })),
                            ];
                            const emit = () =>
                                set(
                                    entries.map(({ room, kind }): CompanionConversation => {
                                        const last = lastMessage(get(room.messages));
                                        return {
                                            id: room.id,
                                            name: get(room.name),
                                            kind,
                                            preview: last.preview,
                                            lastActivityAt: Math.max(room.lastMessageTimestamp || 0, last.at),
                                            unreadCount: get(room.unreadNotificationCount) || 0,
                                            highlightCount: room.unreadHighlightCount
                                                ? get(room.unreadHighlightCount) || 0
                                                : 0,
                                        };
                                    }),
                                );
                            const roomUnsubscribers = entries.flatMap(({ room }) => [
                                room.unreadNotificationCount.subscribe(emit),
                                room.messages.subscribe(emit),
                                ...(room.unreadHighlightCount ? [room.unreadHighlightCount.subscribe(emit)] : []),
                            ]);
                            emit();
                            return () => roomUnsubscribers.forEach((unsubscribe) => unsubscribe());
                        },
                        [] as CompanionConversation[],
                    ).subscribe((list) => matrixConversations.set(list));
                    roomsUnsubscribe = () => {
                        statusUnsubscribe();
                        listUnsubscribe();
                    };
                    // A conversation may have been opened before the connection was there.
                    if (get(selectedId) !== null && get(selectedId) !== NEARBY_CONVERSATION_ID) streamSelected();
                })
                .catch(() => {
                    if (!disposed && generation === connectionGeneration) status.set("unavailable");
                });
        }),
    );

    // The bubble's proximity chat: per scene, so followed again on every scene load.
    let proximityUnsubscribe: Unsubscriber | undefined;
    unsubscribers.push(() => proximityUnsubscribe?.());
    unsubscribers.push(
        gameSceneIsLoadedStore.subscribe((loaded) => {
            proximityUnsubscribe?.();
            proximityUnsubscribe = undefined;
            nearby.set(null);
            if (!loaded) return;
            let messagesUnsubscribe: Unsubscriber | undefined;
            let roomUnsubscribe: Unsubscriber | undefined;
            let stopped = false;
            proximityUnsubscribe = () => {
                stopped = true;
                messagesUnsubscribe?.();
                roomUnsubscribe?.();
            };
            // The proximity chat is set up a little after the scene loads.
            gameManager
                .getCurrentGameScene()
                .proximityChatRoomManagerReady.then((manager) => {
                    if (stopped) return;
                    roomUnsubscribe = manager.activeRoomStore.subscribe((room) => {
                        messagesUnsubscribe?.();
                        messagesUnsubscribe = undefined;
                        if (!room) {
                            nearby.set(null);
                        } else {
                            messagesUnsubscribe = room.messages.subscribe((messages) => {
                                const last = lastMessage(messages);
                                nearby.set({
                                    id: NEARBY_CONVERSATION_ID,
                                    name: get(LL).chat.proximity(),
                                    kind: "nearby",
                                    preview: last.preview,
                                    lastActivityAt: last.at,
                                    unreadCount: 0,
                                    highlightCount: 0,
                                    woka: get(currentPlayerWokaStore),
                                });
                            });
                        }
                        if (get(selectedId) === NEARBY_CONVERSATION_ID) streamSelected();
                    });
                })
                .catch(() => {
                    /* no bubble chat */
                });
        }),
    );

    const conversations = derived([nearby, matrixConversations], ([$nearby, $matrix]) =>
        sortConversations([...($nearby ? [$nearby] : []), ...$matrix]),
    );

    return {
        conversations,
        status: { subscribe: status.subscribe } as Readable<"connecting" | "online" | "unavailable">,
        selected: { subscribe: selected.subscribe } as Readable<{
            id: string;
            name: string;
            room: ChatRoom;
        } | null>,
        /** Open a conversation, marking it read (an explicit choice only). */
        open(id: string) {
            selectedId.set(id);
            if (id !== NEARBY_CONVERSATION_ID) roomOf(id)?.setTimelineAsRead();
            streamSelected();
        },
        /** Existing DM only: the compact surface never creates rooms. */
        async openDirect(userId: string): Promise<string | undefined> {
            const chatId = playerOf(userId)?.chatID;
            if (!chatId || !connection) return undefined;
            const currentConnection = connection;
            const room = await currentConnection.getDirectRoomFor(chatId);
            if (disposed || currentConnection !== connection) return undefined;
            if (room) this.open(room.id);
            return room?.id;
        },
        openMeeting(): string | undefined {
            if (!get(nearby)) return undefined;
            this.open(NEARBY_CONVERSATION_ID);
            return NEARBY_CONVERSATION_ID;
        },
        /** Show a conversation in the app's own chat. */
        openInApp(id: string) {
            const room = id === NEARBY_CONVERSATION_ID ? nearbyRoom() : roomOf(id);
            if (!room) return;
            selectedRoomStore.set(room);
            chatVisibilityStore.set(true);
        },
        destroy() {
            disposed = true;
            connectionGeneration++;
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        },
    };
}
