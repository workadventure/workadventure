import * as Sentry from "@sentry/svelte";
import { FilterType } from "@workadventure/messages";
import { LockByKey } from "@workadventure/shared-utils/src/LockByKey";
import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import LL from "../../../../i18n/i18n-svelte";
import type { ProximityChatRoom } from "./ProximityChatRoom";

export const DEFAULT_PROXIMITY_SPACE_NAME = "proximity";

/**
 * Deadlock backstop for room join/leave operations. Without it, a single operation whose server
 * round-trip never resolves would wedge the queue for that space forever, blocking every later
 * join/leave. Set high enough that it only fires on a genuine hang, never on ordinary slowness:
 * on timeout LockByKey releases the queue while the abandoned callback may still be alive, which
 * can reintroduce the race the lock guards against — an acceptable trade only for a true deadlock.
 */
const ROOM_OPERATION_LOCK_TIMEOUT_MS = 10_000;

export type ProximityChatRoomKind = "default" | "proximity" | "meeting" | "listener" | "speaker" | "area";

const ZONE_ROOM_KINDS: ReadonlySet<ProximityChatRoomKind> = new Set(["meeting", "listener", "speaker", "area"]);

/**
 * Orders the proximity rooms for the chat list: the bubble room first, then the joined zone rooms from the deepest
 * to the outermost, then the rooms kept only for their history.
 * Zones can be nested (a room in a floor in a building), and each zone has its own chat. The front does not know
 * how areas contain each other, but it knows the order in which they were entered: walking in, one always enters the
 * outer zone before the inner one. So the deepest zone is the zone entered last (`entryOrder` holds increasing
 * numbers). When several zones are entered in the same frame (spawn, teleport), AreasPropertiesListener processes
 * the largest area first, so the smallest one still comes last.
 */
export function sortRoomsByZoneDepth<Room extends Pick<ProximityChatRoom, "spaceName" | "kind" | "isJoined">>(
    rooms: Room[],
    entryOrder: ReadonlyMap<string, number>,
): Room[] {
    const rank = (room: Room) => {
        if (room.spaceName === DEFAULT_PROXIMITY_SPACE_NAME) return 0;
        return get(room.isJoined) && ZONE_ROOM_KINDS.has(get(room.kind)) ? 1 : 2;
    };
    return [...rooms].sort((roomA, roomB) => {
        const rankDifference = rank(roomA) - rank(roomB);
        if (rankDifference !== 0 || rank(roomA) !== 1) return rankDifference;
        return (entryOrder.get(roomB.spaceName) ?? 0) - (entryOrder.get(roomA.spaceName) ?? 0);
    });
}

export type ProximityChatRoomFactory = (
    spaceName: string,
    displayName: string,
    kind: ProximityChatRoomKind,
) => ProximityChatRoom;

export function getProximityAreaRoomDisplayName(displayName: string, kind: ProximityChatRoomKind): string {
    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length > 0) {
        return trimmedDisplayName;
    }

    switch (kind) {
        case "meeting":
            return get(LL).mapEditor.properties.livekitRoomProperty.label();
        case "listener":
            return get(LL).mapEditor.properties.listenerMegaphone.label();
        case "speaker":
            return get(LL).mapEditor.properties.speakerMegaphone.label();
        default:
            return displayName;
    }
}

/**
 * Owns the proximity chat rooms visible in the chat UI, allowing several proximity rooms to be joined in parallel.
 * It keeps their joined/active state in sync and handles the mismatch between regular area/meeting rooms, which map
 * one room to one space, and the default proximity room, which is a single UI entry reused across successive bubble spaces.
 */
