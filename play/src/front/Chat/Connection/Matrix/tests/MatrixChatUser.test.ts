import { describe, expect, test, vi } from "vitest";
import { MatrixEvent, Room } from "matrix-js-sdk";
import { MatrixChatRoom } from "../MatrixChatRoom";
import modifiedReplyEvents from "./sample/ModifiedReplyEvents.json";

describe("MatrixChatUser", () => {
    test("Replay matrix room message events", () => {
        const matrixRoomEvents = modifiedReplyEvents.map((event) => new MatrixEvent(event));
        const mockedMatrixRoom: Partial<Room> = {
            // @ts-ignore
            getLiveTimeline: () => ({
                getEvents: vi.fn().mockReturnValue(matrixRoomEvents),
            }),
        };
        const replayedMatrixRoomEvents = MatrixChatRoom.replayMatrixRoomMessageEvents(mockedMatrixRoom as Room);
        expect(replayedMatrixRoomEvents).toHaveLength(1);

        const quotedMessage = {
            "m.relates_to": {
                "m.in_reply_to": {
                    event_id: "$MLpR9oVBnRBb6VGBJqU3xDYl0jc083KnGiTLHPz0zDo",
                },
            },
        };
        expect(replayedMatrixRoomEvents[0].getContent()["m.relates_to"]).toEqual(quotedMessage["m.relates_to"]);
    });
});
