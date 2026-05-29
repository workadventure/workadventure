import { describe, expect, it, vi } from "vitest";
import type { PrivateEvent, SpaceUser } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../src/Model/Strategies/WebRTCCommunicationStrategy";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";

vi.mock("@workadventure/messages", () => ({
    FilterType: {
        ALL_USERS: 0,
        LIVE_STREAMING_USERS: 1,
        LIVE_STREAMING_USERS_WITH_FEEDBACK: 2,
    },
}));

const allUsersFilter = 0;
const feedbackFilter = 2;

function createUser(spaceUserId: string, role: "attendee" | "speaker" | "none"): SpaceUser {
    return {
        spaceUserId,
        uuid: `uuid-${spaceUserId}`,
        name: `User ${spaceUserId}`,
        playUri: "https://play.test",
        color: "",
        characterTextures: [],
        isLogged: false,
        availabilityStatus: 0,
        roomName: undefined,
        visitCardUrl: undefined,
        tags: [],
        cameraState: false,
        microphoneState: false,
        screenSharingState: false,
        attendeesState: role === "attendee",
        megaphoneState: role === "speaker",
        jitsiParticipantId: undefined,
        chatID: undefined,
        showVoiceIndicator: true,
    };
}

function createSpace(users: SpaceUser[], filterType = feedbackFilter) {
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
                .sort()
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
        const { space, privateEvents } = createSpace(attendees, allUsersFilter);
        const strategy = new WebRTCCommunicationStrategy(space, createUsersMap(attendees), createUsersMap(attendees));

        await strategy.initialize(createUsersMap(attendees), createUsersMap(attendees));

        expect(webRtcStartEvents(privateEvents)).toHaveLength(2);
    });
});