export class ProximityChatRoomManager {
    private readonly rooms = new Map<string, ProximityChatRoom>();
    private readonly _roomsStore = writable<ProximityChatRoom[]>([]);
    private readonly _activeRoomStore = writable<ProximityChatRoom | undefined>(undefined);
    private readonly lastJoinedSpaceNames: string[] = [];
    /** Increasing number per zone entry, recorded when the join is requested (see sortRoomsByZoneDepth). */
    private readonly zoneEntryOrder = new Map<string, number>();
    private zoneEntryCount = 0;
    private readonly _deepestZoneRoomStore = writable<ProximityChatRoom | undefined>(undefined);
    private readonly _parentZoneRoomsStore = writable<ProximityChatRoom[]>([]);
    private readonly _enteredZoneRoomStore = writable<ProximityChatRoom | undefined>(undefined);
    /**
     * Serializes join/leave operations targeting the same room (keyed by the `rooms` map key).
     * Both operations mutate `rooms`/`lastJoinedSpaceNames` after awaiting server round-trips, so
     * letting them interleave corrupts the manager state: a leave resuming after its await would
     * destroy and unregister a room that a concurrent join has started reusing, leaving the space
     * alive in the SpaceRegistry but unreachable from this manager (every later join of that space
     * then throws SpaceAlreadyExistError, and leaves become no-ops). This happens when a user
     * crosses quickly from a megaphone zone to another one mapped to the same space.
     * A large timeout (ROOM_OPERATION_LOCK_TIMEOUT_MS) is used only as a deadlock backstop: a wedged
     * operation would otherwise block the queue forever. It should never fire under normal slowness;
     * if it does, the timeout is reported below.
     */
    private readonly roomOperationLocks = new LockByKey<string>(
        (error, key, timeoutMs) => {
            console.error(`Proximity room operation timed out for space: ${key}`, error);
            Sentry.captureException(error, {
                tags: { spaceName: String(key), location: "roomOperationLockTimeout" },
                extra: { timeoutMs },
            });
        },
        (error, key) => {
            // Leaving an area aborts its pending join on purpose, and callers ignore that. A server query
            // that timed out also rejects with an AbortError, but its 15s timeout is longer than
            // ROOM_OPERATION_LOCK_TIMEOUT_MS, so the lock timeout above has already reported it.
            if (error.name === "AbortError") {
                return;
            }
            console.error(`Proximity room operation failed for space: ${key}`, error);
            Sentry.captureException(error, {
                tags: { spaceName: String(key), location: "roomOperationLock" },
            });
        },
    );

    public readonly roomsStore: Readable<ProximityChatRoom[]> = this._roomsStore;
    public readonly activeRoomStore: Readable<ProximityChatRoom | undefined> = this._activeRoomStore;
    /** The joined zone room entered last: the only one shown as active in the room list. */
    public readonly deepestZoneRoomStore: Readable<ProximityChatRoom | undefined> = this._deepestZoneRoomStore;
    /** The other joined zone rooms (the zones around the deepest one), dimmed in the room list. */
    public readonly parentZoneRoomsStore: Readable<ProximityChatRoom[]> = this._parentZoneRoomsStore;
    /**
     * The deepest zone room, set when a zone is entered and cleared when it is left or dismissed. The open
     * conversation shows it in a banner when it is another room: entering a zone never switches away from
     * a conversation the user is reading.
     */
    public readonly enteredZoneRoomStore: Readable<ProximityChatRoom | undefined> = this._enteredZoneRoomStore;
    public readonly unreadMessagesCount: Readable<number> = derived(this.roomsStore, (rooms, set) => {
        if (rooms.length === 0) {
            set(0);
            return () => {};
        }

        return derived(
            rooms.map((room) => room.unreadMessagesCount),
            (counts) => counts.reduce((total, count) => total + count, 0),
        ).subscribe(set);
    });

    public constructor(private readonly createRoom: ProximityChatRoomFactory) {}

