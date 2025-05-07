import { describe, expect, it } from "vitest";
import { BackToPusherSpaceMessage, SpaceUser } from "@workadventure/messages";
import { mock } from "vitest-mock-extended";
import { Space } from "../src/Model/Space";
import { SpacesWatcher } from "../src/Model/SpacesWatcher";
import { SpaceSocket } from "../src/SpaceManager";

describe("Space", () => {
    const space = new Space("test");
    let eventsWatcher1: BackToPusherSpaceMessage[] = [];
    const spaceSocketToPusher1 = mock<SpaceSocket>({
        write(chunk: BackToPusherSpaceMessage): boolean {
            eventsWatcher1.push(chunk);
            return true;
        },
    });
    let eventsWatcher2: BackToPusherSpaceMessage[] = [];
    const spaceSocketToPusher2 = mock<SpaceSocket>({
        write(chunk: BackToPusherSpaceMessage): boolean {
            eventsWatcher2.push(chunk);
            return true;
        },
    });
    let eventsWatcher3: BackToPusherSpaceMessage[] = [];
    const spaceSocketToPusher3 = mock<SpaceSocket>({
        write(chunk: BackToPusherSpaceMessage): boolean {
            eventsWatcher3.push(chunk);
            return true;
        },
    });

    let watcher1: SpacesWatcher;

    it("should return true because Space is empty", () => {
        expect(space.canBeDeleted()).toBe(true);
    });
    it("should emit event ONLY to other watcher on addUser", () => {
        eventsWatcher1 = [];
        const watcher1_ = new SpacesWatcher("uuid-watcher-1", spaceSocketToPusher1);
        watcher1 = watcher1_;
        space.addWatcher(watcher1_);

        eventsWatcher2 = [];
        const watcher2 = new SpacesWatcher("uuid-watcher-2", spaceSocketToPusher2);
        space.addWatcher(watcher2);

        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo_1",
            uuid: "uuid-test",
            name: "test",
            playUri: "test",
            color: "#000000",
            roomName: "test",
            isLogged: false,
            availabilityStatus: 0,
            cameraState: false,
            microphoneState: false,
            megaphoneState: false,
            screenSharingState: false,
        });
        // Add user to space from watcher1
        space.addUser(watcher1, spaceUser);

        // Only watcher2 should have received the event
        expect(eventsWatcher1.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(false);
        expect(eventsWatcher2.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);

        space.removeWatcher(watcher2);
    });
    it("should emit addUserEvent to new watcher", () => {
        eventsWatcher3 = [];
        const watcher = new SpacesWatcher("uuid-watcher-3", spaceSocketToPusher3);
        space.addWatcher(watcher);

        // should have received the addUser event
        expect(eventsWatcher3.some((message) => message.message?.$case === "addSpaceUserMessage")).toBe(true);

        space.removeWatcher(watcher);
    });
    it("should emit updateUserEvent to other watchers", () => {
        eventsWatcher3 = [];
        const watcher3 = new SpacesWatcher("uuid-watcher-3", spaceSocketToPusher3);
        space.addWatcher(watcher3);

        const spaceUser: SpaceUser = SpaceUser.fromPartial({
            spaceUserId: "foo_1",
            uuid: "uuid-test",
            name: "test2",
            playUri: "test2",
            color: "#FFFFFF",
            roomName: "test2",
            isLogged: true,
            availabilityStatus: 1,
            cameraState: true,
            microphoneState: true,
            megaphoneState: true,
            screenSharingState: true,
            visitCardUrl: "test2",
        });

        space.updateUser(watcher1, spaceUser, [
            "uuid",
            "name",
            "playUri",
            "color",
            "roomName",
            "isLogged",
            "availabilityStatus",
            "cameraState",
            "microphoneState",
            "megaphoneState",
            "screenSharingState",
            "visitCardUrl",
        ]);

        // should have received the addUser event
        expect(eventsWatcher3.some((message) => message.message?.$case === "updateSpaceUserMessage")).toBe(true);
        const message = eventsWatcher3.find((message) => message.message?.$case === "updateSpaceUserMessage");
        expect(message).toBeDefined();
        const updateSpaceUserMessage = message?.message;
        expect(updateSpaceUserMessage).toBeDefined();
        if (message?.message?.$case === "updateSpaceUserMessage") {
            const user = message.message.updateSpaceUserMessage.user;
            expect(user?.name).toBe("test2");
            expect(user?.playUri).toBe("test2");
            expect(user?.color).toBe("#FFFFFF");
            expect(user?.roomName).toBe("test2");
            expect(user?.isLogged).toBe(true);
            expect(user?.availabilityStatus).toBe(1);
            expect(user?.cameraState).toBe(true);
            expect(user?.microphoneState).toBe(true);
            expect(user?.megaphoneState).toBe(true);
            expect(user?.screenSharingState).toBe(true);
            expect(user?.visitCardUrl).toBe("test2");
        }

        space.removeWatcher(watcher3);
    });
    it("should emit removeUserEvent to other watchers", () => {
        eventsWatcher3 = [];
        const watcher3 = new SpacesWatcher("uuid-watcher-3", spaceSocketToPusher3);
        space.addWatcher(watcher3);

        space.removeUser(watcher1, "foo_1");

        // should return false because Space is not empty
        expect(space.canBeDeleted()).toBe(false);

        // should have received the removeUser event
        expect(eventsWatcher3.some((message) => message.message?.$case === "removeSpaceUserMessage")).toBe(true);
        space.removeWatcher(watcher3);
    });
    it("should return true because Space is empty at the end (watcher1, watcher2 and watcher3 as removed)", () => {
        expect(space.canBeDeleted()).toBe(true);
    });
});
