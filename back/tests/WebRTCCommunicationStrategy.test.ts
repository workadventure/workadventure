import { describe, expect, it, vi } from "vitest";
import { FilterType, SpaceUser, type PrivateEvent } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../src/Model/Strategies/WebRTCCommunicationStrategy";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";

function createUser(spaceUserId: string, role: "attendee" | "speaker" | "none"): SpaceUser {
    return SpaceUser.fromPartial({
        spaceUserId,
        uuid: `uuid-${spaceUserId}`,
        name: `User ${spaceUserId}`,
        playUri: "https://play.test",
        attendeesState: role === "attendee",
        megaphoneState: role === "speaker",
        showVoiceIndicator: true,
    });
}

function createSpace(
    users: SpaceUser[],
    filterType: Exclude<FilterType, FilterType.UNRECOGNIZED> = FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK,
) {
    const privateEvents: PrivateEvent[] = [];
    const space: ICommunicationSpace = {
        filterType,
        getAllUsers: () => users,
        getUsersInFilter: () => users,
        getUsersToNotify: () => [],
        getRecordingState: () => ({ isRecording: false, recorder: null, status: "idle" }),
        dispatchPrivateEvent: (event: PrivateEvent) => {
            privateEvents.push(event);
        },
        dispatchPublicEvent: vi.fn().mockResolvedValue(undefined),
        getSpaceName: () => "test-space",
        getPropertiesToSync: () => ["cameraState", "microphoneState"],
        publishMetadata: vi.fn(),
        stopRecordingByServer: vi.fn().mockResolvedValue(undefined),
        getUser: (spaceUserId: string) => users.find((user) => user.spaceUserId === spaceUserId),
    };

    return {
        privateEvents,
        space,
    };
}

function createUsersMap(users: SpaceUser[]): ReadonlyMap<string, SpaceUser> {
    return new Map(users.map((user) => [user.spaceUserId, user]));
}

function webRtcStartEvents(events: PrivateEvent[]): PrivateEvent[] {
    return events.filter((event) => event.spaceEvent?.event?.$case === "webRtcStartMessage");
}

function webRtcDisconnectEvents(events: PrivateEvent[]): PrivateEvent[] {
    return events.filter((event) => event.spaceEvent?.event?.$case === "webRtcDisconnectMessage");
}

function hasWebRtcDisconnectBetween(events: PrivateEvent[], userId1: string, userId2: string): boolean {
    return webRtcDisconnectEvents(events).some(
        (event) =>
            (event.senderUserId === userId1 && event.receiverUserId === userId2) ||
            (event.senderUserId === userId2 && event.receiverUserId === userId1),
    );
}

