import type { WhiteboardClientMessage, WhiteboardServerMessage } from "@workadventure/messages";
import type { GameRoom } from "../GameRoom";
import type { User } from "../User";
import { parseWhiteboardElements, WhiteboardScene } from "./WhiteboardScene";
import type { WhiteboardElement } from "./WhiteboardScene";

type ServerPayload = NonNullable<WhiteboardServerMessage["message"]>;

interface Whiteboard {
    readonly areaId: string;
    readonly propertyId: string;
    readonly scene: WhiteboardScene;
    readonly participants: Map<number, User>;
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

    public async handleMessage(user: User, message: WhiteboardClientMessage): Promise<void> {
        const payload = message.message;
        if (payload === undefined) {
            return;
        }
        if (payload.$case === "join") {
            await this.join(user, message.areaId, message.propertyId);
            return;
        }

        const board = this.boards.get(WhiteboardManager.key(message.areaId, message.propertyId));
        if (board === undefined || !board.participants.has(user.id)) {
            return;
        }

        switch (payload.$case) {
            case "leave": {
                this.removeParticipant(board, user);
                break;
            }
            case "elements": {
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

    private async join(user: User, areaId: string, propertyId: string): Promise<void> {
        const property = await this.room.getAreaProperty(areaId, propertyId);
        if (property?.type !== "whiteboard") {
            console.warn(`User ${user.uuid} tried to join a whiteboard that does not exist: ${areaId}/${propertyId}`);
            return;
        }

        const key = WhiteboardManager.key(areaId, propertyId);
        let board = this.boards.get(key);
        if (board === undefined) {
            board = { areaId, propertyId, scene: new WhiteboardScene(), participants: new Map() };
            this.boards.set(key, board);
        }

        board.participants.set(user.id, user);
        this.send(board, user, {
            $case: "scene",
            scene: { elementsJson: JSON.stringify(board.scene.getElements()), canWrite: true },
        });
        this.sendParticipants(board);
    }

    private removeParticipant(board: Whiteboard, user: User): void {
        if (board.participants.delete(user.id)) {
            this.sendParticipants(board);
        }
    }

    private sendParticipants(board: Whiteboard): void {
        const participants = [...board.participants.values()].map((participant) => ({
            userId: participant.id,
            name: participant.name,
            uuid: participant.uuid,
        }));
        for (const participant of board.participants.values()) {
            this.send(board, participant, { $case: "participants", participants: { participants } });
        }
    }

    private broadcast(board: Whiteboard, sender: User, payload: ServerPayload): void {
        for (const participant of board.participants.values()) {
            if (participant !== sender) {
                this.send(board, participant, payload);
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
