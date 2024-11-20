import { get, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { describe, expect, it } from "vitest";
import { UserProviderInterface } from "../UserProvider/UserProviderInterface";
import { PartialChatUser } from "../Connection/ChatConnection";
import { UserProviderMerger } from "./UserProviderMerger";

describe("UserProviderMerger", () => {
    it("should merge and sort users by room", () => {
        // Mock data
        const userProvider1: UserProviderInterface = {
            users: writable<PartialChatUser[]>([
                {
                    chatId: "1",
                    username: "Alice",
                    roomName: "Room1",
                    playUri: "playUri1",
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                },
                {
                    chatId: "2",
                    username: "Bob",
                    roomName: "Room2",
                    playUri: "playUri2",
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                },
                {
                    chatId: "5",
                    username: "Eve",
                    roomName: "Room1",
                    playUri: "playUri1",
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                },
            ]),
            setFilter: () => {
                return Promise.resolve();
            },
        };

        const userProvider2: UserProviderInterface = {
            users: writable<PartialChatUser[]>([
                { chatId: "2", username: "Charlie", isAdmin: true },
                { chatId: "3", username: "Charlie" },
                { chatId: "4", username: "Dave" },
            ]),
            setFilter: () => {
                return Promise.resolve();
            },
        };

        const userProviderMerger = new UserProviderMerger([userProvider1, userProvider2]);

        // Get the merged and sorted users by room
        const usersByRoom = get(userProviderMerger.usersByRoomStore);

        // Expected result
        expect(usersByRoom?.get("playUri1")?.roomName).toBe("Room1");

        expect(get(usersByRoom.get("playUri1")?.users[0].availabilityStatus || writable())).toBe(
            AvailabilityStatus.ONLINE
        );

        expect(usersByRoom?.get("playUri1")?.users[1].username).toBe("Eve");
        expect(usersByRoom?.get(undefined)?.users[0].username).toBe("Charlie");

        expect(get(usersByRoom.get(undefined)?.users[0].availabilityStatus || writable())).toBe(
            AvailabilityStatus.UNCHANGED
        );
    });
});
