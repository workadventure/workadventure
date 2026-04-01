import type { Readable, Unsubscriber, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
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
import { defaultWoka as sharedDefaultWoka } from "@workadventure/shared-utils";
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
} from "../ChatConnection";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
import { currentPlayerWokaStore } from "../../../Stores/CurrentPlayerWokaStore";
import LL from "../../../../i18n/i18n-svelte";
import type { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
import { MATRIX_ADMIN_USER, MATRIX_DOMAIN } from "../../../Enum/EnvironmentVariable";
import { MatrixRateLimiter } from "../../Services/MatrixRateLimiter";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { MatrixChatRoom } from "./MatrixChatRoom";
import type { MatrixSecurity } from "./MatrixSecurity";
import { matrixSecurity as defaultMatrixSecurity } from "./MatrixSecurity";
import { MatrixRoomFolder } from "./MatrixRoomFolder";
import { chatUserFactory, mapMatrixPresenceToAvailabilityStatus } from "./MatrixChatUser";
import {
    clearLastSyncedWokaAvatarHashForMatrixUser,
    clearWaAvatarHttpCachesForUser,
    deleteWaAvatarFromMatrixAccountData,
    fetchWaAvatarMxcFromUserAccountDataRemote,
    fetchWaDisplayNameFromUserAccountDataRemote,
    readWaAvatarMxcFromMatrixAccountData,
    readWaDisplayNameFromMatrixAccountData,
    setWaAvatarAccountDataHttpCacheForUser,
    setWaDisplayNameAccountDataCacheForUser,
    pushLocalWokaAndNameToMatrixProfile,
    syncWokaAvatarToMatrixProfileOnWokaChange,
    WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE,
    WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE,
    writeWaDisplayNameToMatrixAccountData,
} from "./services/WaMatrixProfileService";

const debug = Debug("matrix");

const CLIENT_NOT_INITIALIZED_ERROR_MSG = "MatrixClient not yet initialized";

/** Snapshot for the Matrix chat settings UI (profile vs account_data vs local game state). */
export type MatrixUserSettingsDiagnostics = {
    matrixUserId: string;
    homeserverUrl: string;
    profileDisplayName: string | undefined;
    profileAvatarMxc: string | undefined;
    profileAvatarPreviewUrl: string | undefined;
    accountDataWaDisplayName: string | undefined;
    accountDataWaAvatarMxc: string | undefined;
    accountDataWaAvatarPreviewUrl: string | undefined;
    localDisplayName: string | undefined;
    accountDataNeedsSync: boolean;
};

/** Read-only snapshot for another Matrix user (debug tooling). */
export type MatrixPeerProfileDiagnostics = {
    matrixUserId: string;
    homeserverUrl: string;
    profileDisplayName: string | undefined;
    profileAvatarMxc: string | undefined;
    profileAvatarPreviewUrl: string | undefined;
    accountDataWaDisplayName: string | undefined;
    accountDataWaAvatarMxc: string | undefined;
    accountDataWaAvatarPreviewUrl: string | undefined;
};

export const defaultWoka =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
export const defaultColor = "#626262";

export class MatrixChatConnection implements ChatConnectionInterface {
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
    private waDisplayNameAccountDataUnsubscriber: Unsubscriber | undefined;
    /** When the space / user list changes, re-fetch peer `fr.workadventure.*` account_data from the homeserver. */
    private userListPeerAccountDataUnsubscriber: Unsubscriber | undefined;
    private userListPeerAccountDataDebounceTimer: ReturnType<typeof setTimeout> | undefined;
    private isClientReady = false;
    private usersStatus: MapStore<string, AvailabilityStatus>;
    private userIdsNeedingPresenceUpdate = new Set();
    private matrixRateLimiter: MatrixRateLimiter;
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
        this.matrixRateLimiter = MatrixRateLimiter.getInstance();
        this.clientPromise = clientPromise;
        this.directRooms = derived(this.roomList, (roomList) => {
            return Array.from(roomList.values()).filter(
                (room) => get(room.myMembership) === KnownMembership.Join && room.type === "direct"
            );
        });

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

        this.rooms = derived(this.roomList, (roomList) => {
            return Array.from(roomList.values()).filter(
                (room) => get(room.myMembership) === KnownMembership.Join && room.type === "multiple"
            );
        });

        this.hasUnreadMessages = derived(
            this.roomList,
            (roomList, set) => {
                // Create a listener for each `hasUnreadMessages` store
                const unsubscribes = Array.from(roomList.values()).map((room) =>
                    room.hasUnreadMessages.subscribe(() => {
                        set(Array.from(roomList.values()).some((someRoom) => get(someRoom.hasUnreadMessages)));
                    })
                );

                // Cleanup function
                return () => unsubscribes.forEach((unsub) => unsub());
            },
            false
        );

        this.folders = derived(
            [this.roomFolders, ...Array.from(this.roomFolders.values()).map((folder) => folder.myMembership)],
            (folderList) => {
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

        this.nbUnreadInvitationsMessages = derived(
            this.invitations,
            (invitations, set) => {
                // Subscribe to all invitation unreadNotificationCount stores
                const unsubscribes = invitations.map((room) =>
                    room.unreadNotificationCount.subscribe(() => {
                        const total = invitations.reduce(
                            (acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount),
                            0
                        );
                        set(total);
                    })
                );
                // Initial calculation
                const total = invitations.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
                set(total);
                // Cleanup function
                return () => unsubscribes.forEach((unsub) => unsub());
            },
            0
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

        this.nbUnreadRoomsMessages = derived(
            this.rooms,
            (rooms, set) => {
                // Subscribe to all room unreadNotificationCount stores
                const unsubscribes = rooms.map((room) =>
                    room.unreadNotificationCount.subscribe(() => {
                        const total = rooms.reduce(
                            (acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount),
                            0
                        );
                        set(total);
                    })
                );
                // Initial calculation
                const total = rooms.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
                set(total);
                // Cleanup function
                return () => unsubscribes.forEach((unsub) => unsub());
            },
            0
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
     * Call from {@link GameScene} once {@link UserProviderMerger} is ready so Matrix peer account_data
     * stays aligned with space / connected-user list updates.
     */
    bindUserListAccountDataRefresh(merger: UserProviderMerger): void {
        this.unbindUserListAccountDataRefresh();
        this.userListPeerAccountDataUnsubscriber = merger.usersByRoomStore.subscribe((usersByRoom) => {
            if (this.userListPeerAccountDataDebounceTimer !== undefined) {
                clearTimeout(this.userListPeerAccountDataDebounceTimer);
            }
            this.userListPeerAccountDataDebounceTimer = setTimeout(() => {
                this.userListPeerAccountDataDebounceTimer = undefined;
                const ids = new Set<string>();
                for (const { users } of usersByRoom.values()) {
                    for (const u of users) {
                        const cid = u.chatId;
                        if (typeof cid === "string" && cid.startsWith("@")) {
                            ids.add(cid);
                        }
                    }
                }
                this.refreshPeersWaAccountDataFromServer(Array.from(ids)).catch(() => undefined);
            }, 400);
        });
    }

    private unbindUserListAccountDataRefresh(): void {
        if (this.userListPeerAccountDataDebounceTimer !== undefined) {
            clearTimeout(this.userListPeerAccountDataDebounceTimer);
            this.userListPeerAccountDataDebounceTimer = undefined;
        }
        if (this.userListPeerAccountDataUnsubscriber) {
            this.userListPeerAccountDataUnsubscriber();
            this.userListPeerAccountDataUnsubscriber = undefined;
        }
    }

    async init(): Promise<void> {
        try {
            this.client = await this.clientPromise;
            this.matrixSecurity.updateMatrixClientStore(this.client);
            await this.startMatrixClient();
            this.isGuest.set(this.client.isGuest());
            this.rebuildSpaceHierarchy();
            this.attachWokaAvatarMatrixSync();
            this.attachWaDisplayNameAccountDataSync();
        } catch (error) {
            this.connectionStatus.set("OFFLINE");
            console.error(error);
            Sentry.captureException(error);
        }
    }

    /**
     * Uploads the in-game WOKA image to Matrix content and stores the MXC in account_data (`fr.workadventure.wa_avatar`),
     * without overwriting the Matrix profile avatar.
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

        trySync(get(currentPlayerWokaStore)).catch(() => undefined);
        this.wokaAvatarMatrixSyncUnsubscriber = currentPlayerWokaStore.subscribe((src) => {
            trySync(src).catch(() => undefined);
        });
    }

    /**
     * Persists the WorkAdventure display name in Matrix account_data and drives chat background color (matrixWaDisplayNameForColorStore).
     */
    private attachWaDisplayNameAccountDataSync(): void {
        if (!this.client || this.client.isGuest() || this.waDisplayNameAccountDataUnsubscriber) {
            return;
        }

        this.syncWaDisplayNameAccountDataWithLocal().catch(() => undefined);

        if (!this.client || this.client.isGuest()) {
            return;
        }
        const localName = localUserStore.getName()?.trim();
        if (!localName) {
            return;
        }
        writeWaDisplayNameToMatrixAccountData(this.client, localName).catch((error) => {
            console.warn("Failed to sync WA display name to Matrix account_data", error);
            Sentry.captureException(error);
        });
    }

    private async syncWaDisplayNameAccountDataWithLocal(): Promise<void> {
        if (!this.client || this.client.isGuest()) {
            return;
        }
        const localName = localUserStore.getName()?.trim();
        const remoteName = readWaDisplayNameFromMatrixAccountData(this.client);
        if (localName && localName !== remoteName) {
            try {
                await writeWaDisplayNameToMatrixAccountData(this.client, localName);
            } catch (error) {
                console.warn("Failed to push WA display name to Matrix account_data", error);
                Sentry.captureException(error);
            }
        }
    }

    /** Exposes the synced client (e.g. chat tint / `account_data` reads from {@link getMatrixClientForChatTint}). */
    getMatrixClient(): MatrixClient | undefined {
        return this.client;
    }

    /**
     * Loads Matrix profile + WorkAdventure account_data for the settings UI.
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
            profileDisplayName = profile.displayname;
            profileAvatarMxc = profile.avatar_url;
        } catch {
            /* profile fetch can fail on restricted networks */
        }
        const profileAvatarPreviewUrl = profileAvatarMxc
            ? this.client.mxcUrlToHttp(profileAvatarMxc, 96, 96) ?? undefined
            : undefined;
        const accountDataWaDisplayName = readWaDisplayNameFromMatrixAccountData(this.client);
        const accountDataWaAvatarMxc = readWaAvatarMxcFromMatrixAccountData(this.client);
        const accountDataWaAvatarPreviewUrl = accountDataWaAvatarMxc
            ? this.client.mxcUrlToHttp(accountDataWaAvatarMxc, 96, 96) ?? undefined
            : undefined;
        const localDisplayName = localUserStore.getName()?.trim();
        const localWoka = get(currentPlayerWokaStore);
        const hasCustomWoka = Boolean(localWoka && localWoka !== sharedDefaultWoka);
        const nameMismatch = Boolean(localDisplayName && localDisplayName !== accountDataWaDisplayName);
        const avatarMissingInAccountData = Boolean(hasCustomWoka && !accountDataWaAvatarMxc);
        const accountDataNeedsSync = nameMismatch || avatarMissingInAccountData;

        return {
            matrixUserId: userId,
            homeserverUrl,
            profileDisplayName,
            profileAvatarMxc,
            profileAvatarPreviewUrl,
            accountDataWaDisplayName,
            accountDataWaAvatarMxc,
            accountDataWaAvatarPreviewUrl,
            localDisplayName,
            accountDataNeedsSync,
        };
    }

    /**
     * Loads Matrix profile + WorkAdventure account_data for another user (GET profile + peer account_data; debug UI only).
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

        const [accountDataWaDisplayName, accountDataWaAvatarMxc] = await Promise.all([
            fetchWaDisplayNameFromUserAccountDataRemote(this.client, matrixUserId),
            fetchWaAvatarMxcFromUserAccountDataRemote(this.client, matrixUserId),
        ]);
        const accountDataWaAvatarPreviewUrl = accountDataWaAvatarMxc
            ? this.client.mxcUrlToHttp(accountDataWaAvatarMxc, 96, 96) ?? undefined
            : undefined;

        return {
            matrixUserId,
            homeserverUrl,
            profileDisplayName,
            profileAvatarMxc,
            profileAvatarPreviewUrl,
            accountDataWaDisplayName,
            accountDataWaAvatarMxc,
            accountDataWaAvatarPreviewUrl,
        };
    }

    /**
     * Pushes local WorkAdventure name and WOKA image into Matrix account_data (does not change the Matrix profile avatar).
     */
    async syncMatrixAccountDataFromLocalGameState(): Promise<void> {
        if (!this.client || this.client.isGuest()) {
            return;
        }
        await this.syncWaDisplayNameAccountDataWithLocal();
        await syncWokaAvatarToMatrixProfileOnWokaChange(this.client, get(currentPlayerWokaStore));
    }

    /**
     * Sets the Matrix global profile display name and avatar from the in-game name and current WOKA
     * (standard `/profile`, e.g. visible in Element). Distinct from {@link syncMatrixAccountDataFromLocalGameState}.
     */
    async syncMatrixGlobalProfileFromLocalWokaAndName(): Promise<void> {
        if (!this.client || this.client.isGuest()) {
            return;
        }
        await pushLocalWokaAndNameToMatrixProfile(this.client, {
            localDisplayName: localUserStore.getName() ?? undefined,
            wokaImageSrc: get(currentPlayerWokaStore),
        });
    }

    /**
     * Clears the Matrix profile avatar and WorkAdventure `fr.workadventure.wa_avatar` account_data.
     * Does not change the in-game WOKA; use {@link syncMatrixAccountDataFromLocalGameState} to publish again.
     */
    async clearMatrixProfileImages(): Promise<void> {
        if (!this.client || this.client.isGuest()) {
            return;
        }
        const userId = this.client.getSafeUserId();
        if (!userId) {
            return;
        }
        await this.client.setAvatarUrl("");
        await deleteWaAvatarFromMatrixAccountData(this.client);
        clearLastSyncedWokaAvatarHashForMatrixUser(userId);
        clearWaAvatarHttpCachesForUser(userId);
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
            threadSupport: false,
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

    private getParentRoomID(room: Room): string[] {
        return (
            room.getLiveTimeline().getState(EventTimeline.FORWARDS)?.getStateEvents(EventType.SpaceParent) || []
        ).reduce((acc, currentMatrixEvent) => {
            const parentID = currentMatrixEvent.getStateKey();
            if (parentID) acc.push(parentID);
            return acc;
        }, [] as string[]);
    }

    /** After WA avatar account_data sync, refresh the current user’s MatrixChatRoomMember rows so chat UI picks up the new MXC. */
    private refreshSelfMemberAvatarsInAllChatRooms(): void {
        if (!this.client) {
            return;
        }
        const myId = this.client.getUserId();
        if (!myId) {
            return;
        }
        const refreshRoom = (room: MatrixChatRoom) => {
            get(room.members)
                .filter((m) => m.id === myId)
                .forEach((m) => m.refreshAvatarFromRoomMember());
        };
        this.roomList.forEach((room) => refreshRoom(room));
        const visitFolder = (folder: MatrixRoomFolder) => {
            folder.roomList.forEach((room) => refreshRoom(room));
            folder.folderList.forEach((sub) => visitFolder(sub));
        };
        this.roomFolders.forEach((folder) => visitFolder(folder));
    }

    /** Re-fetch `fr.workadventure.wa_display_name` / `wa_avatar` for peers and refresh chat avatars / tint. */
    private async refreshPeersWaAccountDataFromServer(matrixUserIds: string[]): Promise<void> {
        if (!this.client || this.client.isGuest()) {
            return;
        }
        const myId = this.client.getUserId();
        const targets = matrixUserIds.filter((id) => id.startsWith("@") && id !== myId);
        if (targets.length === 0) {
            return;
        }
        debug("refresh peer WA account_data after user list update (%d matrix user(s))", targets.length);
        await Promise.allSettled(
            targets.map(async (uid) => {
                try {
                    const [name, mxc] = await Promise.all([
                        fetchWaDisplayNameFromUserAccountDataRemote(this.client!, uid),
                        fetchWaAvatarMxcFromUserAccountDataRemote(this.client!, uid),
                    ]);
                    if (name?.trim()) {
                        setWaDisplayNameAccountDataCacheForUser(uid, name);
                    } else {
                        setWaDisplayNameAccountDataCacheForUser(uid, "");
                    }
                    if (mxc?.startsWith("mxc://")) {
                        const http = this.client!.mxcUrlToHttp(mxc, 96, 96);
                        if (http) {
                            setWaAvatarAccountDataHttpCacheForUser(uid, http);
                        }
                    } else {
                        clearWaAvatarHttpCachesForUser(uid);
                    }
                    this.refreshMemberAvatarsInAllChatRoomsForUser(uid);
                } catch (e) {
                    debug("refresh peer WA account_data failed userId=%s %o", uid, e);
                }
            })
        );
    }

    private refreshMemberAvatarsInAllChatRoomsForUser(matrixUserId: string): void {
        const refreshRoom = (room: MatrixChatRoom) => {
            get(room.members)
                .filter((m) => m.id === matrixUserId)
                .forEach((m) => m.refreshAvatarFromRoomMember());
        };
        this.roomList.forEach((room) => refreshRoom(room));
        const visitFolder = (folder: MatrixRoomFolder) => {
            folder.roomList.forEach((room) => refreshRoom(room));
            folder.folderList.forEach((sub) => visitFolder(sub));
        };
        this.roomFolders.forEach((folder) => visitFolder(folder));
    }

    private onAccountDataEvent(event: MatrixEvent) {
        if (event.getType() === WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE) {
            const content = event.getContent();
            const remote = content?.name?.trim();
            const local = localUserStore.getName()?.trim();
            debug(
                "sync account_data event %s (self only over /sync) remoteName=%s localName=%s",
                WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE,
                remote ?? "",
                local ?? ""
            );
            return;
        }
        if (event.getType() === WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE) {
            debug(
                "sync account_data event %s (self only over /sync) → refresh self avatars in rooms",
                WORKADVENTURE_WA_AVATAR_ACCOUNT_DATA_TYPE
            );
            this.refreshSelfMemberAvatarsInAllChatRooms();
            return;
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

        if (!roomID) {
            return;
        }
        const room = this.client.getRoom(roomID);
        if (!room) {
            return;
        }

        this.roomList.delete(roomID);
        this.roomFolders.delete(roomID);

        const parentID = event.getRoomId();
        if (!parentID) {
            return;
        }

        this.moveRoomToParentFolder(room, parentID).catch((e) => {
            console.error("Failed to move room to parent folder : ", e);
        });
    }
    private onClientEventRoom(room: Room) {
        this.manageRoomOrFolder(room).catch((e) => {
            console.error("Failed to manage : ", e);
        });
    }

    private async moveRoomToParentFolder(room: Room, parentID: string): Promise<void> {
        const isSpaceRoom = room.isSpaceRoom();
        const parentFolder = await this.findParentFolder(parentID);

        if (!parentFolder) {
            return;
        }

        this.addRoomToFolder(room, parentFolder, isSpaceRoom);
    }
    private addRoomToFolder(room: Room, targetFolder: MatrixRoomFolder, isSpaceRoom: boolean): void {
        if (isSpaceRoom) {
            const newFolder = new MatrixRoomFolder(room);
            targetFolder.folderList.set(room.roomId, newFolder);

            newFolder.init();
        } else {
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

            await this.addRoomToParentFolder(room, parentFolder);
            // await parentFolder.refreshAllChildRooms();
            return true;
        } catch (e) {
            console.error("Error in tryAddRoomToParentFolder:", e);
            return false;
        }
    }

    private async findParentFolder(parentRoomID: string): Promise<MatrixRoomFolder | null> {
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

    private async addRoomToParentFolder(room: Room, parentFolder: MatrixRoomFolder): Promise<void> {
        const isSpaceRoom = room.isSpaceRoom();
        const roomId = room.roomId;

        // Add room/folder to parent's lists
        if (isSpaceRoom) {
            const roomFolder = new MatrixRoomFolder(room);
            await roomFolder.refreshRooms();
            // await roomFolder.refreshAllChildRooms();
            // await roomFolder.refreshSuggestedRooms();
            parentFolder.folderList.set(roomId, roomFolder);
        } else {
            parentFolder.roomList.set(roomId, new MatrixChatRoom(room));
        }

        if (get(parentFolder.myMembership) === KnownMembership.Join) {
            this.roomList.delete(roomId);
            this.roomFolders.delete(roomId);
            return;
        }

        const rootList = isSpaceRoom ? this.roomFolders : this.roomList;
        const RoomClass = isSpaceRoom ? MatrixRoomFolder : MatrixChatRoom;
        rootList.set(roomId, new RoomClass(room));
    }

    private handleOrphanRoom(room: Room): void {
        if (room.isSpaceRoom()) {
            this.createAndAddNewRootFolder(room);
            return;
        }

        this.createAndAddNewRootRoom(room);
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
        const { roomId } = room;

        if (membership !== prevMembership && membership === KnownMembership.Join) {
            this.roomList.delete(roomId);
            this.roomFolders.delete(roomId);

            this.manageRoomOrFolder(room).catch((e) => {
                console.error("Failed to manageRoomOrFolder :", e);
            });
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

                    this.roomList.delete(room.roomId);
                    this.roomFolders.delete(room.roomId);
                    this.manageRoomOrFolder(room).catch((e) => {
                        console.error("Failed to manageRoomOrFolder : ", e);
                    });

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
            this.deleteRoom(roomId).catch((e) => {
                console.error("Failed to delete room : ", e);
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
                    room.type === "direct" &&
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
        if (!client) return;

        this.roomFolders.forEach((folder) => {
            this.roomFolders.delete(folder.id);
        });
        const visibleSpaces = client.getVisibleRooms().filter((room) => room.isSpaceRoom());

        visibleSpaces.forEach((space) => {
            const spaceFolder = new MatrixRoomFolder(space);
            //TODO: maybe delay init until folder is opened
            spaceFolder.init();
            if (this.getParentRoomID(space).length === 0) {
                this.roomFolders.set(spaceFolder.id, spaceFolder);
                // Process room IDs asynchronously without blocking
                spaceFolder
                    .getRoomsIdInNode()
                    .then((roomIDs) => {
                        roomIDs.forEach((roomID) => {
                            this.roomList.delete(roomID);
                            this.roomFolders.delete(roomID);
                        });
                    })
                    .catch((error) => {
                        console.error("Failed to get room IDs for space folder:", error);
                        Sentry.captureException(error);
                    });
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
        if (this.waDisplayNameAccountDataUnsubscriber) {
            this.waDisplayNameAccountDataUnsubscriber();
            this.waDisplayNameAccountDataUnsubscriber = undefined;
        }
        this.unbindUserListAccountDataRefresh();
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