describe("WebRTCCommunicationStrategy", () => {
    it("should not start WebRTC when both feedback users are attendees", async () => {
        const attendees = [createUser("attendee-1", "attendee"), createUser("attendee-2", "attendee")];
        const { space, privateEvents } = createSpace(attendees);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(attendees), createUsersMap(attendees));

        await strategy.initialize(createUsersMap(attendees), createUsersMap(attendees));

        expect(webRtcStartEvents(privateEvents)).toHaveLength(0);
    });

    it("should start WebRTC when a feedback speaker connects with an attendee", async () => {
        const users = [createUser("speaker", "speaker"), createUser("attendee", "attendee")];
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(users), createUsersMap(users));

        await strategy.initialize(createUsersMap(users), createUsersMap(users));

        expect(webRtcStartEvents(privateEvents)).toHaveLength(2);
        expect(
            webRtcStartEvents(privateEvents)
                .map((event) => event.receiverUserId)
                .sort(),
        ).toEqual(["attendee", "speaker"]);
    });

    it("should start WebRTC when two feedback speakers connect", async () => {
        const users = [createUser("speaker-1", "speaker"), createUser("speaker-2", "speaker")];
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(users), createUsersMap(users));

        await strategy.initialize(createUsersMap(users), createUsersMap(users));

        expect(webRtcStartEvents(privateEvents)).toHaveLength(2);
    });

    it("should not start WebRTC when a feedback user has no streaming role", async () => {
        const users = [createUser("speaker", "speaker"), createUser("none", "none")];
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(users), createUsersMap(users));

        await strategy.initialize(createUsersMap(users), createUsersMap(users));

        expect(webRtcStartEvents(privateEvents)).toHaveLength(0);
    });

    it("should use the active user role when a watcher copy is stale", async () => {
        const speaker = createUser("speaker", "speaker");
        const activeListener = createUser("listener", "attendee");
        const staleListenerWatcherCopy = createUser("listener", "none");
        const users = [speaker, activeListener];
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(users), new Map());

        await strategy.addUserToNotify(staleListenerWatcherCopy);

        expect(webRtcStartEvents(privateEvents)).toHaveLength(2);
        expect(
            webRtcStartEvents(privateEvents)
                .map((event) => event.receiverUserId)
                .sort(),
        ).toEqual(["listener", "speaker"]);
    });

    it("should create missing WebRTC connections when an attendee becomes a speaker", async () => {
        const speaker = createUser("speaker", "attendee");
        const changingUser = createUser("changing-user", "attendee");
        const users = [speaker, changingUser];
        const usersMap = createUsersMap(users);
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, usersMap, usersMap);

        await strategy.initialize(usersMap, usersMap);
        privateEvents.length = 0;
        changingUser.megaphoneState = true;
        changingUser.attendeesState = false;

        strategy.updateUser(changingUser);

        expect(webRtcStartEvents(privateEvents)).toHaveLength(2);
    });

    it("should close invalid WebRTC connections when a speaker becomes an attendee", async () => {
        const attendee = createUser("attendee", "attendee");
        const changingUser = createUser("changing-user", "speaker");
        const users = [attendee, changingUser];
        const usersMap = createUsersMap(users);
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, usersMap, usersMap);

        await strategy.initialize(usersMap, usersMap);
        privateEvents.length = 0;
        changingUser.megaphoneState = false;
        changingUser.attendeesState = true;

        strategy.updateUser(changingUser);

        expect(webRtcDisconnectEvents(privateEvents)).toHaveLength(2);
    });

    it("should close invalid WebRTC connections instead of restarting them", async () => {
        const attendee = createUser("attendee", "attendee");
        const changingUser = createUser("changing-user", "speaker");
        const users = [attendee, changingUser];
        const usersMap = createUsersMap(users);
        const { space, privateEvents } = createSpace(users);
        const strategy = new WebRTCCommunicationStrategy(space, usersMap, usersMap);

        await strategy.initialize(usersMap, usersMap);
        privateEvents.length = 0;
        changingUser.megaphoneState = false;
        changingUser.attendeesState = true;
        strategy.handleMeetingConnectionRestartMessage({ userId: attendee.spaceUserId }, changingUser.spaceUserId);

        expect(webRtcStartEvents(privateEvents)).toHaveLength(0);
        expect(webRtcDisconnectEvents(privateEvents)).toHaveLength(2);
    });

    it("should keep existing WebRTC behavior outside feedback live streaming", async () => {
        const attendees = [createUser("attendee-1", "attendee"), createUser("attendee-2", "attendee")];
        const { space, privateEvents } = createSpace(attendees, FilterType.ALL_USERS);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(attendees), createUsersMap(attendees));

        await strategy.initialize(createUsersMap(attendees), createUsersMap(attendees));

        expect(webRtcStartEvents(privateEvents)).toHaveLength(2);
    });

    it("should close the P2P connection when a watching attendee loses their role", async () => {
        const speaker = createUser("speaker", "speaker");
        const attendee = createUser("attendee", "attendee");
        const users = new Map<string, SpaceUser>([speaker, attendee].map((user) => [user.spaceUserId, user]));
        const usersToNotify = new Map<string, SpaceUser>([speaker, attendee].map((user) => [user.spaceUserId, user]));
        const { space, privateEvents } = createSpace([speaker, attendee]);
        const strategy = new WebRTCCommunicationStrategy(space, users, usersToNotify);

        await strategy.initialize(users, usersToNotify);
        privateEvents.length = 0;

        // The attendee loses their role while still watching the space. In the real flow the registry
        // removes them from the filtered `users` set before deleteUser runs.
        attendee.attendeesState = false;
        users.delete(attendee.spaceUserId);
        strategy.deleteUser(attendee);

        expect(hasWebRtcDisconnectBetween(privateEvents, "speaker", "attendee")).toBe(true);
    });

    it("should not touch the topology on update outside the feedback filter", () => {
        const user1 = createUser("user-1", "none");
        const user2 = createUser("user-2", "none");
        const { space, privateEvents } = createSpace([user1, user2], FilterType.ALL_USERS);
        // Outside feedback, connections are driven only by add/delete: an update must be a no-op.
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap([user1, user2]), new Map());

        strategy.updateUser(user1);

        expect(webRtcStartEvents(privateEvents)).toHaveLength(0);
    });

    it("should not connect two feedback users that are not watching on update", () => {
        const speaker = createUser("speaker", "speaker");
        const attendee = createUser("attendee", "attendee");
        const { space, privateEvents } = createSpace([speaker, attendee]);
        // Both are in the filter but nobody is watching yet (empty usersToNotify), so no P2P pair
        // exists in the connection matrix.
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap([speaker, attendee]), new Map());

        strategy.updateUser(speaker);

        expect(webRtcStartEvents(privateEvents)).toHaveLength(0);
    });
});
