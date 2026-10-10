import type { Observable } from "rxjs";
import * as Sentry from "@sentry/node";
import type { WhiteboardClientMessage, WhiteboardServerMessage, WhiteboardStorageKey } from "@workadventure/messages";
import type { AreaData, WAMFileFormat, WhiteboardPropertyData } from "@workadventure/map-editor";
import { getWhiteboardRights } from "@workadventure/map-editor";
import { registerDrainableService } from "@workadventure/shared-utils";
import type { User } from "../User";
import { parseWhiteboardElements, WhiteboardScene } from "./WhiteboardScene";
import type { WhiteboardElement } from "./WhiteboardScene";
import { mapStorageWhiteboardPersistence } from "./WhiteboardPersistence";
import type { WhiteboardPersistence } from "./WhiteboardPersistence";

// A busy board is written at most this often, and right away when the last person leaves it.
export const WHITEBOARD_SAVE_DELAY_MS = 10_000;
// An empty board stays in memory this long, so that somebody walking out and back in finds it at once.
// An ephemeral board is forgotten at the end of it.
export const WHITEBOARD_EVICT_DELAY_MS = 2 * 60_000;
// Deleted elements are kept (and synced) this long, so that an undo still works for the others.
const DELETED_ELEMENT_RETENTION_MS = 24 * 60 * 60_000;

/** The part of the room the whiteboards need. */
export interface WhiteboardRoom {
    readonly wamUrl: string | undefined;
    getWam(): WAMFileFormat | undefined;
    readonly userLeaveStream: Observable<User>;
    readonly destroyRoomStream: Observable<void>;
}

type ServerPayload = NonNullable<WhiteboardServerMessage["message"]>;

interface Whiteboard {
    readonly areaId: string;
    readonly propertyId: string;
    readonly ephemeral: boolean;
    readonly scene: WhiteboardScene;
    readonly participants: Map<number, Participant>;
    dirty: boolean;
    saveTimer?: ReturnType<typeof setTimeout>;
    evictTimer?: ReturnType<typeof setTimeout>;
}

interface Participant {
    readonly user: User;
    readonly canWrite: boolean;
}

const managers = new Set<WhiteboardManager>();

// A deploy restarts the back: whatever was drawn since the last save goes to the map-storage first.
registerDrainableService({
    name: "whiteboards",
    drain: async (timeoutMs) => {
        await Promise.race([
            Promise.all([...managers].map((manager) => manager.flush())),
            new Promise<void>((resolve) => {
                setTimeout(resolve, timeoutMs);
            }),
        ]);
    },
    stop: () => {
        for (const manager of managers) {
            manager.stopTimers();
        }
    },
});

/**
 * Holds the scene of every whiteboard of a room and relays the changes between the people who opened it.
 * A room always lives on a single back, so this in-memory state is the reference; the map-storage keeps a
 * copy of the boards that are not ephemeral between two sessions.
 */
export class WhiteboardManager {
    private readonly boards = new Map<string, Whiteboard>();
    private readonly loadingBoards = new Map<string, Promise<Whiteboard | undefined>>();

