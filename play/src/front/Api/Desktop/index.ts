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
import { gameSceneIsLoadedStore } from "../../Stores/GameSceneStore";
import { playersStore } from "../../Stores/PlayersStore";
import { connectionManager } from "../../Connection/ConnectionManager";
import { gameManager } from "../../Phaser/Game/GameManager";
import { notificationManager } from "../../Notification/NotificationManager";
import { openDirectChatRoom } from "../../Chat/Utils";
import { desktopAwayStore } from "../../Stores/DesktopStatusStore";
import { focusStore } from "../../Stores/FocusStore";
import type { PlayerInterface } from "../../Phaser/Game/PlayerInterface";
import type { ChatConnectionInterface, ChatRoom } from "../../Chat/Connection/ChatConnection";
import type {
    CompanionMedia,
    CompanionMention,
    CompanionMessage,
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
 * "busy" and away-like ones to "back_in_a_moment" so the People list shows a meaningful dot color
 * even for statuses the user can't pick directly.
 */
function availabilityToCompanionKey(status: AvailabilityStatus): string {
    switch (status) {
        case AvailabilityStatus.BUSY:
            return "busy";
        case AvailabilityStatus.DO_NOT_DISTURB:
            return "do_not_disturb";
        case AvailabilityStatus.BACK_IN_A_MOMENT:
        case AvailabilityStatus.AWAY:
            return "back_in_a_moment";
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

/**
 * Chat rooms with unread mentions, as a Readable<CompanionMention[]>. Same dynamic per-room
 * subscribe pattern as {@link createTotalUnreadStore}: each room's unreadNotificationCount is
 * watched, and on any change the mention list is rebuilt from the rooms that currently have a
 * positive count (title = room name, body = last message preview, tag = room id for click routing).
 */
function createMentionsStore(connection: ChatConnectionInterface): Readable<CompanionMention[]> {
    return derived(
        connection.rooms,
        ($rooms, set) => {
            const perRoom = new Map<string, { unsub: Unsubscriber; count: number; room: ChatRoom }>();
            const nextIds = new Set($rooms.map((r) => r.id));

            const emit = () => {
                const mentions: CompanionMention[] = [];
                for (const entry of perRoom.values()) {
                    if (entry.count <= 0) {
                        continue;
                    }
                    const room = entry.room;
                    let body = "";
                    try {
                        const msgs = get(room.messages);
                        const last = msgs[msgs.length - 1];
                        if (last) {
                            body = get(last.content).body ?? "";
                        }
                    } catch {
                        /* a room without a readable last message still shows its title */
                    }
                    mentions.push({ id: room.id, title: get(room.name), body, tag: room.id });
                }
                set(mentions);
            };

            for (const room of $rooms) {
                if (perRoom.has(room.id)) {
                    continue;
                }
                const entry: { unsub: Unsubscriber; count: number; room: ChatRoom } = {
                    count: 0,
                    room,
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
        [] as CompanionMention[]
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
                ],
                ([$inMeeting, $mic, $cam, $share, $requested, $availability, $inWorld]): PresenceSnapshot => ({
                    inMeeting: Boolean($inMeeting),
                    micEnabled: Boolean($mic),
                    cameraEnabled: Boolean($cam),
                    screenSharing: Boolean($share),
                    inWorld: Boolean($inWorld),
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
        let latestMessages: CompanionMessage[] = [];
        let latestMentions: CompanionMention[] = [];
        let latestMedia: CompanionMedia = {
            micEnabled: false,
            cameraEnabled: false,
            screenSharing: false,
            canScreenShare: true,
            inMeeting: false,
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
                messages: latestMessages,
                mentions: latestMentions,
                media: latestMedia,
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
            ],
            ([$inMeeting, $mic, $cam, $share, $requested, $availability]): CompanionMedia => ({
                micEnabled: Boolean($mic),
                cameraEnabled: Boolean($cam),
                screenSharing: Boolean($share),
                canScreenShare: true,
                inMeeting: Boolean($inMeeting),
                status: requestedStatusToKey($requested),
                statusLocked: STATUS_LOCKED_SET.has($availability),
            })
        );
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        mediaStore.subscribe((media) => {
            latestMedia = media;
            schedulePush();
        });

        // Mentions from chat rooms with unread counts (async: the chat connection hydrates late).
        gameManager
            .getChatConnection()
            .then((connection) => {
                //eslint-disable-next-line svelte/no-ignored-unsubscribe
                createMentionsStore(connection).subscribe((mentions) => {
                    latestMentions = mentions;
                    schedulePush();
                });
            })
            .catch((error) => {
                console.warn("Desktop companion: chat connection failed to hydrate", error);
            });

        // Proximity chat messages. The manager is per-scene, so re-wire on every scene (re)load.
        let proximityRoomUnsub: Unsubscriber | undefined;
        let messagesUnsub: Unsubscriber | undefined;
        //eslint-disable-next-line svelte/no-ignored-unsubscribe
        gameSceneIsLoadedStore.subscribe((loaded) => {
            messagesUnsub?.();
            messagesUnsub = undefined;
            proximityRoomUnsub?.();
            proximityRoomUnsub = undefined;
            latestMessages = [];
            schedulePush();
            if (!loaded) {
                return;
            }
            try {
                proximityRoomUnsub = gameManager
                    .getCurrentGameScene()
                    .proximityChatRoomManager.activeRoomStore.subscribe((room) => {
                        messagesUnsub?.();
                        messagesUnsub = undefined;
                        if (!room) {
                            latestMessages = [];
                            schedulePush();
                            return;
                        }
                        messagesUnsub = room.messages.subscribe((msgs) => {
                            latestMessages = msgs.slice(-40).map((m) => ({
                                id: m.id,
                                author: m.sender?.username ?? "",
                                text: get(m.content).body ?? "",
                                isSelf: m.isMyMessage === true,
                            }));
                            schedulePush();
                        });
                    });
            } catch (error) {
                console.warn("Desktop companion: proximity chat not available", error);
            }
        });

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
                case "set-status":
                    applyRequestedStatus(command.status);
                    break;
                case "send-chat": {
                    const text = command.text.trim();
                    if (text) {
                        try {
                            gameManager
                                .getCurrentGameScene()
                                .proximityChatRoomManager.resolveTargetRoom()
                                ?.sendMessage(text);
                        } catch (error) {
                            console.warn("Desktop companion: send chat failed", error);
                        }
                    }
                    break;
                }
                case "dm": {
                    const player = playerById.get(command.userId);
                    if (player?.chatID) {
                        openDirectChatRoom(player.chatID).catch((error) => {
                            console.warn("Desktop companion: open DM failed", error);
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
                case "open-mention":
                    if (command.tag) {
                        notificationManager.openChatFromNotificationClick(command.tag).catch((error) => {
                            console.warn("Desktop companion: open mention failed", error);
                        });
                    }
                    break;
                default:
                    break;
            }
        });
    }
}

export const desktopApi = new DesktopApi();
