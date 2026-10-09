import type { WhiteboardClientMessage, WhiteboardServerMessage } from "@workadventure/messages";
import type { AreaData } from "@workadventure/map-editor";
import type { GameRoom } from "../GameRoom";
import type { User } from "../User";
import { getWhiteboardRights } from "./WhiteboardRights";
import { parseWhiteboardElements, WhiteboardScene } from "./WhiteboardScene";
import type { WhiteboardElement } from "./WhiteboardScene";

type ServerPayload = NonNullable<WhiteboardServerMessage["message"]>;

interface Whiteboard {
    readonly areaId: string;
    readonly propertyId: string;
    readonly scene: WhiteboardScene;
    readonly participants: Map<number, Participant>;
}

interface Participant {
    readonly user: User;
    readonly canWrite: boolean;
}

/**
 * Holds the scene of every whiteboard of a room and relays the changes between the people who opened it.
 * A room always lives on a single back, so this in-memory state is the only copy.
 */
export class WhiteboardManager {
    private readonly boards = new Map<string, Whiteboard>();

    constructor(private readonly room: GameRoom) {
        // No need to unsubscribe since GameRoom.destroy completes these streams.
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        room.userLeaveStream.subscribe((user) => {
            for (const board of this.boards.values()) {
                this.removeParticipant(board, user);
            }
        });
        // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
        room.destroyRoomStream.subscribe(() => {
            this.boards.clear();
        });
    }

    public handleMessage(user: User, message: WhiteboardClientMessage): void {
        const payload = message.message;
        if (payload === undefined) {
            return;
        }
        if (payload.$case === "join") {
            this.join(user, message.areaId, message.propertyId);
            return;
        }
        if (payload.$case === "clear") {
            this.clear(user, message.areaId, message.propertyId);
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

    private join(user: User, areaId: string, propertyId: string): void {
        const area = this.findWhiteboardArea(areaId, propertyId);
        if (area === undefined) {
            console.warn(`User ${user.uuid} tried to join a whiteboard that does not exist: ${areaId}/${propertyId}`);
            return;
        }
        const { canRead, canWrite } = getWhiteboardRights(area, user.tags);
        if (!canRead) {
            console.warn(`User ${user.uuid} is not allowed to see the whiteboard ${areaId}/${propertyId}`);
            return;
        }

        const board = this.getOrCreateBoard(areaId, propertyId);
        board.participants.set(user.id, { user, canWrite });
        this.send(board, user, {
            $case: "scene",
            scene: { elementsJson: JSON.stringify(board.scene.getElements()), canWrite },
        });
        this.sendParticipants(board);
    }

    private clear(user: User, areaId: string, propertyId: string): void {
        if (!user.canEdit || this.findWhiteboardArea(areaId, propertyId) === undefined) {
            console.warn(`User ${user.uuid} is not allowed to clear the whiteboard ${areaId}/${propertyId}`);
            return;
        }
        const board = this.getOrCreateBoard(areaId, propertyId);
        const deleted = board.scene.clear();
        if (deleted.length > 0) {
            for (const participant of board.participants.values()) {
                this.send(board, participant.user, {
                    $case: "elements",
                    elements: { elementsJson: JSON.stringify(deleted) },
                });
            }
        }
    }

    private findWhiteboardArea(areaId: string, propertyId: string): AreaData | undefined {
        const area = this.room.getWam()?.areas.find((candidate) => candidate.id === areaId);
        const property = area?.properties.find((candidate) => candidate.id === propertyId);
        return property?.type === "whiteboard" ? area : undefined;
    }

    private getOrCreateBoard(areaId: string, propertyId: string): Whiteboard {
        const key = WhiteboardManager.key(areaId, propertyId);
        let board = this.boards.get(key);
        if (board === undefined) {
            board = { areaId, propertyId, scene: new WhiteboardScene(), participants: new Map() };
            this.boards.set(key, board);
        }
        return board;
    }

    private removeParticipant(board: Whiteboard, user: User): void {
        if (board.participants.delete(user.id)) {
            this.sendParticipants(board);
        }
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
