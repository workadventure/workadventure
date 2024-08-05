import { get, writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { UserProviderMerger } from "./UserProviderMerger";
import { UserProvideInterface } from "./UserProvideInterface";
import { PartialChatUser } from "./Connection/ChatConnection";

describe("UserProviderMerger", () => {
    it("should merge and sort users by room", () => {
        // Mock data
        const userProvider1: UserProvideInterface = {
            users: writable<PartialChatUser[]>([
                {
                    id: "1",
                    username: "Alice",
                    roomName: "Room1",
                    playUri: "playUri1",
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                },
                {
                    id: "2",
                    username: "Bob",
                    roomName: "Room2",
                    playUri: "playUri2",
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                },
                {
                    id: "5",
                    username: "Eve",
                    roomName: "Room1",
                    playUri: "playUri1",
                    availabilityStatus: writable(AvailabilityStatus.ONLINE),
                },
            ]),
        };

        const userProvider2: UserProvideInterface = {
            users: writable<PartialChatUser[]>([
                { id: "2", username: "Charlie", isAdmin: true },
                { id: "3", username: "Charlie" },
                { id: "4", username: "Dave" },
            ]),
        };

        const userProviderMerger = new UserProviderMerger([userProvider1, userProvider2]);

        // Get the merged and sorted users by room
        const usersByRoom = get(userProviderMerger.usersByRoomStore);

        // Expected result
        expect(usersByRoom.get("playUri1").roomName).toBe("Room1");
        expect(get(usersByRoom.get("playUri1").users[0].availabilityStatus)).toBe(AvailabilityStatus.ONLINE);
        expect(usersByRoom.get("playUri1").users[1].username).toBe("Eve");
        expect(usersByRoom.get(undefined).users[0].username).toBe("Charlie");
        expect(get(usersByRoom.get(undefined).users[0].availabilityStatus)).toBe(AvailabilityStatus.OFFLINE);
    });
});
