import { derived, get, type Readable, type Unsubscriber } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    requestedCameraState,
    requestedMicrophoneState,
    requestedStatusStore,
    silentStore,
} from "../../Stores/MediaStore";
import { isInActiveConversationStore } from "../../Stores/StreamableCollectionStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { notificationManager } from "../../Notification/NotificationManager";
import { desktopAwayStore } from "../../Stores/DesktopStatusStore";
import { focusStore } from "../../Stores/FocusStore";
import type { ChatConnectionInterface, ChatRoom } from "../../Chat/Connection/ChatConnection";
import type { WorkAdventureDesktopApi } from "../../Interfaces/DesktopAppInterfaces";

type PresenceSnapshot = {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
};

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
                [isInActiveConversationStore, requestedMicrophoneState, requestedCameraState, requestedScreenSharingState],
                ([$inMeeting, $mic, $cam, $share]): PresenceSnapshot => ({
                    inMeeting: Boolean($inMeeting),
                    micEnabled: Boolean($mic),
                    cameraEnabled: Boolean($cam),
                    screenSharing: Boolean($share),
                })
            );
            //eslint-disable-next-line svelte/no-ignored-unsubscribe
            presenceStore.subscribe((presence) => {
                setPresence(presence);
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
}

export const desktopApi = new DesktopApi();
