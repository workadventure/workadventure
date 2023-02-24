import { describe, expect, it } from "vitest";
import { Space } from "../src/Model/Space";
import { SpacesWatcher } from "../src/Model/SpacesWatcher";
import { SpaceSocketMock } from "./utils/SpaceSocketMock";
import { BackToPusherSpaceMessage, PartialSpaceUser, SpaceUser } from "../src/Messages/generated/messages_pb";
import { BoolValue, Int32Value, StringValue } from "google-protobuf/google/protobuf/wrappers_pb";

describe("Space", () => {
    const space = new Space("test");
    const spaceSocketToPusher1 = new SpaceSocketMock();
    const spaceSocketToPusher2 = new SpaceSocketMock();
    const spaceSocketToPusher3 = new SpaceSocketMock();

    let watcher1: SpacesWatcher;

    it("should return true because Space is empty", () => {
        expect(space.canBeDeleted()).toBe(true);
    });
    it("should emit event ONLY to other watcher on addUser", () => {
        const eventsWatcher1: BackToPusherSpaceMessage[] = [];
        spaceSocketToPusher1.on("write", (message) => eventsWatcher1.push(message));
        const watcher1_ = new SpacesWatcher("uuid-watcher-1", spaceSocketToPusher1);
        watcher1 = watcher1_;
        space.addWatcher(watcher1_);

        const eventsWatcher2: BackToPusherSpaceMessage[] = [];
        spaceSocketToPusher2.on("write", (message) => eventsWatcher2.push(message));
        const watcher2 = new SpacesWatcher("uuid-watcher-2", spaceSocketToPusher2);
        space.addWatcher(watcher2);

        const spaceUser: SpaceUser = new SpaceUser();
        spaceUser.setUuid("uuid-test");
        spaceUser.setName("test");
        spaceUser.setPlayuri("test");
        spaceUser.setColor("#000000");
        spaceUser.setRoomname(new StringValue().setValue("test"));
        spaceUser.setIslogged(false);
        spaceUser.setAvailabilitystatus(0);
        spaceUser.setVideosharing(false);
        spaceUser.setAudiosharing(false);
        spaceUser.setScreensharing(false);
        // Add user to space from watcher1
        space.addUser(watcher1, spaceUser);

        // Only watcher2 should have received the event
        expect(eventsWatcher1.some((message) => message.hasAddspaceusermessage())).toBe(false);
        expect(eventsWatcher2.some((message) => message.hasAddspaceusermessage())).toBe(true);

        space.removeWatcher(watcher2);
    });
    it("should emit addUserEvent to new watcher", () => {
        const eventsWatcher: BackToPusherSpaceMessage[] = [];
        spaceSocketToPusher3.on("write", (message) => eventsWatcher.push(message));
        const watcher = new SpacesWatcher("uuid-watcher-3", spaceSocketToPusher3);
        space.addWatcher(watcher);

        // should have received the addUser event
        expect(eventsWatcher.some((message) => message.hasAddspaceusermessage())).toBe(true);

        space.removeWatcher(watcher);
    });
    it("should emit updateUserEvent to other watchers", () => {
        const eventsWatcher3: BackToPusherSpaceMessage[] = [];
        spaceSocketToPusher3.on("write", (message) => eventsWatcher3.push(message));
        const watcher3 = new SpacesWatcher("uuid-watcher-3", spaceSocketToPusher3);
        space.addWatcher(watcher3);

        const spaceUser: PartialSpaceUser = new PartialSpaceUser();
        spaceUser.setUuid("uuid-test");
        spaceUser.setName(new StringValue().setValue("test2"));
        spaceUser.setPlayuri(new StringValue().setValue("test2"));
        spaceUser.setColor(new StringValue().setValue("#FFFFFF"));
        spaceUser.setRoomname(new StringValue().setValue("test2"));
        spaceUser.setIslogged(new BoolValue().setValue(true));
        spaceUser.setAvailabilitystatus(new Int32Value().setValue(1));
        spaceUser.setVideosharing(new BoolValue().setValue(true));
        spaceUser.setAudiosharing(new BoolValue().setValue(true));
        spaceUser.setScreensharing(new BoolValue().setValue(true));
        spaceUser.setVisitcardurl(new StringValue().setValue("test2"));
        space.updateUser(watcher1, spaceUser);

        // should have received the addUser event
        expect(eventsWatcher3.some((message) => message.hasUpdatespaceusermessage())).toBe(true);
        const message = eventsWatcher3.find((message) => message.hasUpdatespaceusermessage());
        expect(message).toBeDefined();
        const updateSpaceUserMessage = message?.getUpdatespaceusermessage();
        expect(updateSpaceUserMessage).toBeDefined();
        const user = updateSpaceUserMessage?.getUser();
        expect(user?.getName()?.getValue()).toBe("test2");
        expect(user?.getPlayuri()?.getValue()).toBe("test2");
        expect(user?.getColor()?.getValue()).toBe("#FFFFFF");
        expect(user?.getRoomname()?.getValue()).toBe("test2");
        expect(user?.getIslogged()?.getValue()).toBe(true);
        expect(user?.getAvailabilitystatus()?.getValue()).toBe(1);
        expect(user?.getVideosharing()?.getValue()).toBe(true);
        expect(user?.getAudiosharing()?.getValue()).toBe(true);
        expect(user?.getScreensharing()?.getValue()).toBe(true);

        space.removeWatcher(watcher3);
    });
    it("should emit removeUserEvent to other watchers", () => {
        const eventsWatcher3: BackToPusherSpaceMessage[] = [];
        spaceSocketToPusher3.on("write", (message) => eventsWatcher3.push(message));
        const watcher3 = new SpacesWatcher("uuid-watcher-3", spaceSocketToPusher3);
        space.addWatcher(watcher3);

        space.removeUser(watcher1, "uuid-test");

        // should have received the removeUser event
        expect(eventsWatcher3.some((message) => message.hasRemovespaceusermessage())).toBe(true);
        space.removeWatcher(watcher3);
    });
    it("should return false because Space is not empty", () => {
        expect(space.canBeDeleted()).toBe(false);
    });
});
