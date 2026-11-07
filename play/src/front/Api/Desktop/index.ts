import { derived, get, type Readable, type Unsubscriber } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    enableCameraSceneVisibilityStore,
    requestedCameraState,
    requestedMicrophoneState,
    requestedStatusStore,
    silentStore,
} from "../../Stores/MediaStore";
import type { RequestedStatus } from "../../Rules/StatusRules/statusRules";
import { isInActiveConversationStore } from "../../Stores/StreamableCollectionStore";
import { warningMessageStore } from "../../Stores/ErrorStore";
import { LL } from "../../../i18n/i18n-svelte";
import { activeScreenShareSourceStore, requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { gameSceneIsLoadedStore } from "../../Stores/GameSceneStore";
import { loginSceneVisibleStore } from "../../Stores/LoginSceneStore";
import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
import { selectCompanionSceneVisibleStore } from "../../Stores/SelectCompanionStore";
import { pwaInstallSceneVisibleStore } from "../../Stores/PwaInstallStore";
import { meetingInvitationRequestStore } from "../../Stores/MeetingInvitationStore";
import { allowPictureInPictureStore } from "../../Stores/PeerStore";
import { connectionManager } from "../../Connection/ConnectionManager";
import { gameManager } from "../../Phaser/Game/GameManager";
import { notificationManager } from "../../Notification/NotificationManager";
import { desktopAwayStore } from "../../Stores/DesktopStatusStore";
import { focusStore } from "../../Stores/FocusStore";
import type { ChatConnectionInterface, ChatRoom } from "../../Chat/Connection/ChatConnection";
import type { WorkAdventureDesktopApi } from "../../Interfaces/DesktopAppInterfaces";
import { openDesktopChildWindow, type DesktopChildWindow } from "../../Components/Video/PictureInPicture/childWindow";
import DesktopMeetingBar from "../../Components/Video/PictureInPicture/DesktopMeetingBar.svelte";
import desktopMeetingBarStyles from "../../Components/Video/PictureInPicture/desktopMeetingBar.css?raw";

/** The desktop contract this page speaks (see `hello` in DesktopAppInterfaces). */
const PAGE_CONTRACT = 2;
const DESKTOP_APP_DOWNLOAD_URL = "https://github.com/workadventure/workadventure/releases/latest";

type TrayAvailability = "online" | "busy" | "back_in_a_moment" | "do_not_disturb";

type PresenceSnapshot = {
    inMeeting: boolean;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    inWorld: boolean;
    /** A first-connection screen (name, Woka, companion, camera) is waiting for the user. */
    onboarding: boolean;
    invitationPending: boolean;
    autoOpenAllowed: boolean;
    requestedStatus: TrayAvailability;
};

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

/**
 * Aggregate `unreadNotificationCount` across every room on the chat connection into a single
 * Readable<number>. Uses a manual per-room subscribe map (svelte's `derived` can't span a
 * dynamic set of stores) — rooms leaving the list drop their subscription so a closed room can't
 * keep contributing an unread count.
 */
function createTotalUnreadStore(connection: ChatConnectionInterface): Readable<number> {
    return derived(
        [connection.rooms, connection.directRooms],
        ([$groupRooms, $directRooms], set) => {
            // `rooms` only holds group rooms: DMs live in `directRooms` and must count on the badge too.
            const $rooms = [...$groupRooms, ...$directRooms];
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
        0,
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

        // The handshake: this page speaks contract 2, so the app may open its floating windows here. An
        // app without it is older than this page: it keeps working, the user is told an update exists.
        if (window.WAD.hello) {
            window.WAD.hello({ contract: PAGE_CONTRACT });
        } else {
            warningMessageStore.addWarningMessage(
                get(LL).warning.desktopAppOutdated({ url: DESKTOP_APP_DOWNLOAD_URL }),
            );
        }

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

        // One meeting at a time across the desktop tabs: another tab entered one, so this world stops
        // sending. Nothing is turned back on by itself when that meeting ends.
        window.WAD.onMediaPreempted?.(() => {
            requestedMicrophoneState.disableMicrophone();
            requestedCameraState.disableWebcam();
            requestedScreenSharingState.disableScreenSharing();
        });
        window.WAD.onOtherMeetingMuted?.((worldName) => {
            warningMessageStore.addWarningMessage(get(LL).warning.otherMeetingMuted({ world: worldName }));
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
        //
        // Never during a meeting: someone following it without touching the keyboard or the mouse
        // (a presentation, the companion's video) is not away, and BACK_IN_A_MOMENT would cut their
        // camera and microphone.
        if (window.WAD.onSystemIdle) {
            let autoAwayActive = false;
            window.WAD.onSystemIdle((idle) => {
                desktopAwayStore.set(idle);
                if (idle) {
                    if (autoAwayActive) return;
                    if (get(requestedStatusStore) !== null) return;
                    if (!get(focusStore)) return;
                    if (get(isInActiveConversationStore)) return;
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
        // The screen the user shares, so that the companion never opens by itself over it.
        if (window.WAD.setScreenShareSource) {
            const setScreenShareSource = window.WAD.setScreenShareSource;
            //eslint-disable-next-line svelte/no-ignored-unsubscribe
            activeScreenShareSourceStore.subscribe((source) => {
                setScreenShareSource(source ? { sourceId: source.id, displayId: source.display_id } : null);
            });
        }

        if (window.WAD.setPresence) {
            const setPresence = window.WAD.setPresence;
            // The screens shown before the world, which wait for the user: the shell must not mistake
            // them for a stalled load.
            const onboardingStore = derived(
                [
                    loginSceneVisibleStore,
                    selectCharacterSceneVisibleStore,
                    selectCompanionSceneVisibleStore,
                    enableCameraSceneVisibilityStore,
                    pwaInstallSceneVisibleStore,
                ],
                (visible) => visible.some(Boolean),
            );
            const presenceStore = derived(
                [
                    isInActiveConversationStore,
                    requestedMicrophoneState,
                    requestedCameraState,
                    requestedScreenSharingState,
                    requestedStatusStore,
                    gameSceneIsLoadedStore,
                    onboardingStore,
                    meetingInvitationRequestStore,
                    allowPictureInPictureStore,
                ],
                ([
                    $inMeeting,
                    $mic,
                    $cam,
                    $share,
                    $requested,
                    $inWorld,
                    $onboarding,
                    $invitation,
                    $allowPictureInPicture,
                ]): PresenceSnapshot => ({
                    inMeeting: Boolean($inMeeting),
                    micEnabled: Boolean($mic),
                    cameraEnabled: Boolean($cam),
                    screenSharing: Boolean($share),
                    inWorld: Boolean($inWorld),
                    onboarding: $onboarding,
                    invitationPending: $invitation !== null,
                    autoOpenAllowed: $allowPictureInPicture,
                    requestedStatus: requestedStatusToKey($requested),
                }),
            );
            //eslint-disable-next-line svelte/no-ignored-unsubscribe
            presenceStore.subscribe((presence) => {
                setPresence(presence);
            });
            // Presence in the desktop shell is a single global describing the *active* tab, but this
            // store only fires on change — so after the shell clears it (a tab switch), this world's
            // state would stay missing until something here happened to change. Answer the shell's
            // request with the current value so switching back re-syncs immediately.
            window.WAD.onRequestPresence?.(() => {
                setPresence(get(presenceStore));
            });
        }

        // The presenter meeting bar: the desktop app asks for it while the user shares their screen and
        // closes it itself (child-windows.ts in the desktop app).
        const windows = window.WAD.windows;
        if (windows) {
            let meetingBar: DesktopChildWindow | undefined;
            windows.onOpen((kind) => {
                if (kind !== "meeting-bar" || meetingBar) return;
                meetingBar = openDesktopChildWindow(
                    "wa-meeting-bar",
                    DesktopMeetingBar,
                    (ownerDocument) => ({ windows, ownerDocument }),
                    {
                        onClose: () => (meetingBar = undefined),
                        styles: desktopMeetingBarStyles,
                        // Its own design only: the app's styles would fight it.
                        pageStyles: false,
                    },
                );
            });
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
}

export const desktopApi = new DesktopApi();