    public getOrCreateRoom(
        spaceName: string,
        displayName: string,
        kind: ProximityChatRoomKind = "area",
    ): ProximityChatRoom {
        const normalizedDisplayName = getProximityAreaRoomDisplayName(displayName, kind);
        const existingRoom = this.rooms.get(spaceName);
        if (existingRoom) {
            existingRoom.setDisplayName(normalizedDisplayName);
            existingRoom.kind.set(kind);
            return existingRoom;
        }

        const room = this.createRoom(spaceName, normalizedDisplayName, kind);
        this.rooms.set(spaceName, room);
        this.syncRoomsStore();
        return room;
    }

    public joinSpace(
        spaceName: string,
        displayName: string,
        propertiesToSync: string[],
        isMeetingRoomChat = false,
        filterType: FilterType = FilterType.ALL_USERS,
        disableChat = false,
        signal?: AbortSignal,
        kind: ProximityChatRoomKind = "area",
    ): Promise<ProximityChatRoom> {
        this.zoneEntryOrder.set(spaceName, ++this.zoneEntryCount);
        return this.roomOperationLocks.waitForLock(
            spaceName,
            async () => {
                const room = this.getOrCreateRoom(spaceName, displayName, kind);
                await room.joinSpace(spaceName, propertiesToSync, isMeetingRoomChat, filterType, disableChat, signal);
                room.isJoined.set(true);
                this.markAsLastJoined(spaceName);
                this._activeRoomStore.set(room);
                this.syncRoomsStore();
                // Joins of zones entered together complete in any order: only announce the deepest one.
                if (get(this._deepestZoneRoomStore) === room && !get(room.isChatDisabled)) {
                    this._enteredZoneRoomStore.set(room);
                }
                return room;
            },
            ROOM_OPERATION_LOCK_TIMEOUT_MS,
        );
    }

    public joinDefaultSpace(
        spaceName: string,
        propertiesToSync: string[],
        signal?: AbortSignal,
    ): Promise<ProximityChatRoom> {
        return this.roomOperationLocks.waitForLock(
            DEFAULT_PROXIMITY_SPACE_NAME,
            async () => {
                const room = this.getOrCreateRoom(DEFAULT_PROXIMITY_SPACE_NAME, get(LL).chat.proximity(), "default");
                await room.joinSpace(spaceName, propertiesToSync, false, FilterType.ALL_USERS, false, signal);
                room.isJoined.set(true);
                this.markAsLastJoined(DEFAULT_PROXIMITY_SPACE_NAME);
                this._activeRoomStore.set(room);
                this.syncRoomsStore();
                return room;
            },
            ROOM_OPERATION_LOCK_TIMEOUT_MS,
        );
    }

    public leaveDefaultSpace(spaceName: string): Promise<void> {
        return this.roomOperationLocks.waitForLock(
            DEFAULT_PROXIMITY_SPACE_NAME,
            async () => {
                const room = this.getDefaultRoom();
                if (!room) {
                    return;
                }

                const didLeave = await room.leaveSpace(spaceName, false);
                if (!didLeave) {
                    return;
                }
                room.isJoined.set(false);
                const lastJoinedIndex = this.lastJoinedSpaceNames.indexOf(DEFAULT_PROXIMITY_SPACE_NAME);
                if (lastJoinedIndex !== -1) {
                    this.lastJoinedSpaceNames.splice(lastJoinedIndex, 1);
                }

                const activeRoom = get(this._activeRoomStore);
                if (activeRoom?.spaceName === DEFAULT_PROXIMITY_SPACE_NAME) {
                    this._activeRoomStore.set(this.resolveMostRecentJoinedRoom());
                }

                this.syncRoomsStore();
            },
            ROOM_OPERATION_LOCK_TIMEOUT_MS,
        );
    }

