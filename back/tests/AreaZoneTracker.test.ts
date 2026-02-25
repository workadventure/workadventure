import type { AreaData, WAMFileFormat } from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";
import { describe, expect, it } from "vitest";
import { Subject } from "rxjs";
import { AreaZoneTracker } from "../src/Model/AreaZoneTracker";
import type { GameRoom } from "../src/Model/GameRoom";
import { WamManager } from "../src/Model/Services/WamManager";

type TestPoint = { x: number; y: number; direction: string; moving: boolean };

function point(x: number, y: number): TestPoint {
    return { x, y, direction: "down", moving: false };
}

function lockableProperty(id = "lock-1"): AreaData["properties"][number] {
    return {
        id,
        type: "lockableAreaPropertyData",
        allowedTags: ["admin"],
    };
}

function silentProperty(id = "silent-1"): AreaData["properties"][number] {
    return {
        id,
        type: "silent",
    };
}

function areaWithProperties(properties: AreaData["properties"]): AreaData {
    return {
        id: "area-1",
        name: "Area 1",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        visible: true,
        properties,
    };
}

function createWam(areas: AreaData[]): WAMFileFormat {
    return {
        version: "1",
        mapUrl: "https://example.com/maps/test.tmj",
        entities: {},
        areas,
        entityCollections: [],
        settings: {},
    };
}

function createModifyAreaCommand(
    commandId: string,
    modifyAreaMessage: NonNullable<NonNullable<EditMapCommandMessage["editMapMessage"]>["message"]> extends infer T
        ? T extends { $case: "modifyAreaMessage"; modifyAreaMessage: infer M }
            ? M
            : never
        : never
): EditMapCommandMessage {
    return {
        id: commandId,
        editMapMessage: {
            message: {
                $case: "modifyAreaMessage",
                modifyAreaMessage,
            },
        },
    };
}

function createDeleteAreaCommand(commandId: string, areaId: string): EditMapCommandMessage {
    return {
        id: commandId,
        editMapMessage: {
            message: {
                $case: "deleteAreaMessage",
                deleteAreaMessage: { id: areaId },
            },
        },
    };
}

function createHarness(initialWam: WAMFileFormat): {
    tracker: AreaZoneTracker;
    wamManager: WamManager;
    userMoveSubject: Subject<{ user: { getPosition(): TestPoint }; oldPosition: TestPoint }>;
    userLeaveSubject: Subject<{ getPosition(): TestPoint }>;
    addUser: (user: { getPosition(): TestPoint }) => void;
} {
    const wamManager = new WamManager(initialWam);
    const userMoveSubject = new Subject<{ user: { getPosition(): TestPoint }; oldPosition: TestPoint }>();
    const userLeaveSubject = new Subject<{ getPosition(): TestPoint }>();
    const users = new Map<number, { getPosition(): TestPoint }>();
    let nextUserId = 1;

    const gameRoom = {
        userMoveStream: userMoveSubject.asObservable(),
        userLeaveStream: userLeaveSubject.asObservable(),
        getWamManager: () => wamManager,
        getUsers: () => users,
    } as unknown as GameRoom;

    return {
        tracker: new AreaZoneTracker(gameRoom),
        wamManager,
        userMoveSubject,
        userLeaveSubject,
        addUser: (user) => {
            users.set(nextUserId, user);
            nextUserId++;
        },
    };
}

function createUser(initialPosition: TestPoint): {
    user: { getPosition(): TestPoint };
    setPosition: (position: TestPoint) => void;
} {
    let currentPosition = initialPosition;
    return {
        user: {
            getPosition: () => currentPosition,
        },
        setPosition: (position: TestPoint) => {
            currentPosition = position;
        },
    };
}

