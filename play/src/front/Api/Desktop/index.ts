import { derived, get, type Readable, type Unsubscriber } from "svelte/store";
import { AvailabilityStatus, AskPositionMessage_AskType } from "@workadventure/messages";
import {
    availabilityStatusStore,
    requestedCameraState,
    requestedMicrophoneState,
    requestedStatusStore,
    silentStore,
} from "../../Stores/MediaStore";
import { resetAllStatusStoreExcept } from "../../Rules/StatusRules/statusChangerFunctions";
import type { RequestedStatus } from "../../Rules/StatusRules/statusRules";
import { isInActiveConversationStore } from "../../Stores/StreamableCollectionStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { activePictureInPictureStore, askPictureInPictureActivatingStore } from "../../Stores/PeerStore";
import { gameSceneIsLoadedStore } from "../../Stores/GameSceneStore";
import { meetingInvitationRequestStore } from "../../Stores/MeetingInvitationStore";
import { playersStore } from "../../Stores/PlayersStore";
import { connectionManager } from "../../Connection/ConnectionManager";
import { gameManager } from "../../Phaser/Game/GameManager";
import { notificationManager } from "../../Notification/NotificationManager";
import { chatVisibilityStore, isMatrixChatEnabledStore } from "../../Stores/ChatStore";
import { selectedRoomStore } from "../../Chat/Stores/SelectRoomStore";
import { desktopAwayStore } from "../../Stores/DesktopStatusStore";
import { focusStore } from "../../Stores/FocusStore";
import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";
import type { ChatConnectionInterface, ChatMessage, ChatRoom } from "../../Chat/Connection/ChatConnection";
import type {
    CompanionConversation,
    CompanionInvitation,
    CompanionMedia,
    CompanionMessage,
    CompanionSelectedConversation,
    CompanionUser,
    WorkAdventureDesktopApi,
} from "../../Interfaces/DesktopAppInterfaces";

type TrayAvailability = "online" | "busy" | "back_in_a_moment" | "do_not_disturb";

type PresenceSnapshot = {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    inWorld: boolean;
    invitationPending: boolean;
    requestedStatus: TrayAvailability;
    statusLocked: boolean;
};

// WA locks the status bar while the user is in a meeting / silent zone; mirror that set so the
// tray "Set status" submenu grays out instead of fighting the availability machine.
const STATUS_LOCKED_SET: ReadonlySet<AvailabilityStatus> = new Set([
    AvailabilityStatus.LISTENER,
    AvailabilityStatus.SPEAKER,
    AvailabilityStatus.JITSI,
    AvailabilityStatus.LIVEKIT,
    AvailabilityStatus.BBB,
    AvailabilityStatus.DENY_PROXIMITY_MEETING,
    AvailabilityStatus.SILENT,
]);