    public leaveSpace(spaceName: string, isMeetingRoomChat = false): Promise<void> {
        return this.roomOperationLocks.waitForLock(
            spaceName,
            async () => {
                const room = this.rooms.get(spaceName);
                if (!room) {
                    return;
                }

                const didLeave = await room.leaveSpace(spaceName, isMeetingRoomChat);
                if (!didLeave) {
                    return;
                }
                room.isJoined.set(false);
                const lastJoinedIndex = this.lastJoinedSpaceNames.indexOf(spaceName);
                if (lastJoinedIndex !== -1) {
                    this.lastJoinedSpaceNames.splice(lastJoinedIndex, 1);
                }

                if (get(this._enteredZoneRoomStore) === room) {
                    this._enteredZoneRoomStore.set(undefined);
                }

                if (!get(room.hasUserMessages) && spaceName !== DEFAULT_PROXIMITY_SPACE_NAME) {
                    room.destroy();
                    this.rooms.delete(spaceName);
                }

                const activeRoom = get(this._activeRoomStore);
                if (activeRoom?.spaceName === spaceName) {
                    this._activeRoomStore.set(this.resolveMostRecentJoinedRoom());
                }

                this.syncRoomsStore();
            },
            ROOM_OPERATION_LOCK_TIMEOUT_MS,
        );
    }

    public resolveTargetRoom(spaceName?: string): ProximityChatRoom | undefined {
        if (spaceName) {
            return this.rooms.get(spaceName);
        }

        const activeRoom = get(this._activeRoomStore);
        if (activeRoom && get(activeRoom.isJoined)) {
            return activeRoom;
        }

        return this.resolveMostRecentJoinedRoom();
    }

    public getRoomById(roomId: string): ProximityChatRoom | undefined {
        if (roomId === "proximity") {
            return this.resolveTargetRoom();
        }

        if (!roomId.startsWith("proximity:")) {
            return undefined;
        }

        return this.rooms.get(roomId.substring("proximity:".length));
    }

    public getRoomByMeetingId(meetingId: string): ProximityChatRoom | undefined {
        const room = this.rooms.get(meetingId);
        if (room && get(room.isJoined)) {
            return room;
        }

        for (const room of this.rooms.values()) {
            if (get(room.isJoined) && room.getCurrentSpaceName() === meetingId) {
                return room;
            }
        }

        return undefined;
    }

    public getDefaultRoom(): ProximityChatRoom | undefined {
        return this.rooms.get(DEFAULT_PROXIMITY_SPACE_NAME);
    }

    public selectRoom(room: ProximityChatRoom): void {
        this._activeRoomStore.set(room);
    }

    public dismissEnteredZoneRoom(): void {
        this._enteredZoneRoomStore.set(undefined);
    }

    public destroy(): void {
        for (const room of this.rooms.values()) {
            room.destroy();
        }
        this.rooms.clear();
        this.lastJoinedSpaceNames.length = 0;
        this.zoneEntryOrder.clear();
        this._activeRoomStore.set(undefined);
        this._enteredZoneRoomStore.set(undefined);
        this.syncRoomsStore();
    }

    private markAsLastJoined(spaceName: string): void {
        const index = this.lastJoinedSpaceNames.indexOf(spaceName);
        if (index !== -1) {
            this.lastJoinedSpaceNames.splice(index, 1);
        }
        this.lastJoinedSpaceNames.push(spaceName);
    }

    private resolveMostRecentJoinedRoom(): ProximityChatRoom | undefined {
        for (let i = this.lastJoinedSpaceNames.length - 1; i >= 0; i--) {
            const room = this.rooms.get(this.lastJoinedSpaceNames[i]);
            if (room && get(room.isJoined)) {
                return room;
            }
        }
        return undefined;
    }

    private syncRoomsStore(): void {
        const rooms = sortRoomsByZoneDepth(Array.from(this.rooms.values()), this.zoneEntryOrder);
        const zoneRooms = rooms.filter((room) => get(room.isJoined) && ZONE_ROOM_KINDS.has(get(room.kind)));
        this._roomsStore.set(rooms);
        this._deepestZoneRoomStore.set(zoneRooms[0]);
        this._parentZoneRoomsStore.set(zoneRooms.slice(1));
    }
}
