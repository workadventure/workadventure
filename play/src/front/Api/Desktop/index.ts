import { derived, get, type Readable, type Unsubscriber } from "svelte/store";
import type { DesktopPresence, WorkAdventureDesktopApi } from "@workadventure/desktop-api";
import {
    availabilityStatusStore,
    enableCameraSceneVisibilityStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
} from "../../Stores/MediaStore";
import { isInActiveConversationStore, isInRemoteConversation } from "../../Stores/StreamableCollectionStore";
import { currentPlayerGroupIdStore } from "../../Stores/CurrentPlayerGroupStore";
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
import { idleStore } from "../../Stores/IdleStore";
import { goIdle } from "../../Rules/IdleRules";
import { toggleCamera, toggleMicrophone } from "../../Stores/HeldMediaStore";
import type { ChatConnectionInterface, ChatRoom } from "../../Chat/Connection/ChatConnection";
import { openDesktopChildWindow, type DesktopChildWindow } from "../../Components/Video/PictureInPicture/childWindow";
import DesktopAnnotationOverlay from "../../Components/Video/PictureInPicture/DesktopAnnotationOverlay.svelte";
import DesktopMeetingBar from "../../Components/Video/PictureInPicture/DesktopMeetingBar.svelte";

import { DESKTOP_VERSION_POLICY } from "../../Enum/EnvironmentVariable";
import { desktopDownloadUrl, desktopVersionStatus } from "../../../common/DesktopVersionPolicy";
import { getColorOfStatus, getStatusLabel } from "../../Utils/AvailabilityStatus";
import { startSvelteAnnotations } from "./SvelteAnnotations";

/** The desktop contract this page speaks (see `hello` in @workadventure/desktop-api). */
const PAGE_CONTRACT = 2;
const desktopDownload = desktopDownloadUrl(DESKTOP_VERSION_POLICY);

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
        } else if (desktopDownload) {
            warningMessageStore.addWarningMessage(get(LL).warning.desktopAppOutdated({ url: desktopDownload }));
        }
        window.WAD.getVersion()
            .then((version) => {
                if (desktopVersionStatus(version, DESKTOP_VERSION_POLICY) === "belowMinimum") {
                    warningMessageStore.addWarningMessage(get(LL).desktop.application.status.belowMinimum());
                }
            })
            .catch((error: unknown) => console.warn("Could not read desktop version", error));

        // The same toggles as the buttons: under away, idle or a status the user picked, turning a device on
        // brings them back with it, instead of turning off a device their status holds.
        window.WAD.onMuteToggle(() => {
            if (this.isSilent) return;
            toggleMicrophone();
        });

        window.WAD.onCameraToggle(() => {
            if (this.isSilent) return;
            toggleCamera();
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

        // The OS reports the user idle (no input for a while, screen locked, machine asleep): notifications are
        // hushed (desktopAwayStore, checked by NotificationManager), and the user goes idle, which turns their
        // camera and microphone off (see goIdle for when it does not). Activity again ends idle only while
        // WorkAdventure has the focus: input in another app does not mean the user has seen WorkAdventure.
        if (window.WAD.onSystemIdle) {
            window.WAD.onSystemIdle((idle) => {
                desktopAwayStore.set(idle);
                if (idle) {
                    goIdle();
                } else if (get(focusStore)) {
                    idleStore.set(false);
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
        // The screen the user shares, so that the mini window never opens by itself over it.
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
                    availabilityStatusStore,
                    gameSceneIsLoadedStore,
                    onboardingStore,
                    meetingInvitationRequestStore,
                    allowPictureInPictureStore,
                    isInRemoteConversation,
                    currentPlayerGroupIdStore,
                    // The status label follows the language, which can change without a reload.
                    LL,
                ],
                ([
                    $inMeeting,
                    $mic,
                    $cam,
                    $share,
                    $status,
                    $inWorld,
                    $onboarding,
                    $invitation,
                    $allowPictureInPicture,
                    $remote,
                    $groupId,
                ]): Required<DesktopPresence> => ({
                    inMeeting: Boolean($inMeeting),
                    // Another participant's video box or share, or a bubble that just formed (a bubble
                    // always has someone else). Alone in a meeting room, inMeeting stays true: this does not.
                    withOthers: Boolean($remote) || $groupId !== undefined,
                    micEnabled: Boolean($mic),
                    cameraEnabled: Boolean($cam),
                    screenSharing: Boolean($share),
                    inWorld: Boolean($inWorld),
                    onboarding: $onboarding,
                    invitationPending: $invitation !== null,
                    autoOpenAllowed: $allowPictureInPicture,
                    status: { label: getStatusLabel($status), color: getColorOfStatus($status).filling },
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
            const stopAnnotations = startSvelteAnnotations(windows);
            window.addEventListener("pagehide", stopAnnotations, { once: true });
            // Both float over the user's screen: only their content shows.
            const transparentWindow = "html, body { background: transparent !important; }";
            let annotation: DesktopChildWindow | undefined;
            let meetingBar: DesktopChildWindow | undefined;
            windows.onOpen((kind) => {
                if (kind === "annotation") {
                    if (!annotation)
                        annotation = openDesktopChildWindow("wa-annotation", DesktopAnnotationOverlay, () => ({}), {
                            styles: transparentWindow,
                            onClose: () => {
                                annotation = undefined;
                            },
                        });
                    return;
                }
                if (kind !== "meeting-bar" || meetingBar) return;
                meetingBar = openDesktopChildWindow(
                    "wa-meeting-bar",
                    DesktopMeetingBar,
                    (ownerDocument) => ({ windows, ownerDocument }),
                    { onClose: () => (meetingBar = undefined), styles: transparentWindow },
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
