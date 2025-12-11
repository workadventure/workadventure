import { RateLimiter } from "limiter";
import type { Room } from "matrix-js-sdk";
import type { IHierarchyRoom } from "matrix-js-sdk/lib/@types/spaces";

export class MatrixRateLimiter {
    private static instance: MatrixRateLimiter;
    private roomHierarchyLimiter: RateLimiter;

    private constructor() {
        // 5 requests per second
        this.roomHierarchyLimiter = new RateLimiter({
            tokensPerInterval: 5,
            interval: 1000, // per second
        });
    }

    public static getInstance(): MatrixRateLimiter {
        if (!MatrixRateLimiter.instance) {
            MatrixRateLimiter.instance = new MatrixRateLimiter();
        }
        return MatrixRateLimiter.instance;
    }

    public async getRoomHierarchy(room: Room, limit: number, maxDepth: number, suggestedOnly: boolean) {
        await this.roomHierarchyLimiter.removeTokens(1);
        return room.client.getRoomHierarchy(room.roomId, limit, maxDepth, suggestedOnly);
    }

    public async getAllHierarchies(room: Room): Promise<{
        suggested: { rooms: IHierarchyRoom[] };
        available: { rooms: IHierarchyRoom[] };
    }> {
        const [suggestedRooms, allAvailableRooms] = await Promise.all([
            this.getRoomHierarchy(room, 100, 1, true),
            this.getRoomHierarchy(room, 100, 1, false),
        ]);

        const suggestedRoomIds = new Set(suggestedRooms.rooms.map((room) => room.room_id));

        const filteredAvailableRooms = {
            ...allAvailableRooms,
            rooms: allAvailableRooms.rooms.filter((room) => !suggestedRoomIds.has(room.room_id)),
        };

        return {
            suggested: { rooms: suggestedRooms.rooms },
            available: { rooms: filteredAvailableRooms.rooms },
        };
    }
}

export const matrixRateLimiter = MatrixRateLimiter.getInstance();