    constructor(
        private readonly room: WhiteboardRoom,
        private readonly persistence: WhiteboardPersistence = mapStorageWhiteboardPersistence,
    ) {
        managers.add(this);
        // No need to unsubscribe since GameRoom.destroy completes these streams.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        room.userLeaveStream.subscribe((user) => {
            for (const board of this.boards.values()) {
                this.removeParticipant(board, user);
            }
        });
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        room.destroyRoomStream.subscribe(() => {
            managers.delete(this);
            this.flush()
                .catch((e) => console.error("Could not save the whiteboards of a closing room", e))
                .finally(() => {
                    this.stopTimers();
                    this.boards.clear();
                });
        });
    }

    public async handleMessage(user: User, message: WhiteboardClientMessage): Promise<void> {
        const payload = message.message;
        if (payload === undefined) {
            return;
        }
        if (payload.$case === "join") {
            await this.join(user, message.areaId, message.propertyId);
            return;
        }
        if (payload.$case === "clear") {
            await this.clear(user, message.areaId, message.propertyId);
            return;
        }

        const board = this.boards.get(WhiteboardManager.key(message.areaId, message.propertyId));
        const participant = board?.participants.get(user.id);
        if (board === undefined || participant === undefined) {
            return;
        }

        switch (payload.$case) {
            case "leave": {
                this.removeParticipant(board, user);
                break;
            }
            case "elements": {
                if (!participant.canWrite) {
                    console.warn(`User ${user.uuid} tried to draw on a read-only whiteboard`);
                    return;
                }
                let elements: WhiteboardElement[];
                try {
                    elements = parseWhiteboardElements(payload.elements.elementsJson);
                } catch (e) {
                    // A bad payload must not cost the sender its connection: drop it and carry on.
                    console.warn(`Invalid whiteboard elements sent by user ${user.uuid}`, e);
                    return;
                }
                const { accepted, outdated } = board.scene.merge(elements);
                if (accepted.length > 0) {
                    this.markDirty(board);
                    this.broadcast(board, user, {
                        $case: "elements",
                        elements: { elementsJson: JSON.stringify(accepted) },
                    });
                }
                if (outdated.length > 0) {
                    this.send(board, user, { $case: "elements", elements: { elementsJson: JSON.stringify(outdated) } });
                }
                break;
            }
            case "pointer": {
                this.broadcast(board, user, {
                    $case: "pointer",
                    pointer: { userId: user.id, pointer: payload.pointer },
                });
                break;
            }
            default: {
                const _exhaustiveCheck: never = payload;
            }
        }
    }

    /** Writes every board changed since its last save. */
    public async flush(): Promise<void> {
        await Promise.all([...this.boards.values()].map((board) => this.save(board)));
    }

    public stopTimers(): void {
        for (const board of this.boards.values()) {
            clearTimeout(board.saveTimer);
            clearTimeout(board.evictTimer);
        }
    }

    private async join(user: User, areaId: string, propertyId: string): Promise<void> {
        const found = this.findWhiteboard(areaId, propertyId);
        if (found === undefined) {
            console.warn(`User ${user.uuid} tried to join a whiteboard that does not exist: ${areaId}/${propertyId}`);
            return;
        }
        const { canRead, canWrite } = getWhiteboardRights(found.area, user.tags);
        if (!canRead) {
            console.warn(`User ${user.uuid} is not allowed to see the whiteboard ${areaId}/${propertyId}`);
            return;
        }

        const board = await this.getBoard(areaId, propertyId, found.property.ephemeral === true);
        if (board === undefined || user.disconnected) {
            return;
        }
        clearTimeout(board.evictTimer);
        board.evictTimer = undefined;
        board.participants.set(user.id, { user, canWrite });
        this.send(board, user, {
            $case: "scene",
            scene: { elementsJson: JSON.stringify(board.scene.getElements()), canWrite },
        });
        this.sendParticipants(board);
    }

    private async clear(user: User, areaId: string, propertyId: string): Promise<void> {
        const found = this.findWhiteboard(areaId, propertyId);
        if (!user.canEdit || found === undefined) {
            console.warn(`User ${user.uuid} is not allowed to clear the whiteboard ${areaId}/${propertyId}`);
            return;
        }
        const board = await this.getBoard(areaId, propertyId, found.property.ephemeral === true);
        if (board === undefined) {
            return;
        }
        const deleted = board.scene.clear();
        if (deleted.length > 0) {
            this.markDirty(board);
            for (const participant of board.participants.values()) {
                this.send(board, participant.user, {
                    $case: "elements",
                    elements: { elementsJson: JSON.stringify(deleted) },
                });
            }
        }
        if (board.participants.size === 0) {
            await this.save(board);
            this.scheduleEviction(board);
        }
    }

    private findWhiteboard(
        areaId: string,
        propertyId: string,
    ): { area: AreaData; property: WhiteboardPropertyData } | undefined {
        const area = this.room.getWam()?.areas.find((candidate) => candidate.id === areaId);
        const property = area?.properties.find((candidate) => candidate.id === propertyId);
        return area !== undefined && property?.type === "whiteboard" ? { area, property } : undefined;
    }

    /**
     * The board in memory, loaded from the map-storage the first time. Undefined when it could not be loaded:
     * starting from an empty board would overwrite the stored one at the next save.
     */
    private getBoard(areaId: string, propertyId: string, ephemeral: boolean): Promise<Whiteboard | undefined> {
        const key = WhiteboardManager.key(areaId, propertyId);
        const board = this.boards.get(key);
        if (board !== undefined) {
            return Promise.resolve(board);
        }
        let loading = this.loadingBoards.get(key);
        if (loading === undefined) {
            // Cleared in a .finally so that it runs after the set below, even when loading needs no I/O.
            loading = this.loadBoard(areaId, propertyId, ephemeral).finally(() => this.loadingBoards.delete(key));
            this.loadingBoards.set(key, loading);
        }
        return loading;
    }

    private async loadBoard(areaId: string, propertyId: string, ephemeral: boolean): Promise<Whiteboard | undefined> {
        try {
            const storageKey = this.storageKey(areaId, propertyId);
            const elements = ephemeral || storageKey === undefined ? [] : await this.persistence.load(storageKey);
            const board: Whiteboard = {
                areaId,
                propertyId,
                ephemeral,
                scene: new WhiteboardScene(elements),
                participants: new Map(),
                dirty: false,
            };
            this.boards.set(WhiteboardManager.key(areaId, propertyId), board);
            return board;
        } catch (e) {
            console.error(`Could not load the whiteboard ${areaId}/${propertyId}`, e);
            Sentry.captureException(e);
            return undefined;
        }
    }

    private markDirty(board: Whiteboard): void {
        board.dirty = true;
        if (board.saveTimer === undefined) {
            board.saveTimer = setTimeout(() => {
                this.save(board).catch((e) => console.error("Could not save a whiteboard", e));
            }, WHITEBOARD_SAVE_DELAY_MS);
        }
    }

    private async save(board: Whiteboard): Promise<void> {
        clearTimeout(board.saveTimer);
        board.saveTimer = undefined;
        if (!board.dirty) {
            return;
        }
        board.dirty = false;
        const storageKey = this.storageKey(board.areaId, board.propertyId);
        // A board that became ephemeral, or whose property is gone, is not written back (the map-storage
        // deleted its file when the map was edited).
        const property = this.findWhiteboard(board.areaId, board.propertyId)?.property;
        if (board.ephemeral || storageKey === undefined || property === undefined || property.ephemeral === true) {
            return;
        }
        board.scene.pruneDeletedBefore(Date.now() - DELETED_ELEMENT_RETENTION_MS);
        try {
            await this.persistence.save(storageKey, board.scene.getElements());
        } catch (e) {
            console.error(`Could not save the whiteboard ${board.areaId}/${board.propertyId}`, e);
            Sentry.captureException(e);
            this.markDirty(board);
        }
    }

    private removeParticipant(board: Whiteboard, user: User): void {
        if (!board.participants.delete(user.id)) {
            return;
        }
        this.sendParticipants(board);
        if (board.participants.size === 0) {
            this.save(board).catch((e) => console.error("Could not save a whiteboard", e));
            this.scheduleEviction(board);
        }
    }

    private scheduleEviction(board: Whiteboard): void {
        clearTimeout(board.evictTimer);
        board.evictTimer = setTimeout(() => {
            if (board.participants.size > 0) {
                return;
            }
            this.save(board)
                .catch((e) => console.error("Could not save a whiteboard", e))
                .finally(() => {
                    if (board.participants.size === 0 && !board.dirty) {
                        this.boards.delete(WhiteboardManager.key(board.areaId, board.propertyId));
                    }
                });
        }, WHITEBOARD_EVICT_DELAY_MS);
    }

    private storageKey(areaId: string, propertyId: string): WhiteboardStorageKey | undefined {
        return this.room.wamUrl === undefined ? undefined : { wamUrl: this.room.wamUrl, areaId, propertyId };
    }

    private sendParticipants(board: Whiteboard): void {
        const participants = [...board.participants.values()].map(({ user }) => ({
            userId: user.id,
            name: user.name,
            uuid: user.uuid,
        }));
        for (const participant of board.participants.values()) {
            this.send(board, participant.user, { $case: "participants", participants: { participants } });
        }
    }

    private broadcast(board: Whiteboard, sender: User, payload: ServerPayload): void {
        for (const participant of board.participants.values()) {
            if (participant.user !== sender) {
                this.send(board, participant.user, payload);
            }
        }
    }

    private send(board: Whiteboard, user: User, payload: ServerPayload): void {
        user.emitInBatch({
            message: {
                $case: "whiteboardServerMessage",
                whiteboardServerMessage: { areaId: board.areaId, propertyId: board.propertyId, message: payload },
            },
        });
    }

    private static key(areaId: string, propertyId: string): string {
        return `${areaId}::${propertyId}`;
    }
}