function requestedStatusToKey(status: RequestedStatus | null): TrayAvailability {
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

/** Apply a status chosen from the tray submenu or the companion controls (same persisted setter). */
function applyRequestedStatus(status: TrayAvailability): void {
    switch (status) {
        case "busy":
            resetAllStatusStoreExcept(AvailabilityStatus.BUSY);
            break;
        case "back_in_a_moment":
            resetAllStatusStoreExcept(AvailabilityStatus.BACK_IN_A_MOMENT);
            break;
        case "do_not_disturb":
            resetAllStatusStoreExcept(AvailabilityStatus.DO_NOT_DISTURB);
            break;
        case "online":
        default:
            resetAllStatusStoreExcept(null);
            break;
    }
}

/**
 * Map any effective availability to a companion status-dot key. Meeting/engaged statuses collapse to
 * "busy" so the People list shows a meaningful dot color even for statuses the user can't pick
 * directly. AWAY keeps its own key so it renders in WA's away color, not the (blue) back_in_a_moment.
 */
function availabilityToCompanionKey(status: AvailabilityStatus): string {
    switch (status) {
        case AvailabilityStatus.BUSY:
            return "busy";
        case AvailabilityStatus.DO_NOT_DISTURB:
            return "do_not_disturb";
        case AvailabilityStatus.BACK_IN_A_MOMENT:
            return "back_in_a_moment";
        case AvailabilityStatus.AWAY:
            return "away";
        case AvailabilityStatus.SILENT:
        case AvailabilityStatus.DENY_PROXIMITY_MEETING:
        case AvailabilityStatus.JITSI:
        case AvailabilityStatus.BBB:
        case AvailabilityStatus.LIVEKIT:
        case AvailabilityStatus.SPEAKER:
        case AvailabilityStatus.LISTENER:
            return "busy";
        case AvailabilityStatus.ONLINE:
        default:
            return "online";
    }
}

/** Sort companion conversations: unread / mentioned first, then most-recent activity. */
function sortCompanionConversations(list: CompanionConversation[]): CompanionConversation[] {
    return [...list].sort((a, b) => {
        const aUnread = a.unreadCount > 0 || a.highlightCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 || b.highlightCount > 0 ? 1 : 0;
        return bUnread - aUnread || b.lastActivityAt - a.lastActivityAt;
    });
}

/**
 * Matrix conversation summaries (direct rooms + rooms) as a Readable<CompanionConversation[]>. Same
 * dynamic per-room subscribe idea as {@link createTotalUnreadStore}: each room's unread / highlight
 * counts and messages are watched, and the list is rebuilt from a fresh read on any change.
 */
function createConversationsStore(connection: ChatConnectionInterface): Readable<CompanionConversation[]> {
    return derived(
        [connection.directRooms, connection.rooms],
        ([$direct, $rooms], set) => {
            const entries: Array<{ room: ChatRoom; kind: "direct" | "room" }> = [
                ...$direct.map((room) => ({ room, kind: "direct" as const })),
                ...$rooms.map((room) => ({ room, kind: "room" as const })),
            ];
            const unsubs: Unsubscriber[] = [];

            const emit = () => {
                set(
                    entries.map(({ room, kind }): CompanionConversation => {
                        let preview = "";
                        let lastActivityAt = room.lastMessageTimestamp || 0;
                        try {
                            const msgs = get(room.messages);
                            const last = msgs[msgs.length - 1];
                            if (last) {
                                preview = get(last.content).body ?? "";
                                if (last.date instanceof Date) {
                                    lastActivityAt = Math.max(lastActivityAt, last.date.getTime());
                                }
                            }
                        } catch {
                            /* a room without a readable last message still lists by name */
                        }
                        return {
                            id: room.id,
                            name: get(room.name),
                            kind,
                            preview,
                            lastActivityAt,
                            // Real total unread count, and the @-mention subset when the room exposes it.
                            unreadCount: get(room.unreadNotificationCount) || 0,
                            highlightCount: room.unreadHighlightCount ? get(room.unreadHighlightCount) || 0 : 0,
                        };
                    })
                );
            };

            for (const { room } of entries) {
                unsubs.push(room.unreadNotificationCount.subscribe(() => emit()));
                unsubs.push(room.hasUnreadMessages.subscribe(() => emit()));
                if (room.unreadHighlightCount) {
                    unsubs.push(room.unreadHighlightCount.subscribe(() => emit()));
                }
                unsubs.push(room.messages.subscribe(() => emit()));
            }
            emit();

            return () => {
                for (const unsub of unsubs) {
                    unsub();
                }
            };
        },
        [] as CompanionConversation[]
    );
}

/**
 * Aggregate `unreadNotificationCount` across every room on the chat connection into a single
 * Readable<number>. Uses a manual per-room subscribe map (svelte's `derived` can't span a
 * dynamic set of stores) — rooms leaving the list drop their subscription so a closed room can't
 * keep contributing an unread count.
 */
function createTotalUnreadStore(connection: ChatConnectionInterface): Readable<number> {
    return derived(
        connection.rooms,
        ($rooms, set) => {
            const perRoom = new Map<string, { unsub: Unsubscriber; count: number }>();
            const nextIds = new Set($rooms.map((r) => r.id));

            const emit = () => {
                let total = 0;
                for (const entry of perRoom.values()) {
                    total += entry.count;
                }
                set(total);
            };

            for (const room of $rooms) {
                if (perRoom.has(room.id)) {
                    continue;
                }
                const entry: { unsub: Unsubscriber; count: number } = {
                    count: 0,
                    unsub: () => {},
                };
                entry.unsub = (room as ChatRoom).unreadNotificationCount.subscribe((n) => {
                    entry.count = n;
                    emit();
                });
                perRoom.set(room.id, entry);
            }
            for (const [id, entry] of perRoom) {
                if (!nextIds.has(id)) {
                    entry.unsub();
                    perRoom.delete(id);
                }
            }
            emit();

            return () => {
                for (const entry of perRoom.values()) {
                    entry.unsub();
                }
                perRoom.clear();
            };
        },
        0
    );
}

declare global {
    interface Window {
        WAD?: WorkAdventureDesktopApi;
    }
}

class DesktopApi {
    isSilent = false;

    init() {
        if (!window?.WAD?.desktop) {
            return;
        }

        console.info("Yipee you are using the desktop app ;)");

        window.WAD.onMuteToggle(() => {
            if (this.isSilent) return;
            if (get(requestedMicrophoneState) === true) {
                requestedMicrophoneState.disableMicrophone();
            } else {
                requestedMicrophoneState.enableMicrophone();
            }
        });

        window.WAD.onCameraToggle(() => {
            if (this.isSilent) return;
            if (get(requestedCameraState) === true) {
                requestedCameraState.disableWebcam();
            } else {
                requestedCameraState.enableWebcam();
            }
        });

        // Not unsubscribing is ok, this is a singleton.
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        silentStore.subscribe((silent) => {
            this.isSilent = silent;
        });

        // Prevent the display from sleeping while the user is engaged in a proximity meeting.
        // Main manages a single powerSaveBlocker, so idempotent toggles from rapid store updates
        // are safe — no per-transition cleanup needed here.
        if (window.WAD.setKeepAwake) {
            const setKeepAwake = window.WAD.setKeepAwake;
            //eslint-disable-next-line svelte/no-ignored-unsubscribe
            isInActiveConversationStore.subscribe((inConversation) => {
                setKeepAwake(Boolean(inConversation));
            });
        }

        // Auto-away: when the OS reports the user idle (no input for a while, or screen locked),
        // hush notifications and reflect "away" in WA.
        //
        // Notification hush goes through the dedicated desktopAwayStore (checked by
        // NotificationManager.hasNotification), NOT the availability status machine: a backgrounded
        // window is already AWAY via privacyShutdown, and AWAY→BACK_IN_A_MOMENT is a rejected
        // transition, so a status-only hush would silently fail in exactly the common
        // "backgrounded + idle" case. The dedicated flag is immune to that.
        //
        // Visible presence: we additionally set requestedStatusStore to BACK_IN_A_MOMENT, but only
        // when the window is FOCUSED (idle-at-keyboard) — there the current status is ONLINE and the
        // transition is valid. When the window is backgrounded, privacyShutdown already shows the
        // user as AWAY, so there's nothing to add and we avoid the rejected transition. We write the
        // store WITHOUT persisting (no localUserStore.setRequestedStatus) so auto-away never
        // survives a restart, and only from the neutral (null) state so a manual DND/busy/brb is
        // left untouched.
        if (window.WAD.onSystemIdle) {
            let autoAwayActive = false;
            window.WAD.onSystemIdle((idle) => {
                desktopAwayStore.set(idle);
                if (idle) {
                    if (autoAwayActive) return;
                    if (get(requestedStatusStore) !== null) return;
                    if (!get(focusStore)) return;
                    requestedStatusStore.set(AvailabilityStatus.BACK_IN_A_MOMENT);
                    autoAwayActive = true;
                } else {
                    if (!autoAwayActive) return;
                    // Only clear if the value is still OUR auto-away — if the user changed status
                    // in the meantime (e.g. synced from another device), don't clobber it.
                    if (get(requestedStatusStore) === AvailabilityStatus.BACK_IN_A_MOMENT) {
                        requestedStatusStore.set(null);
                    }
                    autoAwayActive = false;
                }
            });
        }

        // Notification clicks arrive from main once the user has focused the window; route them
        // to the same chat-open path the service-worker click path uses on the web, so the
        // originating chat room is opened and highlighted.
        if (window.WAD.onNotificationClick) {
            window.WAD.onNotificationClick((tag) => {
                if (!tag) return;
                notificationManager.openChatFromNotificationClick(tag).catch((error) => {
                    console.warn("Desktop notification click routing failed", error);
                });
            });
        }

        // Push live presence (meeting + mic/camera) to main so the tray shows a status dot and
        // reflects the mic/camera state in its quick-action checkmarks.
        if (window.WAD.setPresence) {
            const setPresence = window.WAD.setPresence;
            const presenceStore = derived(
                [
                    isInActiveConversationStore,
                    requestedMicrophoneState,
                    requestedCameraState,
                    requestedScreenSharingState,
                    requestedStatusStore,
                    availabilityStatusStore,
                    gameSceneIsLoadedStore,
                    meetingInvitationRequestStore,
                ],
                ([
                    $inMeeting,
                    $mic,
                    $cam,
                    $share,
                    $requested,
                    $availability,
                    $inWorld,
                    $invitation,
                ]): PresenceSnapshot => ({
                    inMeeting: Boolean($inMeeting),
                    micEnabled: Boolean($mic),
                    cameraEnabled: Boolean($cam),
                    screenSharing: Boolean($share),
                    inWorld: Boolean($inWorld),
                    invitationPending: $invitation !== null,
                    requestedStatus: requestedStatusToKey($requested),
                    statusLocked: STATUS_LOCKED_SET.has($availability),
                })
            );
            //eslint-disable-next-line svelte/no-ignored-unsubscribe
            presenceStore.subscribe((presence) => {
                setPresence(presence);
            });
        }

        // Apply availability changes requested from the tray "Set status" submenu. Uses the same
        // persisted setter as the in-app status picker (resetAllStatusStoreExcept), so a tray choice
        // behaves exactly like picking the status from the profile menu. "online" clears to null.
        if (window.WAD.onSetStatus) {
            window.WAD.onSetStatus((status) => applyRequestedStatus(status));
        }

        if (window.WAD.companion) {
            this.initCompanion(window.WAD.companion);
        }

        // Give the desktop tab a meaningful label: the admin-configured world name, pushed once
        // the scene has loaded (and re-pushed on every scene load, e.g. walking through a portal to
        // another map). Falls back silently to the tab's URL-derived label when a world has no name.
        if (window.WAD.setTabTitle) {
            const setTabTitle = window.WAD.setTabTitle;
            //eslint-disable-next-line svelte/no-ignored-unsubscribe
            gameSceneIsLoadedStore.subscribe((loaded) => {
                if (!loaded) {
                    return;
                }
                const name = connectionManager.currentRoom?.roomName;
                if (name) {
                    setTabTitle(name);
                }
            });
        }

        // Mirror the total chat unread count into the dock (macOS) / taskbar (Windows) badge.
        // Wait for the chat connection to hydrate before subscribing — it's asynchronous, so a
        // synchronous subscribe would miss the connection entirely and the badge would stay 0.
        if (window.WAD.setUnreadCount) {
            const setUnreadCount = window.WAD.setUnreadCount;
            gameManager
                .getChatConnection()
                .then((connection) => {
                    //eslint-disable-next-line svelte/no-ignored-unsubscribe
                    createTotalUnreadStore(connection).subscribe((total) => {
                        setUnreadCount(total);
                    });
                })
                .catch((error) => {
                    console.warn("Desktop unread badge: chat connection failed to hydrate", error);
                });
        }
    }

    /**
     * Feed the companion panel: builds CompanionState from the room player list, proximity chat,
     * chat mentions, and the media/status stores, pushing a debounced snapshot on any change; and
     * routes the panel's commands back to the app (mic/camera/close are handled in main).
     */
    private initCompanion(companion: NonNullable<WorkAdventureDesktopApi["companion"]>): void {
        let latestOtherUsers: CompanionUser[] = [];
        let latestMatrixConversations: CompanionConversation[] = [];
        let latestNearby: CompanionConversation | null = null;
        let latestSelected: CompanionSelectedConversation | null = null;
        let selectedConversationId: string | null = null;
        let chatConnection: ChatConnectionInterface | undefined;
        let latestChatStatus: "connecting" | "online" | "unavailable" = "connecting";
        let latestInvitation: CompanionInvitation | null = null;
        let latestMedia: CompanionMedia = {
            micEnabled: false,
            cameraEnabled: false,
            screenSharing: false,
            canScreenShare: true,
            inMeeting: false,
            pipOpen: false,
            status: "online",
            statusLocked: false,
        };
        const playerById = new Map<string, PlayerInterface>();

        // Debounced push: many stores change in bursts (players + messages + media), so coalesce.
        let pushTimer: ReturnType<typeof setTimeout> | undefined;
        const pushNow = () => {
            const self: CompanionUser = {
                id: "self",
                name: "You",
                status: availabilityToCompanionKey(get(availabilityStatusStore)),
                isSelf: true,
            };
            companion.pushState({
                world: {
                    name: connectionManager.currentRoom?.roomName ?? "WorkAdventure",
                    participantCount: latestOtherUsers.length + 1,
                },
                users: [self, ...latestOtherUsers],
                conversations: sortCompanionConversations([
                    ...(latestNearby ? [latestNearby] : []),
                    ...latestMatrixConversations,
                ]),
                selectedConversation: latestSelected,
                media: latestMedia,
                invitation: latestInvitation,
                chatStatus: latestChatStatus,
            });
        };
        const schedulePush = () => {
            if (pushTimer !== undefined) {
                return;
            }
            pushTimer = setTimeout(() => {
                pushTimer = undefined;
                pushNow();
            }, 200);
        };

        // People + count from the room's player list (availabilityStatus is a snapshot per join).
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        playersStore.subscribe((players) => {
            playerById.clear();
            const users: CompanionUser[] = [];
            for (const p of players.values()) {
                const id = String(p.userId);
                playerById.set(id, p);
                users.push({
                    id,
                    name: p.name || "Someone",
                    status: availabilityToCompanionKey(p.availabilityStatus),
                    isSelf: false,
                });
            }
            latestOtherUsers = users;
            schedulePush();
        });

        // Media + status.
        const mediaStore = derived(
            [
                isInActiveConversationStore,
                requestedMicrophoneState,
                requestedCameraState,
                requestedScreenSharingState,
                requestedStatusStore,
                availabilityStatusStore,
                activePictureInPictureStore,
            ],
            ([$inMeeting, $mic, $cam, $share, $requested, $availability, $pipOpen]): CompanionMedia => ({
                micEnabled: Boolean($mic),
                cameraEnabled: Boolean($cam),
                screenSharing: Boolean($share),
                canScreenShare: true,
                inMeeting: Boolean($inMeeting),
                pipOpen: Boolean($pipOpen),
                status: requestedStatusToKey($requested),
                statusLocked: STATUS_LOCKED_SET.has($availability),
            })
        );
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        mediaStore.subscribe((media) => {
            latestMedia = media;
            schedulePush();
        });

        // Pending meeting invitation → banner in the panel (the controller force-opens for it).
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        meetingInvitationRequestStore.subscribe((request) => {
            latestInvitation = request ? { name: request.senderName ?? "" } : null;
            schedulePush();
        });

        const NEARBY_ID = "nearby";
        const mapMessage = (m: ChatMessage): CompanionMessage => ({
            id: m.id,
            author: m.sender?.username ?? "",
            text: get(m.content).body ?? "",
            isSelf: m.isMyMessage === true,
            ts: m.date ? m.date.getTime() : 0,
        });

        // Stream the currently-selected conversation's last 50 messages. Reading the room is a fresh
        // lookup each time so it survives scene reloads / late-hydrating chat.
        let selectedMessagesUnsub: Unsubscriber | undefined;
        const streamSelected = () => {
            selectedMessagesUnsub?.();
            selectedMessagesUnsub = undefined;
            const id = selectedConversationId;
            if (id === null) {
                latestSelected = null;
                schedulePush();
                return;
            }
            let name = "";
            let messages: Readable<readonly ChatMessage[]> | undefined;
            if (id === NEARBY_ID) {
                name = "Nearby";
                try {
                    messages = gameManager.getCurrentGameScene().proximityChatRoomManager.resolveTargetRoom()?.messages;
                } catch {
                    messages = undefined;
                }
            } else {
                try {
                    const room = chatConnection?.getRoomByID(id);
                    name = room ? get(room.name) : "";
                    messages = room?.messages;
                } catch {
                    messages = undefined;
                }
            }
            if (!messages) {
                latestSelected = null;
                schedulePush();
                return;
            }
            selectedMessagesUnsub = messages.subscribe((msgs) => {
                latestSelected = { id, name, messages: msgs.slice(-50).map(mapMessage) };
                schedulePush();
            });
        };

        // Matrix conversation list. The chat connection is a lazy singleton built during scene load
        // (needs login + a matrix server url). Calling getChatConnection() before that only ever
        // returns a throwaway VoidChatConnection with empty rooms — which is why a one-shot early call
        // left the companion list permanently empty while the main app chat (opened later) worked.
        // Instead, (re)acquire the real connection whenever chat becomes enabled.
        let conversationsUnsub: Unsubscriber | undefined;
        let chatStatusUnsub: Unsubscriber | undefined;
        const wireChatConnection = () => {
            gameManager
                .getChatConnection()
                .then((connection) => {
                    chatConnection = connection;
                    conversationsUnsub?.();
                    conversationsUnsub = createConversationsStore(connection).subscribe((conversations) => {
                        latestMatrixConversations = conversations;
                        schedulePush();
                    });
                    // Reflect the live connection status so the panel can distinguish "connecting" /
                    // "chat unavailable" from a genuinely empty conversation list.
                    chatStatusUnsub?.();
                    chatStatusUnsub = connection.connectionStatus.subscribe((status) => {
                        latestChatStatus =
                            status === "ONLINE" ? "online" : status === "CONNECTING" ? "connecting" : "unavailable";
                        schedulePush();
                    });
                    // A conversation may have been selected before the connection hydrated.
                    if (selectedConversationId !== null && selectedConversationId !== NEARBY_ID) {
                        streamSelected();
                    }
                })
                .catch((error) => {
                    console.warn("Desktop companion: chat connection failed to hydrate", error);
                    latestChatStatus = "unavailable";
                    schedulePush();
                });
        };
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        isMatrixChatEnabledStore.subscribe((enabled) => {
            if (enabled) {
                wireChatConnection();
            }
        });

        // Nearby proximity conversation summary. The manager is per-scene, so re-wire on every load.
        let proximityRoomUnsub: Unsubscriber | undefined;
        let nearbyMessagesUnsub: Unsubscriber | undefined;
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        gameSceneIsLoadedStore.subscribe((loaded) => {
            nearbyMessagesUnsub?.();
            nearbyMessagesUnsub = undefined;
            proximityRoomUnsub?.();
            proximityRoomUnsub = undefined;
            latestNearby = null;
            if (selectedConversationId === NEARBY_ID) {
                streamSelected();
            }
            schedulePush();
            if (!loaded) {
                return;
            }
            try {
                proximityRoomUnsub = gameManager
                    .getCurrentGameScene()
                    .proximityChatRoomManager.activeRoomStore.subscribe((room) => {
                        nearbyMessagesUnsub?.();
                        nearbyMessagesUnsub = undefined;
                        if (!room) {
                            latestNearby = null;
                            if (selectedConversationId === NEARBY_ID) {
                                streamSelected();
                            }
                            schedulePush();
                            return;
                        }
                        nearbyMessagesUnsub = room.messages.subscribe((msgs) => {
                            const last = msgs[msgs.length - 1];
                            latestNearby = {
                                id: NEARBY_ID,
                                name: "Nearby",
                                kind: "nearby",
                                preview: last ? get(last.content).body ?? "" : "",
                                lastActivityAt: last?.date instanceof Date ? last.date.getTime() : 0,
                                unreadCount: 0,
                                highlightCount: 0,
                            };
                            schedulePush();
                        });
                        if (selectedConversationId === NEARBY_ID) {
                            streamSelected();
                        }
                    });
            } catch (error) {
                console.warn("Desktop companion: proximity chat not available", error);
            }
        });

        const resolveMatrixRoom = (id: string) => {
            try {
                return chatConnection?.getRoomByID(id);
            } catch {
                return undefined;
            }
        };
        const markConversationRead = (id: string) => {
            if (id === NEARBY_ID) {
                return; // proximity chat has no read receipts
            }
            try {
                resolveMatrixRoom(id)?.setTimelineAsRead();
            } catch (error) {
                console.warn("Desktop companion: mark read failed", error);
            }
        };
        const sendToConversation = (id: string, text: string) => {
            try {
                if (id === NEARBY_ID) {
                    gameManager.getCurrentGameScene().proximityChatRoomManager.resolveTargetRoom()?.sendMessage(text);
                } else {
                    resolveMatrixRoom(id)?.sendMessage(text);
                }
            } catch (error) {
                console.warn("Desktop companion: send message failed", error);
            }
        };
        const openConversationInMain = (id: string) => {
            if (id === NEARBY_ID) {
                return;
            }
            const room = resolveMatrixRoom(id);
            if (room) {
                selectedRoomStore.set(room);
                chatVisibilityStore.set(true);
            }
        };
        const openDmConversation = async (chatId: string) => {
            try {
                const room = chatConnection?.getDirectRoomFor(chatId) ?? (await chatConnection?.createDirectRoom(chatId));
                if (room) {
                    selectedConversationId = room.id;
                    markConversationRead(room.id);
                    streamSelected();
                }
            } catch (error) {
                console.warn("Desktop companion: open DM failed", error);
            }
        };

        // Route panel commands back to the app (focus-main / close / mic / camera handled in main).
        companion.onCommand((command) => {
            switch (command.type) {
                case "toggle-screenshare":
                    if (get(requestedScreenSharingState)) {
                        requestedScreenSharingState.disableScreenSharing();
                    } else {
                        requestedScreenSharingState.enableScreenSharing();
                    }
                    break;
                case "toggle-pip":
                    // Open / close the proven native meeting-video window (PiP).
                    if (get(activePictureInPictureStore)) {
                        window.WAD?.pip?.close().catch(() => {
                            /* best-effort */
                        });
                        askPictureInPictureActivatingStore.set(false);
                    } else {
                        askPictureInPictureActivatingStore.set(true);
                    }
                    break;
                case "set-status":
                    applyRequestedStatus(command.status);
                    break;
                case "select-conversation":
                    selectedConversationId = command.conversationId;
                    // Mark read ONLY on an explicit selection — never on auto-open / state replay.
                    markConversationRead(command.conversationId);
                    streamSelected();
                    break;
                case "send-message": {
                    const text = command.text.trim();
                    if (text) {
                        sendToConversation(command.conversationId, text);
                    }
                    break;
                }
                case "open-conversation-in-main":
                    openConversationInMain(command.conversationId);
                    break;
                case "dm": {
                    const player = playerById.get(command.userId);
                    if (player?.chatID) {
                        openDmConversation(player.chatID).catch(() => {
                            /* errors are handled inside openDmConversation */
                        });
                    }
                    break;
                }
                case "locate": {
                    const player = playerById.get(command.userId);
                    if (player) {
                        try {
                            const scene = gameManager.getCurrentGameScene();
                            scene.connection?.emitAskPosition(
                                player.userUuid,
                                scene.roomUrl,
                                AskPositionMessage_AskType.MOVE,
                                player.userId
                            );
                        } catch (error) {
                            console.warn("Desktop companion: locate failed", error);
                        }
                    }
                    break;
                }
                case "invite": {
                    // Same action as the in-app user list "Invite to meeting" button:
                    // InviteManager applies the antispam rules and emits the request over the wire.
                    const player = playerById.get(command.userId);
                    if (player) {
                        try {
                            const scene = gameManager.getCurrentGameScene();
                            const sent = scene.inviteManager?.requestMeetingInvitation(
                                player.userUuid,
                                player.userId
                            );
                            if (sent) {
                                scene.playSound("meeting-in", 0.15);
                            }
                        } catch (error) {
                            console.warn("Desktop companion: invite failed", error);
                        }
                    }
                    break;
                }
                case "accept-invitation":
                case "decline-invitation": {
                    // Respond to the pending invitation with the same handlers as the in-app popup.
                    // Bringing the app to the front on accept is done by the panel (it also sends
                    // focus-main), so the user lands in the meeting they just joined.
                    const request = get(meetingInvitationRequestStore);
                    if (request) {
                        const payload = {
                            senderUserUuid: request.senderUserUuid ?? "",
                            senderPlayUri: request.senderPlayUri ?? "",
                            senderName: request.senderName ?? "",
                            senderUserId: request.senderUserId ?? 0,
                        };
                        try {
                            const inviteManager = gameManager.getCurrentGameScene().inviteManager;
                            if (command.type === "accept-invitation") {
                                inviteManager?.handleAccept(payload);
                            } else {
                                inviteManager?.handleDecline(payload);
                            }
                        } catch (error) {
                            console.warn("Desktop companion: invitation response failed", error);
                        }
                        meetingInvitationRequestStore.set(null);
                    }
                    break;
                }
                default:
                    break;
            }
        });
    }
}

export const desktopApi = new DesktopApi();
