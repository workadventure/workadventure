import { derived, get, type Readable, type Unsubscriber } from "svelte/store";
import { requestedCameraState, requestedMicrophoneState, silentStore } from "../../Stores/MediaStore";
import { isInActiveConversationStore } from "../../Stores/StreamableCollectionStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import type { ChatConnectionInterface, ChatRoom } from "../../Chat/Connection/ChatConnection";
import type { WorkAdventureDesktopApi } from "../../Interfaces/DesktopAppInterfaces";

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
