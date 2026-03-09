import type { AreaData } from "@workadventure/map-editor";
import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { LockableAreaManager } from "../src/Model/AreaPropertyEvents/LockableAreaManager";
import type { AreaZoneTracker, AreaZoneTrackerEvent } from "../src/Model/AreaZoneTracker";
import type { GameRoom } from "../src/Model/GameRoom";

function createArea(areaId: string): AreaData {
    const property: AreaData["properties"][number] = {
        id: `property-${areaId}`,
        type: "lockableAreaPropertyData",
        allowedTags: ["admin"],
    };

    return {
        id: areaId,
        name: `Area ${areaId}`,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        visible: true,
        properties: [property],
    };
}

function createHarness(): {
    enterSubject: Subject<AreaZoneTrackerEvent>;
    leaveSubject: Subject<AreaZoneTrackerEvent>;
    destroySubject: Subject<void>;
    setAreaPropertyVariable: ReturnType<typeof vi.fn>;
    getAreaPropertyVariable: ReturnType<typeof vi.fn>;
    registerEventListener: ReturnType<typeof vi.fn>;
    userWrite: ReturnType<typeof vi.fn>;
    socketEnd: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
    user: AreaZoneTrackerEvent["user"];
} {
    const enterSubject = new Subject<AreaZoneTrackerEvent>();
    const leaveSubject = new Subject<AreaZoneTrackerEvent>();
    const destroySubject = new Subject<void>();
    const areaPropertyVariables = new Map<string, string>();

    const registerEventListener = vi.fn((eventType: "enter" | "leave") => {
        return eventType === "enter" ? enterSubject.asObservable() : leaveSubject.asObservable();
    });
    const areaZoneTracker = {
        registerEventListener,
    } as unknown as AreaZoneTracker;

    const setAreaPropertyVariable = vi.fn((areaId: string, propertyId: string, key: string, value: string) => {
        areaPropertyVariables.set(`${areaId}:${propertyId}:${key}`, value);
    });
    const getAreaPropertyVariable = vi.fn((areaId: string, propertyId: string, key: string) => {
        return areaPropertyVariables.get(`${areaId}:${propertyId}:${key}`);
    });
    const leave = vi.fn();
    const gameRoom = {
        getAreaPropertyVariable,
        setAreaPropertyVariable,
        leave,
        destroyRoomStream: destroySubject.asObservable(),
    } as unknown as GameRoom;

    const userWrite = vi.fn();
    const socketEnd = vi.fn();
    const user = {
        write: userWrite,
        socket: {
            end: socketEnd,
        },
    } as unknown as AreaZoneTrackerEvent["user"];

    new LockableAreaManager(gameRoom, areaZoneTracker);

    return {
        enterSubject,
        leaveSubject,
        destroySubject,
        setAreaPropertyVariable,
        getAreaPropertyVariable,
        registerEventListener,
        userWrite,
        socketEnd,
        leave,
        user,
    };
}

function createEvent(area: AreaData, user: AreaZoneTrackerEvent["user"]): AreaZoneTrackerEvent {
    return {
        area,
        user,
    };
}

describe("LockableAreaManager", () => {
    it("disconnects users who enter a locked area with an error screen", () => {
        const { enterSubject, leave, setAreaPropertyVariable, userWrite, socketEnd } = createHarness();
        const area = createArea("area-1");

        setAreaPropertyVariable("area-1", "property-area-1", "lock", "true");
        enterSubject.next(
            createEvent(area, {
                write: userWrite,
                socket: {
                    end: socketEnd,
                },
            } as unknown as AreaZoneTrackerEvent["user"])
        );

        expect(userWrite).toHaveBeenCalledWith({
            $case: "errorScreenMessage",
            errorScreenMessage: {
                type: "error",
                code: "LOCKED_AREA_ACCESS_DENIED",
                title: "Access denied",
                subtitle: "This area is locked. You cannot enter.",
                details: "You were disconnected because you entered a locked area.",
                timeToRetry: undefined,
                canRetryManual: undefined,
                urlToRedirect: undefined,
                buttonTitle: undefined,
                image: undefined,
                imageLogo: undefined,
            },
        });
        expect(leave).toHaveBeenCalledTimes(1);
        expect(socketEnd).toHaveBeenCalledTimes(1);
    });

    it("unlocks the area when the last user leaves", () => {
        const { enterSubject, leaveSubject, setAreaPropertyVariable, user } = createHarness();
        const area = createArea("area-1");

        enterSubject.next(createEvent(area, user));
        leaveSubject.next(createEvent(area, user));

        expect(setAreaPropertyVariable).toHaveBeenNthCalledWith(1, "area-1", "property-area-1", "lock", "false");
    });

    it("does not disconnect users when the area is not locked", () => {
        const { enterSubject, userWrite, socketEnd, user } = createHarness();
        const area = createArea("area-1");

        enterSubject.next(createEvent(area, user));

        expect(userWrite).not.toHaveBeenCalled();
        expect(socketEnd).not.toHaveBeenCalled();
    });

    it("unsubscribes on room destroy", () => {
        const { destroySubject, enterSubject, leaveSubject, setAreaPropertyVariable, userWrite, socketEnd, user } =
            createHarness();
        const area = createArea("area-1");

        destroySubject.next();
        enterSubject.next(createEvent(area, user));
        leaveSubject.next(createEvent(area, user));

        expect(setAreaPropertyVariable).not.toHaveBeenCalled();
        expect(userWrite).not.toHaveBeenCalled();
        expect(socketEnd).not.toHaveBeenCalled();
    });
});
