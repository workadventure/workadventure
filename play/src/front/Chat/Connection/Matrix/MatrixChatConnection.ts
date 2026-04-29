import type { Readable, Unsubscriber, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import type {
    EmittedEvents,
    ICreateRoomOpts,
    ICreateRoomStateEvent,
    IPushRule,
    IRoomDirectoryOptions,
    MatrixClient,
    MatrixEvent,
    Room,
    User,
    Visibility,
} from "matrix-js-sdk";
import {
    ClientEvent,
    CryptoEvent,
    EventTimeline,
    EventType,
    MatrixError,
    PendingEventOrdering,
    PushRuleActionName,
    RoomEvent,
    RoomStateEvent,
    SetPresence,
    SyncState,
    UserEvent,
} from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { MapStore } from "@workadventure/store-utils";
import { KnownMembership } from "matrix-js-sdk/lib/@types/membership";
import { defaultWoka } from "@workadventure/shared-utils";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { AvailabilityStatus } from "@workadventure/messages";
import type { VerificationRequest } from "matrix-js-sdk/lib/crypto-api";
import { canAcceptVerificationRequest } from "matrix-js-sdk/lib/crypto-api";
import { asError } from "catch-unknown";

import Debug from "debug";
import type {
    ChatConnectionInterface,
    ChatRoom,
    ChatRoomMembershipManagement,
    ChatUser,
    ConnectionStatus,
    CreateRoomOptions,
    MatrixChatCapabilities,
    MatrixPeerProfileDiagnostics,
    MatrixUserSettingsDiagnostics,
} from "../ChatConnection";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
import { currentPlayerWokaStore } from "../../../Stores/CurrentPlayerWokaStore";
import LL from "../../../../i18n/i18n-svelte";
import type { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
import { MATRIX_ADMIN_USER, MATRIX_DOMAIN } from "../../../Enum/EnvironmentVariable";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { MatrixChatRoom } from "./MatrixChatRoom";
import type { MatrixSecurity } from "./MatrixSecurity";
import { matrixSecurity as defaultMatrixSecurity } from "./MatrixSecurity";
import { MatrixRoomFolder } from "./MatrixRoomFolder";
import { hasValidViaEntries } from "./MatrixSpaceRelations";
import { chatUserFactory, mapMatrixPresenceToAvailabilityStatus } from "./MatrixChatUser";
import {
    pushLocalWokaAndNameToMatrixProfile,
    syncWokaAvatarToMatrixProfileOnWokaChange,
} from "./services/WaMatrixProfileService";

const debug = Debug("MatrixChatConnection");

const CLIENT_NOT_INITIALIZED_ERROR_MSG = "MatrixClient not yet initialized";
type RoomPlacementReconciliationResult = "placed" | "root" | "pending" | "removed";
type RawUnreadRoom = {
    count: number;
    membership: string;
    isDirect: boolean;
    isSpace: boolean;
};

export type { MatrixPeerProfileDiagnostics, MatrixUserSettingsDiagnostics } from "../ChatConnection";

export class MatrixChatConnection implements ChatConnectionInterface, MatrixChatCapabilities {
    private static readonly spaceReconciliationDelaysMs = [0, 100, 300, 700, 1500];
    private readonly roomList: MapStore<string, MatrixChatRoom>;
    private client: MatrixClient | undefined;
    private handleRoom: (room: Room) => void;
    private handleDeleteRoom: (roomId: string) => void;
    private handleMyMembership: (room: Room, membership: string, prevMembership: string | undefined) => void;
    private handleRoomStateEvent: (event: MatrixEvent) => void;
    private handleName: (room: Room) => void;
    private handleAccountDataEvent: (event: MatrixEvent) => void;
    private handleUserPresence: (event: MatrixEvent | undefined, user: User) => void;
    private handleVerificationRequestReceived: (request: VerificationRequest) => void;
    private statusUnsubscriber: Unsubscriber | undefined;
    private wokaAvatarMatrixSyncUnsubscriber: Unsubscriber | undefined;
    private displayNameMatrixSyncUnsubscriber: (() => void) | undefined;
    private displayNameMatrixSyncDebounceTimer: ReturnType<typeof setTimeout> | undefined;
    private isClientReady = false;
    private usersStatus: MapStore<string, AvailabilityStatus>;
    private userIdsNeedingPresenceUpdate = new Set();
    private readonly roomPlacementRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly roomPlacementRetryGenerations = new Map<string, number>();
    private readonly parentRoomIdsByRoomId = new Map<string, Set<string>>();
    private readonly childRoomIdsBySpaceId = new Map<string, Set<string>>();
    private readonly folderShellsByRoomId = new Map<string, MatrixRoomFolder>();
    private readonly rawUnreadRooms = writable<Map<string, RawUnreadRoom>>(new Map());
    private readonly rawUnreadRoomUnsubscribers = new Map<string, () => void>();
    nbUnreadInvitationsMessages: Readable<number>;
    nbUnreadDirectRoomsMessages: Readable<number>;
    nbUnreadRoomsMessages: Readable<number>;
    connectionStatus: Writable<ConnectionStatus>;
    directRooms: Readable<MatrixChatRoom[]>;
    invitations: Readable<MatrixChatRoom[]>;
    rooms: Readable<MatrixChatRoom[]>;
    isEncryptionRequiredAndNotSet: Writable<boolean>;
    isGuest: Writable<boolean> = writable(false);
    hasUnreadMessages: Readable<boolean>;
    roomCreationInProgress: Writable<boolean> = writable(false);
    roomFolders: MapStore<MatrixRoomFolder["id"], MatrixRoomFolder> = new MapStore<
        MatrixRoomFolder["id"],
        MatrixRoomFolder
    >();
    folders: Readable<MatrixRoomFolder[]>;
    directRoomsUsers: Readable<ChatUser[]>;
    clientPromise: Promise<MatrixClient>;
    shouldRetrySendingEvents: Readable<boolean>;

    constructor(
        clientPromise: Promise<MatrixClient>,
        private statusStore: Readable<
            | AvailabilityStatus.ONLINE
            | AvailabilityStatus.SILENT
            | AvailabilityStatus.AWAY
            | AvailabilityStatus.JITSI
            | AvailabilityStatus.BBB
            | AvailabilityStatus.DENY_PROXIMITY_MEETING
            | AvailabilityStatus.SPEAKER
            | AvailabilityStatus.LIVEKIT
            | AvailabilityStatus.LISTENER
            | RequestedStatus
        >,
        private matrixSecurity: MatrixSecurity = defaultMatrixSecurity
    ) {
        this.connectionStatus = writable("CONNECTING");
        this.roomList = new AutoDestroyingMapStore<string, MatrixChatRoom>();
        this.clientPromise = clientPromise;
        this.directRooms = this.createJoinedRoomsReadable(
            (room) => get(room.myMembership) === KnownMembership.Join && get(room.type) === "direct"
        );

        this.directRoomsUsers = derived(
            [this.directRooms, this.statusStore],
            ([directRooms, statusStore]) => {
                const myUserID = this.client?.getSafeUserId();
                const client = this.client;

                if (!client) {
                    return [];
                }

                return directRooms.reduce((acc, currentRoom) => {
                    get(currentRoom.members).forEach((member) => {
                        if (member.id !== myUserID) {
                            const user = this.client?.getUser(member.id);
                            if (user) {
                                acc.push(chatUserFactory(user, client));
                                this.userIdsNeedingPresenceUpdate.add(user.userId);
                            }
                        }
                    });
                    return acc;
                }, [] as ChatUser[]);
            },
            []
        );

        this.invitations = derived(
            [
                this.roomList,
                this.roomFolders,
                ...Array.from(this.roomList.values()).map((room) => room.myMembership),
                ...Array.from(this.roomFolders.values()).map((folder) => folder.myMembership),
            ],
            (memberships) => {
                return [
                    ...Array.from(this.roomList.values()).filter(
                        (room) => get(room.myMembership) === KnownMembership.Invite
                    ),
                    ...Array.from(this.roomFolders.values()).filter(
                        (folder) => get(folder.myMembership) === KnownMembership.Invite
                    ),
                ];
            }
        );

        this.rooms = this.createJoinedRoomsReadable(
            (room) => get(room.myMembership) === KnownMembership.Join && get(room.type) === "multiple"
        );

        this.hasUnreadMessages = derived(this.rawUnreadRooms, (rawUnreadRooms) =>
            Array.from(rawUnreadRooms.values()).some((room) => room.count > 0)
        );

        this.folders = derived(
            [this.roomFolders, ...Array.from(this.roomFolders.values()).map((folder) => folder.myMembership)],
            () => {
                return Array.from(this.roomFolders.values()).filter(
                    (folder) => get(folder.myMembership) === KnownMembership.Join
                );
            }
        );

        this.usersStatus = new MapStore<string, AvailabilityStatus>();
        this.isEncryptionRequiredAndNotSet = this.matrixSecurity.isEncryptionRequiredAndNotSet;

        this.shouldRetrySendingEvents = derived(
            Array.from(this.roomList.values()).map((room) => room.shouldRetrySendingEvents),
            (shouldRetrySendingEvents) =>
                shouldRetrySendingEvents.some((shouldRetrySendingEvent) => shouldRetrySendingEvent)
        );

        this.nbUnreadInvitationsMessages = derived(this.rawUnreadRooms, (rawUnreadRooms) =>
            Array.from(rawUnreadRooms.values()).reduce(
                (total, room) => total + (room.membership === KnownMembership.Invite ? room.count : 0),
                0
            )
        );

        this.nbUnreadDirectRoomsMessages = derived(
            this.directRooms,
            (directRooms, set) => {
                // Subscribe to all direct room unreadNotificationCount stores
                const unsubscribes = directRooms.map((room) =>
                    room.unreadNotificationCount.subscribe(() => {
                        const total = directRooms.reduce(
                            (acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount),
                            0
                        );
                        set(total);
                    })
                );
                // Initial calculation
                const total = directRooms.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
                set(total);
                // Cleanup function
                return () => unsubscribes.forEach((unsub) => unsub());
            },
            0
        );

        this.nbUnreadRoomsMessages = derived(this.rawUnreadRooms, (rawUnreadRooms) =>
            Array.from(rawUnreadRooms.values()).reduce((total, room) => {
                if (room.membership !== KnownMembership.Join || room.isDirect || room.isSpace) {
                    return total;
                }
                return total + room.count;
            }, 0)
        );

        this.handleRoom = this.onClientEventRoom.bind(this);
        this.handleDeleteRoom = this.onClientEventDeleteRoom.bind(this);
        this.handleMyMembership = this.onRoomEventMembership.bind(this);
        this.handleRoomStateEvent = this.onRoomStateEvent.bind(this);
        this.handleName = this.onRoomNameEvent.bind(this);
        this.handleAccountDataEvent = this.onAccountDataEvent.bind(this);
        this.handleUserPresence = this.onUserPresenceEvent.bind(this);
        this.handleVerificationRequestReceived = this.onVerificationRequestReceived.bind(this);

        this.statusUnsubscriber = this.statusStore.subscribe((status: AvailabilityStatus) => {
            this.setPresence(status);
        });
    }

    /**
     * Recomputes when the room list changes or when any room's membership / DM-vs-group {@link MatrixChatRoom.type}
     * changes (so UI lists move rooms between Direct messages and Group conversations).
     */
    private createJoinedRoomsReadable(predicate: (room: MatrixChatRoom) => boolean): Readable<MatrixChatRoom[]> {
        return readable<MatrixChatRoom[]>([], (set) => {
            let childUnsubs: Unsubscriber[] = [];
            const clearChildSubs = () => {
                childUnsubs.forEach((u) => u());
                childUnsubs = [];
            };
            const listRooms = () => Array.from(get(this.roomList).values());
            const bump = () => {
                set(listRooms().filter(predicate));
            };
            const rewireRoomSignals = () => {
                clearChildSubs();
                for (const room of listRooms()) {
                    childUnsubs.push(room.myMembership.subscribe(bump));
                    childUnsubs.push(room.type.subscribe(bump));
                }
                bump();
            };
            const unsubList = this.roomList.subscribe(rewireRoomSignals);
            rewireRoomSignals();
            return () => {
                unsubList();
                clearChildSubs();
            };
        });
    }

    private trackRawUnreadRoom(room: Room): void {
        if (typeof room.on !== "function" || typeof room.off !== "function") {
            return;
        }
        if (this.rawUnreadRoomUnsubscribers.has(room.roomId)) {
            this.updateRawUnreadRoom(room);
            return;
        }

        const update = () => this.updateRawUnreadRoom(room);
        room.on(RoomEvent.UnreadNotifications, update);
        this.rawUnreadRoomUnsubscribers.set(room.roomId, () => room.off(RoomEvent.UnreadNotifications, update));
        update();
    }

    private untrackRawUnreadRoom(roomId: string): void {
        this.rawUnreadRoomUnsubscribers.get(roomId)?.();
        this.rawUnreadRoomUnsubscribers.delete(roomId);
        this.rawUnreadRooms.update((rooms) => {
            if (!rooms.has(roomId)) {
                return rooms;
            }
            const next = new Map(rooms);
            next.delete(roomId);
            return next;
        });
    }

    private updateRawUnreadRoom(room: Room): void {
        if (
            typeof room.getMyMembership !== "function" ||
            typeof room.getUnreadNotificationCount !== "function" ||
            typeof room.isSpaceRoom !== "function"
        ) {
            return;
        }
        const membership = room.getMyMembership();
        if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
            this.untrackRawUnreadRoom(room.roomId);
            return;
        }

        const directRoomIds = this.getDirectRoomIds();
        const rawUnreadRoom: RawUnreadRoom = {
            count: room.getUnreadNotificationCount(),
            membership,
            isDirect: directRoomIds.has(room.roomId),
            isSpace: room.isSpaceRoom(),
        };

        this.rawUnreadRooms.update((rooms) => {
            const next = new Map(rooms);
            next.set(room.roomId, rawUnreadRoom);
            return next;
        });
    }

    private refreshRawUnreadRoomKinds(): void {
        if (!this.client || typeof this.client.getVisibleRooms !== "function") {
            return;
        }
        this.client.getVisibleRooms().forEach((room) => this.updateRawUnreadRoom(room));
    }

    private getDirectRoomIds(): Set<string> {
        const directRoomsPerUsers = this.client?.getAccountData(EventType.Direct)?.getContent() ?? {};
        return new Set(Object.values(directRoomsPerUsers).flat() as string[]);
    }

    private registerFolderShell(folder: MatrixRoomFolder): void {
        this.folderShellsByRoomId.set(folder.id, folder);
    }

    private unregisterFolderShell(roomId: string): void {
        this.folderShellsByRoomId.delete(roomId);
    }

    private setParentRelations(roomId: string, parentIds: string[]): void {
        const previousParentIds = this.parentRoomIdsByRoomId.get(roomId) ?? new Set<string>();
        for (const parentId of previousParentIds) {
            const childIds = this.childRoomIdsBySpaceId.get(parentId);
            childIds?.delete(roomId);
            if (childIds?.size === 0) {
                this.childRoomIdsBySpaceId.delete(parentId);
            }
        }

        const uniqueParentIds = new Set(parentIds);
        if (uniqueParentIds.size === 0) {
            this.parentRoomIdsByRoomId.delete(roomId);
            return;
        }

        this.parentRoomIdsByRoomId.set(roomId, uniqueParentIds);
        for (const parentId of uniqueParentIds) {
            const childIds = this.childRoomIdsBySpaceId.get(parentId) ?? new Set<string>();
            childIds.add(roomId);
            this.childRoomIdsBySpaceId.set(parentId, childIds);
        }
    }

    private updateChildRelation(parentId: string, childId: string, isLinked: boolean): void {
        const parentIds = new Set(this.parentRoomIdsByRoomId.get(childId) ?? []);
        const childIds = new Set(this.childRoomIdsBySpaceId.get(parentId) ?? []);

        if (isLinked) {
            parentIds.add(parentId);
            childIds.add(childId);
        } else {
            parentIds.delete(parentId);
            childIds.delete(childId);
        }

        if (parentIds.size === 0) {
            this.parentRoomIdsByRoomId.delete(childId);
        } else {
            this.parentRoomIdsByRoomId.set(childId, parentIds);
        }

        if (childIds.size === 0) {
            this.childRoomIdsBySpaceId.delete(parentId);
        } else {
            this.childRoomIdsBySpaceId.set(parentId, childIds);
        }
    }

    private removeRoomFromPlacementIndex(roomId: string): void {
        this.setParentRelations(roomId, []);
        this.childRoomIdsBySpaceId.delete(roomId);
        for (const [childId, parentIds] of this.parentRoomIdsByRoomId) {
            if (!parentIds.has(roomId)) {
                continue;
            }
            const nextParentIds = new Set(parentIds);
            nextParentIds.delete(roomId);
            if (nextParentIds.size === 0) {
                this.parentRoomIdsByRoomId.delete(childId);
            } else {
                this.parentRoomIdsByRoomId.set(childId, nextParentIds);
            }
        }
        this.unregisterFolderShell(roomId);
    }

    async init(): Promise<void> {
        try {
            this.client = await this.clientPromise;
            this.matrixSecurity.updateMatrixClientStore(this.client);
            await this.startMatrixClient();
            this.isGuest.set(this.client.isGuest());
            if (typeof this.client.getVisibleRooms === "function") {
                this.client.getVisibleRooms().forEach((room) => {
                    this.trackRawUnreadRoom(room);
                    this.indexRoomPlacement(room);
                });
            }
            this.rebuildSpaceHierarchy();
            await this.syncMatrixGlobalProfileFromLocalWokaAndName(false);
            this.attachWokaAvatarMatrixSync();
            this.attachDisplayNameMatrixSync();
        } catch (error) {
            this.connectionStatus.set("OFFLINE");
            console.error(error);
            Sentry.captureException(error);
        }
    }

    /**
     * When the in-game WOKA changes, upload it to the Matrix content repo and set the Matrix profile avatar.
     */
    private attachWokaAvatarMatrixSync(): void {
        if (!this.client || this.wokaAvatarMatrixSyncUnsubscriber) {
            return;
        }

        const trySync = async (wokaSrc: string | undefined) => {
            if (!this.client) {
                return;
            }
            await syncWokaAvatarToMatrixProfileOnWokaChange(this.client, wokaSrc);
        };

        this.wokaAvatarMatrixSyncUnsubscriber = currentPlayerWokaStore.subscribe((src) => {
            trySync(src).catch(() => undefined);
        });
    }

    /**
     * When the in-game display name changes, push it to the Matrix profile (debounced; coalesces with
     * {@link #attachWokaAvatarMatrixSync} flows).
     */
    private attachDisplayNameMatrixSync(): void {
        if (this.displayNameMatrixSyncUnsubscriber) {
            return;
        }
        const schedule = () => {
            if (this.displayNameMatrixSyncDebounceTimer !== undefined) {
                clearTimeout(this.displayNameMatrixSyncDebounceTimer);
            }
            this.displayNameMatrixSyncDebounceTimer = setTimeout(() => {
                this.displayNameMatrixSyncDebounceTimer = undefined;
                this.syncMatrixGlobalProfileFromLocalWokaAndName(false).catch(() => undefined);
            }, 400);
        };
        this.displayNameMatrixSyncUnsubscriber = localUserStore.subscribeDisplayNameChange(() => {
            schedule();
        });
    }

    /** Exposes the synced Matrix client (e.g. chat tint resolution via {@link getMatrixClientForChatTint}). */
    getMatrixClient(): MatrixClient | undefined {
        return this.client;
    }

    /**
     * Loads Matrix profile and local game state for the settings UI.
     */
    async getMatrixUserSettingsDiagnostics(): Promise<MatrixUserSettingsDiagnostics | undefined> {
        if (!this.client || this.client.isGuest()) {
            return undefined;
        }
        const userId = this.client.getSafeUserId();
        if (!userId) {
            return undefined;
        }
        const homeserverUrl = this.client.getHomeserverUrl();
        let profileDisplayName: string | undefined;
        let profileAvatarMxc: string | undefined;
        try {
            const profile = await this.client.getProfileInfo(userId);
            profileDisplayName = profile.displayname?.trim();
            profileAvatarMxc = profile.avatar_url;
        } catch {
            /* profile fetch can fail on restricted networks */
        }
        const profileAvatarPreviewUrl = profileAvatarMxc
            ? this.client.mxcUrlToHttp(profileAvatarMxc, 96, 96) ?? undefined
            : undefined;
        const localDisplayName = localUserStore.getDisplayNameForMatrixProfile();
        const localWoka = get(currentPlayerWokaStore);
        const hasCustomWoka = Boolean(localWoka && localWoka !== defaultWoka);
        const profileNameNorm = profileDisplayName?.trim();
        const nameMismatch = Boolean(
            localDisplayName &&
                (profileNameNorm === undefined || profileNameNorm === "" || localDisplayName !== profileNameNorm)
        );
        const avatarMissingOnProfile = Boolean(hasCustomWoka && !profileAvatarMxc);
        const profileNeedsSync = nameMismatch || avatarMissingOnProfile;

        return {
            matrixUserId: userId,
            homeserverUrl,
            profileDisplayName,
            profileAvatarMxc,
            profileAvatarPreviewUrl,
            localDisplayName,
            profileNeedsSync,
        };
    }

    /**
     * Loads Matrix profile for another user (debug UI only).
     */
    async getMatrixPeerProfileDiagnostics(matrixUserId: string): Promise<MatrixPeerProfileDiagnostics | undefined> {
        if (!this.client || this.client.isGuest()) {
            return undefined;
        }
        const homeserverUrl = this.client.getHomeserverUrl();
        let profileDisplayName: string | undefined;
        let profileAvatarMxc: string | undefined;
        try {
            const profile = await this.client.getProfileInfo(matrixUserId);
            profileDisplayName = profile.displayname;
            profileAvatarMxc = profile.avatar_url;
        } catch {
            /* profile fetch can fail */
        }
        const profileAvatarPreviewUrl = profileAvatarMxc
            ? this.client.mxcUrlToHttp(profileAvatarMxc, 96, 96) ?? undefined
            : undefined;

        return {
            matrixUserId,
            homeserverUrl,
            profileDisplayName,
            profileAvatarMxc,
            profileAvatarPreviewUrl,
        };
    }

    /**
     * Pushes the in-game display name and WOKA image to the Matrix global profile (`/profile`).
     */
    async syncMatrixGlobalProfileFromLocalWokaAndName(forceSync: boolean): Promise<void> {
        if (!this.client || this.client.isGuest()) {
            return;
        }
        await pushLocalWokaAndNameToMatrixProfile(this.client, {
            localDisplayName: localUserStore.getDisplayNameForMatrixProfile(),
            wokaImageSrc: get(currentPlayerWokaStore),
            forceSync,
        });
    }

    private setPresence(status: AvailabilityStatus): void {
        let matrixStatus: SetPresence;
        if (status === AvailabilityStatus.ONLINE) {
            matrixStatus = SetPresence.Online;
        } else {
            matrixStatus = SetPresence.Unavailable;
        }
        this.client?.setSyncPresence(matrixStatus).catch((error) => {
            console.error("Failed to send presence", error);
            Sentry.captureException(error);
        });
    }

    private onUserPresenceEvent(event: MatrixEvent | undefined, user: User): void {
        const userStatus = get(this.usersStatus).get(user.userId);
        const newStatus = mapMatrixPresenceToAvailabilityStatus(user.presence);
        if (userStatus && newStatus !== userStatus && this.userIdsNeedingPresenceUpdate.has(user.userId)) {
            get(this.usersStatus).set(user.userId, newStatus);
        }
    }

    async startMatrixClient() {
        if (!this.client) return;
        this.client.on(ClientEvent.Sync, (state, prevState, res) => {
            if (!this.client) return;
            switch (state) {
                case SyncState.Prepared:
                    this.connectionStatus.set("ONLINE");
                    this.isClientReady = true;
                    break;
                case SyncState.Error:
                    this.connectionStatus.set("ON_ERROR");
                    if (res?.error) {
                        console.error("Matrix sync error (previous state: ", prevState, "): ", res?.error);
                        Sentry.captureException(res?.error);
                    }
                    break;
                case SyncState.Reconnecting:
                    this.connectionStatus.set("CONNECTING");
                    break;
                case SyncState.Stopped:
                    this.connectionStatus.set("OFFLINE");
                    break;
                case SyncState.Syncing:
                    if (get(this.connectionStatus) !== "ONLINE" && this.isClientReady) {
                        this.connectionStatus.set("ONLINE");
                    }
                    break;
            }
        });

        this.client.on(ClientEvent.Room, this.handleRoom);
        this.client.on(ClientEvent.DeleteRoom, this.handleDeleteRoom);
        this.client.on(RoomEvent.MyMembership, this.handleMyMembership);
        this.client.on(RoomStateEvent.Events as EmittedEvents, this.handleRoomStateEvent);
        this.client.on(RoomEvent.Name, this.handleName);
        this.client.on(ClientEvent.AccountData, this.handleAccountDataEvent);
        this.client.on(UserEvent.Presence, this.handleUserPresence);
        this.client.on(CryptoEvent.VerificationRequestReceived, this.handleVerificationRequestReceived);
        await this.client.store.startup();

        try {
            await this.client.initRustCrypto();
        } catch {
            await this.client.clearStores();
            await this.client.initRustCrypto();
        }

        await this.client.startClient({
            threadSupport: true,
            //Detached to prevent using listener on localIdReplaced for each event
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        try {
            await this.waitInitialSync();
        } catch (error) {
            console.error("Failed to wait initial sync:", error);
        }
    }

    private onVerificationRequestReceived(request: VerificationRequest) {
        if (!canAcceptVerificationRequest(request) || !request.isSelfVerification) return;
        const otherDeviceId = request.otherDeviceId;

        if (otherDeviceId) {
            this.getDeviceInformationForAskStartVerificationModal(otherDeviceId)
                .then((otherDeviceInformation) => {
                    this.matrixSecurity.openAskStartVerification({
                        request,
                        otherDeviceInformation,
                    });
                })
                .catch((error) => {
                    console.error("Failed to get information from other device : ", error);
                    Sentry.captureException(error);
                });
        }
    }

    private async getDeviceInformationForAskStartVerificationModal(deviceId: string) {
        const otherDeviceInformation = await this.getOwnDeviceInformation(deviceId);
        const myOtherDeviceInformation = await this.client?.getDevice(deviceId);
        const ip = myOtherDeviceInformation?.last_seen_ip;

        return {
            ip,
            id: deviceId,
            name: otherDeviceInformation?.displayName,
        };
    }
    private async getDevicesInformationFor(userId: string) {
        const client = this.client;
        if (!client) return;
        const crypto = this.client?.getCrypto();
        if (!crypto) return;
        const devicesMap = await crypto.getUserDeviceInfo([userId], true);
        return devicesMap.get(userId);
    }

    private getOwnDevicesInformation() {
        const myUserid = this.client?.getSafeUserId();
        if (!myUserid) return;
        return this.getDevicesInformationFor(myUserid);
    }

    private async getOwnDeviceInformation(deviceId: string) {
        const devicesMap = await this.getOwnDevicesInformation();
        if (!devicesMap) return;

        return devicesMap.get(deviceId);
    }
    private waitInitialSync(timeout = 30_000, interval = 3500): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkSync = () => {
                if (this.client?.isInitialSyncComplete()) {
                    resolve();
                } else {
                    if (Date.now() - startTime >= timeout) {
                        reject(new Error(`Failed to wait initial sync : timeout ${timeout} ms`));
                    } else {
                        setTimeout(checkSync, interval);
                    }
                }
            };
            checkSync();
        });
    }

    private readParentRoomIdsFromRoomState(room: Room): string[] {
        if (typeof room.getLiveTimeline !== "function") {
            return [];
        }
        const parentIDs =
            room.getLiveTimeline().getState(EventTimeline.FORWARDS)?.getStateEvents(EventType.SpaceParent) || [];
        return parentIDs.reduce((acc, currentMatrixEvent) => {
            if (!hasValidViaEntries(currentMatrixEvent.getContent())) {
                return acc;
            }
            const parentID = currentMatrixEvent.getStateKey();
            const parentRoom = parentID ? room.client?.getRoom(parentID) : undefined;
            // A stale m.space.parent can remain after a move; only trust known parents that still expose the child link.
            if (
                parentRoom &&
                (!this.hasVisibleMembership(parentRoom) || !this.hasValidChildRelation(parentRoom, room.roomId))
            ) {
                return acc;
            }
            if (parentID) acc.push(parentID);
            return acc;
        }, [] as string[]);
    }

    private indexRoomPlacement(room: Room): void {
        this.setParentRelations(room.roomId, this.readParentRoomIdsFromRoomState(room));
    }

    private getParentRoomID(room: Room): string[] {
        const indexedParentIds = this.parentRoomIdsByRoomId.get(room.roomId);
        if (indexedParentIds) {
            return Array.from(indexedParentIds);
        }

        const parentIds = this.readParentRoomIdsFromRoomState(room);
        this.setParentRelations(room.roomId, parentIds);
        return parentIds;
    }

    private hasVisibleMembership(room: Room): boolean {
        const membership = room.getMyMembership();
        return membership === KnownMembership.Join || membership === KnownMembership.Invite;
    }

    private hasValidChildRelation(parentRoom: Room, childRoomId: string): boolean {
        const childEvents =
            parentRoom.getLiveTimeline().getState(EventTimeline.FORWARDS)?.getStateEvents(EventType.SpaceChild) || [];

        return childEvents.some((childEvent) => {
            return childEvent.getStateKey() === childRoomId && hasValidViaEntries(childEvent.getContent());
        });
    }

    private detachRoomFromRootLists(roomId: string): void {
        this.roomList.delete(roomId);
        this.roomFolders.delete(roomId);
    }

    private clearRoomPlacementRetry(roomId: string): void {
        // Invalidate in-flight reconciliation promises so they cannot recreate timers after cleanup.
        this.roomPlacementRetryGenerations.set(roomId, (this.roomPlacementRetryGenerations.get(roomId) ?? 0) + 1);
        const timer = this.roomPlacementRetryTimers.get(roomId);
        if (timer !== undefined) {
            clearTimeout(timer);
            this.roomPlacementRetryTimers.delete(roomId);
        }
    }

    private clearRoomPlacementRetries(): void {
        for (const roomId of Array.from(this.roomPlacementRetryTimers.keys())) {
            this.clearRoomPlacementRetry(roomId);
        }
    }

    private scheduleRoomPlacementReconciliation(roomId: string): void {
        this.clearRoomPlacementRetry(roomId);
        const generation = this.roomPlacementRetryGenerations.get(roomId) ?? 0;
        const runAttempt = (attemptIndex: number): void => {
            this.reconcileRoomPlacement(roomId)
                .then((result) => {
                    if (this.roomPlacementRetryGenerations.get(roomId) !== generation) {
                        return;
                    }

                    if (result !== "pending") {
                        this.clearRoomPlacementRetry(roomId);
                        return;
                    }

                    const nextAttemptIndex = attemptIndex + 1;
                    if (nextAttemptIndex >= MatrixChatConnection.spaceReconciliationDelaysMs.length) {
                        this.clearRoomPlacementRetry(roomId);
                        this.moveVisibleRoomToRoot(roomId).catch((error) => {
                            console.error("Failed to move room to root after placement retries:", error);
                            Sentry.captureException(error);
                        });
                        return;
                    }

                    const timer = setTimeout(() => {
                        if (this.roomPlacementRetryGenerations.get(roomId) !== generation) {
                            return;
                        }
                        runAttempt(nextAttemptIndex);
                    }, MatrixChatConnection.spaceReconciliationDelaysMs[nextAttemptIndex]);
                    this.roomPlacementRetryTimers.set(roomId, timer);
                })
                .catch((error) => {
                    console.error("Failed to reconcile room placement:", error);
                    this.clearRoomPlacementRetry(roomId);
                });
        };
        runAttempt(0);
    }

    private async reconcileRoomPlacement(roomId: string): Promise<RoomPlacementReconciliationResult> {
        const client = this.client;
        if (!client) {
            return "pending";
        }

        const room = client.getRoom(roomId);
        if (!room) {
            return "pending";
        }

        const membership = room.getMyMembership();
        if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
            await this.deleteRoom(roomId);
            return "removed";
        }

        const parentIds = this.getParentRoomID(room);
        if (parentIds.length === 0) {
            await this.removeRoomFromAllFolders(roomId);
            this.handleOrphanRoom(room);
            return "root";
        }

        await this.removeRoomFromAllFolders(roomId);
        const placementResults = await Promise.all(
            parentIds.map(async (parentId) => {
                let parentFolder = await this.findParentFolder(parentId);
                if (!parentFolder) {
                    const parentRoom = client.getRoom(parentId);
                    if (parentRoom) {
                        await this.manageRoomOrFolder(parentRoom);
                        parentFolder = await this.findParentFolder(parentId);
                    }
                }

                if (parentFolder) {
                    this.addRoomToParentFolder(room, parentFolder);
                    return true;
                }
                return false;
            })
        );

        if (placementResults.some((didPlaceRoom) => didPlaceRoom)) {
            this.detachRoomFromRootLists(roomId);
            return "placed";
        }

        return "pending";
    }

    private async moveVisibleRoomToRoot(roomId: string): Promise<void> {
        const room = this.client?.getRoom(roomId);
        if (!room) {
            return;
        }

        const membership = room.getMyMembership();
        if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
            await this.deleteRoom(roomId);
            return;
        }

        if (!this.hasVisibleMembership(room)) {
            return;
        }

        await this.removeRoomFromAllFolders(roomId);
        this.handleOrphanRoom(room);
    }

    private async removeRoomFromAllFolders(roomId: string): Promise<boolean> {
        const deleteRoomPromise = Array.from(this.roomFolders.values()).map((roomFolder) => {
            return roomFolder.deleteNode(roomId);
        });
        const responses = await Promise.all(deleteRoomPromise);
        return responses.some((response) => response);
    }

    private async removeRoomFromParentFolder(roomId: string, parentId: string): Promise<boolean> {
        const parentFolder = await this.findParentFolder(parentId);
        if (!parentFolder) {
            return false;
        }
        return parentFolder.deleteNode(roomId);
    }

    private onAccountDataEvent(event: MatrixEvent) {
        if (event.getType() === EventType.Direct) {
            this.refreshRawUnreadRoomKinds();
        }
        if (event.getType() === "m.push_rules") {
            const content = event.getContent();

            content.global.override.forEach((rule: IPushRule) => {
                const room = this.roomList.get(rule.rule_id);
                if (!room) return;
                if (rule.actions.includes(PushRuleActionName.DontNotify)) {
                    room.setNotificationSilent(true);
                }
            });

            Array.from(this.roomList.values())
                .filter((room) => {
                    return !content.global.override.some(
                        (rule: IPushRule) =>
                            rule.rule_id === room.id && rule.actions.includes(PushRuleActionName.DontNotify)
                    );
                })
                .forEach((room) => {
                    room.setNotificationSilent(false);
                });
        }
    }

    private onRoomNameEvent(room: Room): void {
        const { roomId, name } = room;

        this.findRoomOrFolder(roomId)
            .then((roomInConnection) => {
                if (roomInConnection) {
                    roomInConnection.name.set(name);
                    return;
                }

                return this.manageRoomOrFolder(room);
            })
            .catch((e) => {
                console.error("Failed to manage room or folder : ", e);
            });
    }
    private onRoomStateEvent(event: MatrixEvent): void {
        if (!this.client) {
            return;
        }

        const eventType = event.getType();
        if (eventType !== "m.space.child") {
            return;
        }

        const roomID = event.getStateKey();
        const parentID = event.getRoomId();
        if (!roomID || !parentID) {
            return;
        }

        if (!hasValidViaEntries(event.getContent())) {
            this.updateChildRelation(parentID, roomID, false);
            this.removeRoomFromParentFolder(roomID, parentID)
                .catch((e) => {
                    console.error("Failed to remove room from parent folder : ", e);
                })
                .finally(() => {
                    this.scheduleRoomPlacementReconciliation(roomID);
                });
            return;
        }

        this.updateChildRelation(parentID, roomID, true);
        this.reconcileRoomPlacement(roomID)
            .then((result) => {
                if (result === "pending") {
                    this.scheduleRoomPlacementReconciliation(roomID);
                }
            })
            .catch((e) => {
                console.error("Failed to reconcile room placement : ", e);
                this.scheduleRoomPlacementReconciliation(roomID);
            });
    }
    private onClientEventRoom(room: Room) {
        this.trackRawUnreadRoom(room);
        this.indexRoomPlacement(room);
        this.manageRoomOrFolder(room).catch((e) => {
            console.error("Failed to manage : ", e);
        });
    }

    private async moveRoomToParentFolder(room: Room, parentID: string): Promise<boolean> {
        const isSpaceRoom = room.isSpaceRoom();
        const parentFolder = await this.findParentFolder(parentID);

        if (!parentFolder) {
            return false;
        }

        this.addRoomToFolder(room, parentFolder, isSpaceRoom);
        return true;
    }
    private addRoomToFolder(room: Room, targetFolder: MatrixRoomFolder, isSpaceRoom: boolean): void {
        if (targetFolder.hasLoadedChildren?.() === false) {
            return;
        }
        if (isSpaceRoom) {
            if (targetFolder.folderList.has(room.roomId)) {
                return;
            }
            const newFolder = new MatrixRoomFolder(room);
            targetFolder.folderList.set(room.roomId, newFolder);
            this.registerFolderShell(newFolder);

            newFolder.init();
        } else {
            if (targetFolder.roomList.has(room.roomId)) {
                return;
            }
            targetFolder.roomList.set(room.roomId, new MatrixChatRoom(room));
        }
    }
    private async manageRoomOrFolder(room: Room): Promise<void> {
        const parentsIds = this.getParentRoomID(room);

        try {
            if (parentsIds.length === 0) {
                this.handleOrphanRoom(room);
                return;
            }

            await Promise.allSettled(parentsIds.map((parentId) => this.tryAddRoomToParentFolder(room, parentId)));
        } catch (e) {
            console.error("Failed to manage room or folder : ", e);
            Sentry.captureException(e);
        }
    }

    private async tryAddRoomToParentFolder(room: Room, parentRoomID: string): Promise<boolean> {
        try {
            const parentFolder = await this.findParentFolder(parentRoomID);
            if (!parentFolder) {
                const parentRoom = this.client?.getRoom(parentRoomID);
                if (parentRoom) {
                    await this.manageRoomOrFolder(parentRoom);
                } else {
                    this.handleOrphanRoom(room);
                }

                return false;
            }

            this.addRoomToParentFolder(room, parentFolder);
            return true;
        } catch (e) {
            console.error("Error in tryAddRoomToParentFolder:", e);
            return false;
        }
    }

    private async findParentFolder(parentRoomID: string): Promise<MatrixRoomFolder | null> {
        const indexedFolder = this.folderShellsByRoomId.get(parentRoomID);
        if (indexedFolder) {
            return indexedFolder;
        }

        const folderPromises = Array.from(this.roomFolders.values()).map(async (folder) =>
            folder.id === parentRoomID ? Promise.resolve(folder) : await folder.getNode(parentRoomID)
        );

        const folders = await Promise.all(folderPromises);
        const parentFolder = folders.find((folder) => folder && folder instanceof MatrixRoomFolder);

        if (parentFolder && parentFolder instanceof MatrixRoomFolder) {
            return parentFolder;
        }
        return null;
    }

    private addRoomToParentFolder(room: Room, parentFolder: MatrixRoomFolder): void {
        const isSpaceRoom = room.isSpaceRoom();
        const roomId = room.roomId;

        if (parentFolder.hasLoadedChildren?.() === false) {
            this.detachRoomFromRootLists(roomId);
            return;
        }

        // Add room/folder to parent's lists
        if (isSpaceRoom) {
            let roomFolder = parentFolder.folderList.get(roomId);
            if (!roomFolder) {
                roomFolder = new MatrixRoomFolder(room);
                parentFolder.folderList.set(roomId, roomFolder);
            }
            this.registerFolderShell(roomFolder);
            // Keep child space shells cheap; remote hierarchy is loaded only when the space is opened.
            roomFolder.init();
        } else {
            if (!parentFolder.roomList.has(roomId)) {
                parentFolder.roomList.set(roomId, new MatrixChatRoom(room));
            }
        }

        if (get(parentFolder.myMembership) === KnownMembership.Join) {
            this.detachRoomFromRootLists(roomId);
            return;
        }

        if (isSpaceRoom) {
            if (!this.roomFolders.has(roomId)) {
                const rootFolder = new MatrixRoomFolder(room);
                rootFolder.init();
                this.registerFolderShell(rootFolder);
                this.roomFolders.set(roomId, rootFolder);
            }
            return;
        }
        if (!this.roomList.has(roomId)) {
            this.roomList.set(roomId, new MatrixChatRoom(room));
        }
    }

    /**
     * Re-reads `m.space.child` for a joined folder and recurses into child folders.
     * @param targetRoomId When set, stops recursing once this room id appears under `folder` (including nested folders).
     * @returns true if `targetRoomId` was found under this subtree (only meaningful when `targetRoomId` is set).
     */
    private refreshJoinedFolderSubtree(folder: MatrixRoomFolder, targetRoomId?: string): boolean {
        if (get(folder.myMembership) !== KnownMembership.Join) {
            return false;
        }
        if (folder.hasLoadedChildren?.() === false) {
            return false;
        }
        folder.getChildren();
        if (targetRoomId && this.isRoomUnderFolder(targetRoomId, folder)) {
            return true;
        }
        for (const childFolder of folder.folderList.values()) {
            if (this.refreshJoinedFolderSubtree(childFolder, targetRoomId)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Refreshes space-folder children from Matrix state for every root folder.
     * @param targetRoomId Optional: when the goal is to place one room after join/invite, pass its id to stop
     * after that room is found under a folder tree (avoids walking unrelated roots when found early).
     */
    private refreshAllJoinedFoldersChildren(targetRoomId?: string): void {
        for (const rootFolder of this.roomFolders.values()) {
            if (this.refreshJoinedFolderSubtree(rootFolder, targetRoomId)) {
                return;
            }
        }
    }

    private isRoomUnderFolder(roomId: string, folder: MatrixRoomFolder): boolean {
        if (folder.roomList.has(roomId)) {
            return true;
        }
        for (const subFolder of folder.folderList.values()) {
            if (this.isRoomUnderFolder(roomId, subFolder)) {
                return true;
            }
        }
        return false;
    }

    /** True if this chat room id is already attached under any root space folder tree. */
    private isRoomUnderAnyFolder(roomId: string): boolean {
        for (const rootFolder of this.roomFolders.values()) {
            if (this.isRoomUnderFolder(roomId, rootFolder)) {
                return true;
            }
        }
        return false;
    }

    private handleOrphanRoom(room: Room): void {
        if (room.isSpaceRoom()) {
            this.createAndAddNewRootFolder(room);
            return;
        }

        if (this.isRoomUnderAnyFolder(room.roomId)) {
            return;
        }

        this.createAndAddNewRootRoom(room);
    }

    private getVisibleDescendantIds(folder: MatrixRoomFolder, descendants = new Set<string>()): string[] {
        for (const room of folder.roomList.values()) {
            if (get(room.myMembership) === KnownMembership.Join || get(room.myMembership) === KnownMembership.Invite) {
                descendants.add(room.id);
            }
        }

        for (const childFolder of folder.folderList.values()) {
            if (
                get(childFolder.myMembership) === KnownMembership.Join ||
                get(childFolder.myMembership) === KnownMembership.Invite
            ) {
                descendants.add(childFolder.id);
            }
            this.getVisibleDescendantIds(childFolder, descendants);
        }

        return Array.from(descendants);
    }

    private async deleteRoomOrFolderAndReconcileChildren(room: Room): Promise<void> {
        const node = await this.findRoomOrFolder(room.roomId);
        const visibleDescendantIds = node instanceof MatrixRoomFolder ? this.getVisibleDescendantIds(node) : [];

        await this.deleteRoom(room.roomId);

        await Promise.all(
            visibleDescendantIds.map(async (descendantId) => {
                this.clearRoomPlacementRetry(descendantId);
                const result = await this.reconcileRoomPlacement(descendantId);
                if (result === "pending") {
                    this.scheduleRoomPlacementReconciliation(descendantId);
                }
            })
        );
    }

    private async findRoomOrFolder(roomId: string): Promise<MatrixRoomFolder | MatrixChatRoom | undefined> {
        const roomInRoomList = this.roomList.get(roomId);
        if (roomInRoomList) {
            return roomInRoomList;
        }

        const getNodePromise = Array.from(this.roomFolders.values()).map(async (folder) => {
            return folder.id === roomId ? Promise.resolve(folder) : await folder.getNode(roomId);
        });

        const nodes = await Promise.all(getNodePromise);
        const node = nodes.filter((node) => node)[0];

        if (!node) {
            return undefined;
        }

        return node;
    }

    private createAndAddNewRootFolder(room: Room): void {
        if (this.roomFolders.get(room.roomId)) return;
        const newFolder = new MatrixRoomFolder(room);
        this.roomFolders.set(newFolder.id, newFolder);
        this.registerFolderShell(newFolder);
        newFolder.init();

        newFolder
            .getRoomsIdInNode()
            .then((roomIDs) => {
                if (get(newFolder.myMembership) === KnownMembership.Invite) {
                    return;
                }
                roomIDs.forEach((roomID) => {
                    this.roomList.delete(roomID);
                    this.roomFolders.delete(roomID);
                });
            })
            .catch((e) => {
                console.error("Failed to get child room IDs");
                Sentry.captureException(e);
            });
    }
    private createAndAddNewRootRoom(room: Room): MatrixChatRoom {
        const newRoom = new MatrixChatRoom(room);
        this.roomList.set(newRoom.id, newRoom);
        if (get(selectedRoomStore)?.id === newRoom.id) {
            selectedRoomStore.set(newRoom);
        }
        return newRoom;
    }
    private onClientEventDeleteRoom(roomId: string) {
        this.untrackRawUnreadRoom(roomId);
        this.removeRoomFromPlacementIndex(roomId);
        this.deleteRoom(roomId).catch((e) => {
            console.error("Failed to delete room : ", e);
        });
    }
    private async deleteRoom(roomId: string) {
        const isRootRoom = this.roomList.delete(roomId);
        if (isRootRoom) {
            return;
        }
        const isRootFolder = this.roomFolders.delete(roomId);

        if (isRootFolder) {
            this.unregisterFolderShell(roomId);
            return;
        }

        const deleteRoomPromise = Array.from(this.roomFolders.values()).map((roomFolder) => {
            return roomFolder.deleteNode(roomId);
        });

        await Promise.all(deleteRoomPromise);

        const currentRoom = get(selectedRoomStore)?.id;
        if (currentRoom && currentRoom === roomId) selectedRoomStore.set(undefined);
    }

    private onRoomEventMembership(room: Room, membership: string, prevMembership: string | undefined): void {
        this.updateRawUnreadRoom(room);
        debug(
            "Receive an event to update the membership of the room or folder :",
            room.name,
            room.roomId,
            membership,
            prevMembership
        );
        const { roomId } = room;
        if (membership !== prevMembership && membership === KnownMembership.Join) {
            this.detachRoomFromRootLists(roomId);

            // if (this.client?.isInitialSyncComplete()) {
            // this.refreshAllJoinedFoldersChildren(roomId);
            // }
            this.scheduleRoomPlacementReconciliation(roomId);
            return;
        }

        if (membership === KnownMembership.Invite) {
            // This is used to automatically join rooms that are created by the admin, like tag-based rooms invitation
            this.clientPromise
                .then((client) => {
                    const userId = client.getSafeUserId();
                    if (!userId) throw new Error("userId not found");

                    const inviteEvent = room
                        .getLiveTimeline()
                        .getState(EventTimeline.FORWARDS)
                        ?.getStateEvents("m.room.member", userId);

                    const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;

                    if (inviteEvent?.getSender() === ADMIN_CHAT_ID) {
                        client.joinRoom(room.roomId).catch((e) => {
                            console.error("Failed to joinRoom : ", e);
                            this.createAndAddNewRootRoom(room);
                        });
                    }

                    this.detachRoomFromRootLists(room.roomId);
                    if (this.client?.isInitialSyncComplete()) {
                        this.refreshAllJoinedFoldersChildren(room.roomId);
                    }
                    this.scheduleRoomPlacementReconciliation(room.roomId);

                    // Only notify for "live" invitations (after initial sync). Avoids notifying for existing invites on load (plan: live vs historical).
                    if (client.isInitialSyncComplete()) {
                        const roomName = room.name?.trim() || get(LL).chat.roomInvitation.unknownRoom();
                        const chatRoom = new MatrixChatRoom(room);
                        chatNotificationStore.addNotification(
                            get(LL).chat.roomInvitation.notificationTitle(),
                            get(LL).chat.roomInvitation.notification({ roomName }),
                            chatRoom,
                            undefined,
                            false
                        );
                    }
                })
                .catch((e) => {
                    console.error("Failed to get client : ", e);
                });
        }

        if (membership === KnownMembership.Leave || membership === KnownMembership.Ban) {
            this.clearRoomPlacementRetry(roomId);
            this.removeRoomFromPlacementIndex(roomId);
            this.deleteRoomOrFolderAndReconcileChildren(room).catch((e) => {
                console.error("Failed to delete room or folder : ", e);
            });
            return;
        }
    }
    //TODO createOptions only on matrix size
    async createRoom(roomOptions?: CreateRoomOptions): Promise<{
        room_id: string;
    }> {
        if (roomOptions === undefined) {
            return Promise.reject(new Error("CreateRoomOptions is empty"));
        }

        if (!this.client) {
            return Promise.reject(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
        }

        try {
            this.roomCreationInProgress.set(true);
            const result = await this.client.createRoom(
                this.mapCreateRoomOptionsToMatrixCreateRoomOptions(roomOptions)
            );

            if (roomOptions.parentSpaceID && result) {
                await this.addRoomToSpace(roomOptions.parentSpaceID, result.room_id, roomOptions.suggested);
            }

            return result;
        } catch (error) {
            throw this.handleMatrixError(error);
        } finally {
            this.roomCreationInProgress.set(false);
        }
    }

    private async waitForNextSync() {
        await new Promise<void>((resolve, reject) => {
            const resolveIfIsASyncingEvent = (state: SyncState) => {
                if (state === SyncState.Syncing) {
                    if (timer) clearTimeout(timer);
                    if (!this.client) {
                        reject(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
                        return;
                    }
                    this.client.off(ClientEvent.Sync, resolveIfIsASyncingEvent);
                    resolve();
                }
            };

            const timer = setTimeout(() => {
                if (!this.client) {
                    reject(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
                    return;
                }
                this.client.off(ClientEvent.Sync, resolveIfIsASyncingEvent);
                reject(new Error("waitForSync event timeout"));
            }, 30000);

            this.client?.on(ClientEvent.Sync, resolveIfIsASyncingEvent);
        });
    }

    async createFolder(roomOptions?: CreateRoomOptions): Promise<{ room_id: string }> {
        if (roomOptions === undefined) {
            return Promise.reject(new Error("CreateRoomOptions is empty"));
        }

        try {
            const result = await this.client?.createRoom(
                this.mapCreateRoomOptionsToMatrixCreateFolderOptions(roomOptions)
            );
            await this.waitForNextSync();

            if (roomOptions.parentSpaceID && result) {
                try {
                    await this.addRoomToSpace(roomOptions.parentSpaceID, result.room_id, roomOptions.suggested);

                    await this.waitForNextSync();
                    return result;
                } catch {
                    this.roomFolders.delete(result.room_id);
                    return Promise.reject(new Error(get(LL).chat.addRoomToFolderError()));
                }
            }

            if (!result) {
                return Promise.reject(new Error(get(LL).chat.addRoomToFolderError()));
            }

            return result;
        } catch (error) {
            throw this.handleMatrixError(error);
        }
    }
    private handleMatrixError(error: unknown): Error {
        if (error instanceof MatrixError) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            return new Error(error.data.error, { cause: error });
        }
        return asError(error);
    }
    private mapCreateRoomOptionsToMatrixCreateRoomOptions(roomOptions: CreateRoomOptions): ICreateRoomOpts {
        const roomName = roomOptions.name;
        if (roomName === undefined) {
            throw new Error("Room name is undefined");
        }

        return {
            name: roomName.trim(),
            visibility: roomOptions.visibility as Visibility | undefined,
            room_alias_name: slugify(roomName),
            invite:
                roomOptions.invite
                    ?.map((invitation) => invitation.value)
                    .filter((invitation) => invitation !== undefined && invitation !== this.client?.getSafeUserId()) ??
                [],
            is_direct: roomOptions.is_direct,
            initial_state: this.computeInitialState(roomOptions),
            power_level_content_override: {
                // @ts-ignore TODO: fix type
                suggested: roomOptions.suggested ?? false,
            },
        };
    }

    private mapCreateRoomOptionsToMatrixCreateFolderOptions(roomOptions: CreateRoomOptions): ICreateRoomOpts {
        const roomName = roomOptions.name;
        if (roomName === undefined) {
            throw new Error("Room name is undefined");
        }

        return {
            name: roomName.trim(),
            visibility: (roomOptions.visibility === "public" ? "public" : "private") as Visibility | undefined,
            room_alias_name: slugify(roomName),
            invite:
                roomOptions.invite
                    ?.map((invitation) => invitation.value)
                    .filter((invitation) => invitation !== undefined && invitation !== this.client?.getSafeUserId()) ??
                [],
            initial_state: this.computeInitialState(roomOptions),
            topic: roomOptions.description,
            creation_content: {
                "m.federate": true, //TODO : read doc on federate space
                type: "m.space",
            },
        };
    }

    private computeInitialState(roomOptions: CreateRoomOptions) {
        const { encrypt, historyVisibility } = roomOptions;
        const initial_state: ICreateRoomStateEvent[] = [];
        if (encrypt) {
            initial_state.push({ type: EventType.RoomEncryption, content: { algorithm: "m.megolm.v1.aes-sha2" } });
        }
        if (historyVisibility !== undefined) {
            initial_state.push({
                type: EventType.RoomHistoryVisibility,
                content: { history_visibility: roomOptions?.historyVisibility },
            });
        }

        if (roomOptions.parentSpaceID) {
            initial_state.push({
                type: EventType.SpaceParent,
                state_key: roomOptions.parentSpaceID,
                content: {
                    via: [this.client?.getDomain()],
                },
            });
            if (roomOptions.visibility === "restricted") {
                initial_state.push({
                    type: "m.room.join_rules",
                    state_key: "",
                    content: {
                        join_rule: "restricted",
                        allow: [
                            {
                                type: "m.room_membership",
                                room_id: roomOptions.parentSpaceID, // Replace with your space room ID
                            },
                        ],
                    },
                });
            }
        }

        initial_state.push({ type: EventType.RoomGuestAccess, content: { guest_access: "can_join" } });

        return initial_state;
    }

    async createDirectRoom(userToInvite: string): Promise<(ChatRoom & ChatRoomMembershipManagement) | undefined> {
        if (!this.client) {
            return Promise.reject(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
        }

        const existingDirectRoom = this.getDirectRoomFor(userToInvite);

        if (existingDirectRoom) return existingDirectRoom;

        this.roomCreationInProgress.set(true);

        const createRoomOptions = {
            //TODO not clean code
            invite: [{ value: userToInvite, label: userToInvite }],
            is_direct: true,
            preset: "trusted_private_chat",
            visibility: "private",
        } as CreateRoomOptions;

        try {
            const { room_id } = await this.client.createRoom({
                visibility: "private" as Visibility | undefined,
                invite: createRoomOptions.invite?.map((invitation) => invitation.value) ?? [],
                is_direct: true,
                initial_state: this.computeInitialState(createRoomOptions),
            });

            await this.addDMRoomInAccountData(userToInvite, room_id);

            //Wait Sync Event before use/update roomList otherwise room not exist in the client
            await this.waitForNextSync();

            const room = this.client.getRoom(room_id);
            if (!room) return;
            return this.createAndAddNewRootRoom(room);
        } catch (error) {
            throw this.handleMatrixError(error);
        } finally {
            this.roomCreationInProgress.set(false);
        }
    }

    getDirectRoomFor(userID: string): (ChatRoom & ChatRoomMembershipManagement) | undefined {
        const directRooms = Array.from(this.roomList.values())
            .filter((room) => {
                const memberIDs = get(room.members)
                    .filter((member) => member.id && ["join", "invite"].includes(get(member.membership)))
                    .map((member) => member.id);
                return (
                    get(room.type) === "direct" &&
                    memberIDs.some((memberId) => memberId === userID && memberIDs.length === 2)
                );
            })
            .map((room) => room);
        if (directRooms.length > 0) return directRooms[0];
        return undefined;
    }

    async searchChatUsers(searchText: string, limit = 20) {
        try {
            if (!this.client) {
                throw new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG);
            }
            const searchUserResponse = await this.client.searchUserDirectory({ term: searchText, limit });
            return searchUserResponse.results.map((user) => ({ id: user.user_id, name: user.display_name }));
        } catch (error) {
            console.error("Unable to search matrix chat user with searchText: ", searchText, error);
            Sentry.captureException(error);
        }
        return;
    }

    async searchAccessibleRooms(searchText = ""): Promise<
        {
            id: string;
            name: string | undefined;
        }[]
    > {
        const isGuestUser = get(this.isGuest);
        return new Promise((res, rej) => {
            if (!this.client) {
                rej(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
                return;
            }

            const searchOption: IRoomDirectoryOptions = {
                include_all_networks: true,
                filter: {
                    generic_search_term: searchText,
                },
            };
            this.client
                .publicRooms(searchOption)
                .then(({ chunk }) => {
                    const publicRoomsChunkRoom = chunk
                        .filter(({ room_id, guest_can_join }) => {
                            if (this.roomList.has(room_id)) {
                                return false;
                            }
                            if (!isGuestUser) {
                                return true;
                            } else {
                                return guest_can_join;
                            }
                        })
                        .map((chunkRoom) => {
                            return {
                                id: chunkRoom.room_id,
                                name: chunkRoom.name,
                            };
                        });
                    res(publicRoomsChunkRoom);
                })
                .catch((error) => {
                    rej(asError(error));
                });
        });
    }

    async joinRoom(roomId: string): Promise<ChatRoom> {
        return new Promise((res, rej) => {
            if (!this.client) {
                rej(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
                return;
            }

            this.client
                .joinRoom(roomId)
                .then(async (_) => {
                    //Wait Sync Event before use/update roomList otherwise room not exist in the client
                    await this.waitForNextSync();

                    if (!this.client) {
                        rej(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
                        return;
                    }
                    const roomAfterSync = this.client.getRoom(roomId);
                    if (!roomAfterSync) {
                        return Promise.reject(new Error("Room not present after synchronization"));
                    }
                    const dmInviterId = roomAfterSync.getDMInviter();
                    if (dmInviterId) {
                        await this.addDMRoomInAccountData(dmInviterId, roomId);
                    }
                    const room = await this.findRoomOrFolder(roomAfterSync.roomId);
                    if (room instanceof MatrixChatRoom) {
                        res(room);
                        return;
                    }

                    const roomFromRoomList = this.createAndAddNewRootRoom(roomAfterSync);
                    res(roomFromRoomList);
                    return;
                })
                .catch((error) => {
                    console.error("Unable to join", error);
                    Sentry.captureException(error);
                    rej(this.handleMatrixError(error));
                });
        });
    }

    initEndToEndEncryption(): Promise<void> {
        return this.matrixSecurity.openChooseDeviceVerificationMethodModal();
    }

    private async addRoomToSpace(spaceRoomId: string, childRoomId: string, suggested = false): Promise<void> {
        if (!this.client) {
            return Promise.reject(new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG));
        }

        const domain = this.client.getDomain();

        if (!domain) {
            return Promise.reject(new Error("Domain is not available"));
        }

        try {
            await this.client.sendStateEvent(
                spaceRoomId,
                EventType.SpaceChild,
                { via: [domain], suggested },
                childRoomId
            );
            return;
        } catch (error) {
            console.error("Error adding room to space: ", error);
            Sentry.captureException(error);
            throw new Error(get(LL).chat.addRoomToFolderError(), { cause: error });
        }
    }

    private async addDMRoomInAccountData(userId: string, roomId: string) {
        if (!this.client) {
            throw new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG);
        }
        const directMap: Record<string, string[]> = this.client.getAccountData("m.direct")?.getContent() || {};
        directMap[userId] = [...(directMap[userId] || []), roomId];
        await this.client.setAccountData("m.direct", directMap);
    }

    async isUserExist(address: string): Promise<boolean> {
        const user = await this.searchChatUsers(address, 1);
        if (!user) return false;
        return user && user.some((user) => user.id === address);
    }

    getRoomByID(roomId: string): ChatRoom {
        if (!this.client) {
            throw new Error(CLIENT_NOT_INITIALIZED_ERROR_MSG);
        }
        const room = this.client.getRoom(roomId);
        if (!room) {
            throw new Error("Room not found");
        }

        return new MatrixChatRoom(room);
    }

    private rebuildSpaceHierarchy() {
        const client = this.client;
        if (!client || typeof client.getVisibleRooms !== "function") return;

        this.roomFolders.forEach((folder) => {
            this.unregisterFolderShell(folder.id);
            this.roomFolders.delete(folder.id);
        });
        const visibleSpaces = client.getVisibleRooms().filter((room) => room.isSpaceRoom());

        visibleSpaces.forEach((space) => {
            this.indexRoomPlacement(space);
            if (this.getParentRoomID(space).length === 0) {
                const spaceFolder = new MatrixRoomFolder(space);
                spaceFolder.init();
                this.registerFolderShell(spaceFolder);
                this.roomFolders.set(spaceFolder.id, spaceFolder);
            }
        });
    }

    retrySendingEvents = async () => {
        try {
            const roomList = Array.from(this.roomList.values());
            await Promise.allSettled(roomList.map((room) => room.retrySendingEvents()));
        } catch (error) {
            console.error("Unable to retry sending events", error);
            Sentry.captureException(error);
        }
    };

    clearListener() {
        this.clearRoomPlacementRetries();
        this.rawUnreadRoomUnsubscribers.forEach((unsubscribe) => unsubscribe());
        this.rawUnreadRoomUnsubscribers.clear();
        this.rawUnreadRooms.set(new Map());
        this.parentRoomIdsByRoomId.clear();
        this.childRoomIdsBySpaceId.clear();
        this.folderShellsByRoomId.clear();
        this.roomList.forEach((room) => {
            this.roomList.delete(room.id);
        });
        this.client?.off(ClientEvent.Room, this.handleRoom);
        this.client?.off(ClientEvent.DeleteRoom, this.handleDeleteRoom);
        this.client?.off(RoomEvent.MyMembership, this.handleMyMembership);
        this.client?.off("RoomState.events" as EmittedEvents, this.handleRoomStateEvent);
        this.client?.off(RoomEvent.Name, this.handleName);
        this.client?.off(UserEvent.Presence, this.handleUserPresence);
        this.client?.off(CryptoEvent.VerificationRequestReceived, this.handleVerificationRequestReceived);
        if (this.statusUnsubscriber) this.statusUnsubscriber();
        if (this.wokaAvatarMatrixSyncUnsubscriber) {
            this.wokaAvatarMatrixSyncUnsubscriber();
            this.wokaAvatarMatrixSyncUnsubscriber = undefined;
        }
        if (this.displayNameMatrixSyncDebounceTimer !== undefined) {
            clearTimeout(this.displayNameMatrixSyncDebounceTimer);
            this.displayNameMatrixSyncDebounceTimer = undefined;
        }
        if (this.displayNameMatrixSyncUnsubscriber) {
            this.displayNameMatrixSyncUnsubscriber();
            this.displayNameMatrixSyncUnsubscriber = undefined;
        }
    }
    async destroy(): Promise<void> {
        await this.client?.logout(true);
    }
}

class AutoDestroyingMapStore<K, V extends Required<{ destroy: () => void }>> extends MapStore<K, V> {
    override delete(key: K): boolean {
        this.get(key)?.destroy();
        return super.delete(key);
    }
}