describe("AreaZoneTracker", () => {
    it("emits enter and leave events for initially tracked areas", () => {
        const { tracker, userMoveSubject } = createHarness(createWam([areaWithProperties([lockableProperty()])]));

        const enterEvents: AreaData[] = [];
        const leaveEvents: AreaData[] = [];

        const enterSubscription = tracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => enterEvents.push(area));
        const leaveSubscription = tracker
            .registerEventListener("leave", "lockableAreaPropertyData")
            .subscribe((area) => leaveEvents.push(area));

        const { user, setPosition } = createUser(point(-5, -5));

        setPosition(point(5, 5));
        userMoveSubject.next({ user, oldPosition: point(-5, -5) });
        expect(enterEvents).toHaveLength(1);
        expect(enterEvents[0]?.id).toBe("area-1");

        setPosition(point(30, 30));
        userMoveSubject.next({ user, oldPosition: point(5, 5) });
        expect(leaveEvents).toHaveLength(1);
        expect(leaveEvents[0]?.id).toBe("area-1");

        enterSubscription.unsubscribe();
        leaveSubscription.unsubscribe();
    });

    it("emits one event per tracked property type in the same area", () => {
        const { tracker, userMoveSubject } = createHarness(
            createWam([areaWithProperties([lockableProperty(), silentProperty()])])
        );

        const lockableEvents: AreaData[] = [];
        const silentEvents: AreaData[] = [];

        const lockableSubscription = tracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => lockableEvents.push(area));
        const silentSubscription = tracker
            .registerEventListener("enter", "silent")
            .subscribe((area) => silentEvents.push(area));

        const { user, setPosition } = createUser(point(-5, -5));
        setPosition(point(5, 5));
        userMoveSubject.next({ user, oldPosition: point(-5, -5) });

        expect(lockableEvents).toHaveLength(1);
        expect(silentEvents).toHaveLength(1);
        expect(lockableEvents[0]?.id).toBe("area-1");
        expect(silentEvents[0]?.id).toBe("area-1");

        lockableSubscription.unsubscribe();
        silentSubscription.unsubscribe();
    });

    it("reacts to geometry updates from WamManager", async () => {
        const { tracker, wamManager, userMoveSubject } = createHarness(
            createWam([areaWithProperties([lockableProperty()])])
        );
        const enterEvents: AreaData[] = [];
        const enterSubscription = tracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => enterEvents.push(area));

        const { user, setPosition } = createUser(point(-5, -5));
        setPosition(point(25, 25));
        userMoveSubject.next({ user, oldPosition: point(-5, -5) });
        expect(enterEvents).toHaveLength(0);

        await wamManager.applyCommand(
            createModifyAreaCommand("cmd-move-area", {
                id: "area-1",
                x: 20,
                y: 20,
                properties: [],
                modifyProperties: false,
            })
        );

        setPosition(point(25, 25));
        userMoveSubject.next({ user, oldPosition: point(-5, -5) });
        expect(enterEvents).toHaveLength(1);
        expect(enterEvents[0]?.x).toBe(20);
        expect(enterEvents[0]?.y).toBe(20);

        enterSubscription.unsubscribe();
    });

    it("emits enter and leave events for users already in the room when area geometry changes", async () => {
        const { tracker, wamManager, addUser } = createHarness(createWam([areaWithProperties([lockableProperty()])]));
        const enterEvents: AreaData[] = [];
        const leaveEvents: AreaData[] = [];

        const enterSubscription = tracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => enterEvents.push(area));
        const leaveSubscription = tracker
            .registerEventListener("leave", "lockableAreaPropertyData")
            .subscribe((area) => leaveEvents.push(area));

        const { user: enteringUser } = createUser(point(25, 25));
        const { user: leavingUser } = createUser(point(5, 5));
        const { user: untouchedUser } = createUser(point(60, 60));
        addUser(enteringUser);
        addUser(leavingUser);
        addUser(untouchedUser);

        await wamManager.applyCommand(
            createModifyAreaCommand("cmd-move-area-with-users", {
                id: "area-1",
                x: 20,
                y: 20,
                properties: [],
                modifyProperties: false,
            })
        );

        expect(enterEvents).toHaveLength(1);
        expect(leaveEvents).toHaveLength(1);
        expect(enterEvents[0]?.id).toBe("area-1");
        expect(leaveEvents[0]?.id).toBe("area-1");

        enterSubscription.unsubscribe();
        leaveSubscription.unsubscribe();
    });

    it("stops listening when tracked property type is removed", async () => {
        const { tracker, wamManager, userMoveSubject } = createHarness(
            createWam([areaWithProperties([lockableProperty()])])
        );
        const enterEvents: AreaData[] = [];
        const enterSubscription = tracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => enterEvents.push(area));

        await wamManager.applyCommand(
            createModifyAreaCommand("cmd-remove-lockable", {
                id: "area-1",
                properties: [silentProperty()],
                modifyProperties: true,
            })
        );

        const { user, setPosition } = createUser(point(-5, -5));
        setPosition(point(5, 5));
        userMoveSubject.next({ user, oldPosition: point(-5, -5) });

        expect(enterEvents).toHaveLength(0);
        enterSubscription.unsubscribe();
    });

    it("stops listening when area is deleted", async () => {
        const { tracker, wamManager, userMoveSubject } = createHarness(
            createWam([areaWithProperties([lockableProperty()])])
        );
        const enterEvents: AreaData[] = [];
        const enterSubscription = tracker
            .registerEventListener("enter", "lockableAreaPropertyData")
            .subscribe((area) => enterEvents.push(area));

        await wamManager.applyCommand(createDeleteAreaCommand("cmd-delete-area", "area-1"));

        const { user, setPosition } = createUser(point(-5, -5));
        setPosition(point(5, 5));
        userMoveSubject.next({ user, oldPosition: point(-5, -5) });

        expect(enterEvents).toHaveLength(0);
        enterSubscription.unsubscribe();
    });
});
