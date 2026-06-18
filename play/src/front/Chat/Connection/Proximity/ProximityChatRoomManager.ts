import { FilterType } from "@workadventure/messages";
import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import LL from "../../../../i18n/i18n-svelte";
import type { ProximityChatRoom } from "./ProximityChatRoom";

export const DEFAULT_PROXIMITY_SPACE_NAME = "proximity";

export type ProximityChatRoomKind = "default" | "proximity" | "meeting" | "listener" | "speaker" | "area";

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

    public readonly roomsStore: Readable<ProximityChatRoom[]> = this._roomsStore;
    public readonly activeRoomStore: Readable<ProximityChatRoom | undefined> = this._activeRoomStore;
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

    public async joinSpace(
        spaceName: string,
        displayName: string,
        propertiesToSync: string[],
        isMeetingRoomChat = false,
        filterType: FilterType = FilterType.ALL_USERS,
        disableChat = false,
        signal?: AbortSignal,
        kind: ProximityChatRoomKind = "area",
    ): Promise<ProximityChatRoom> {
        const room = this.getOrCreateRoom(spaceName, displayName, kind);
        await room.joinSpace(spaceName, propertiesToSync, isMeetingRoomChat, filterType, disableChat, signal);
        room.isJoined.set(true);
        this.markAsLastJoined(spaceName);
        this._activeRoomStore.set(room);
        this.syncRoomsStore();
        return room;
    }

    public async joinDefaultSpace(
        spaceName: string,
        propertiesToSync: string[],
        signal?: AbortSignal,
    ): Promise<ProximityChatRoom> {
        const room = this.getOrCreateRoom(DEFAULT_PROXIMITY_SPACE_NAME, get(LL).chat.proximity(), "default");
        await room.joinSpace(spaceName, propertiesToSync, false, FilterType.ALL_USERS, false, signal);
        room.isJoined.set(true);
        this.markAsLastJoined(DEFAULT_PROXIMITY_SPACE_NAME);
        this._activeRoomStore.set(room);
        this.syncRoomsStore();
        return room;
    }

    public async leaveDefaultSpace(spaceName: string): Promise<void> {
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
    }

    public async leaveSpace(spaceName: string, isMeetingRoomChat = false): Promise<void> {
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

        if (!get(room.hasUserMessages) && spaceName !== DEFAULT_PROXIMITY_SPACE_NAME) {
            room.destroy();
            this.rooms.delete(spaceName);
        }

        const activeRoom = get(this._activeRoomStore);
        if (activeRoom?.spaceName === spaceName) {
            this._activeRoomStore.set(this.resolveMostRecentJoinedRoom());
        }

        this.syncRoomsStore();
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

    public destroy(): void {
        for (const room of this.rooms.values()) {
            room.destroy();
        }
        this.rooms.clear();
        this.lastJoinedSpaceNames.length = 0;
        this._activeRoomStore.set(undefined);
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
        this._roomsStore.set(
            Array.from(this.rooms.values()).sort((roomA, roomB) => {
                if (roomA.spaceName === DEFAULT_PROXIMITY_SPACE_NAME) {
                    return -1;
                }
                if (roomB.spaceName === DEFAULT_PROXIMITY_SPACE_NAME) {
                    return 1;
                }
                return 0;
            }),
        );
    }
}
