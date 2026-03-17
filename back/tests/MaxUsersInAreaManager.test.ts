import type { AreaData } from "@workadventure/map-editor";
import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { AreaZoneTracker } from "../src/Model/AreaZoneTracker";
import type { GameRoom } from "../src/Model/GameRoom";
import { MaxUsersInAreaManager } from "../src/Model/AreaPropertyEvents/MaxUsersInAreaManager";

function createArea(areaId: string, maxUsers: number | null | undefined): AreaData {
    const property: AreaData["properties"][number] = {
        id: `property-${areaId}`,
        type: "maxUsersInAreaPropertyData",
        maxUsers,
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
    enterSubject: Subject<AreaData>;
    leaveSubject: Subject<AreaData>;
    destroySubject: Subject<void>;
    setAreaPropertyVariable: ReturnType<typeof vi.fn>;
    getAreaPropertyVariable: ReturnType<typeof vi.fn>;
    registerEventListener: ReturnType<typeof vi.fn>;
} {
    const enterSubject = new Subject<AreaData>();
    const leaveSubject = new Subject<AreaData>();
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
    const gameRoom = {
        getAreaPropertyVariable,
        setAreaPropertyVariable,
        destroyRoomStream: destroySubject.asObservable(),
    } as unknown as GameRoom;

    new MaxUsersInAreaManager(gameRoom, areaZoneTracker);

    return {
        enterSubject,
        leaveSubject,
        destroySubject,
        setAreaPropertyVariable,
        getAreaPropertyVariable,
        registerEventListener,
    };
}

describe("MaxUsersInAreaManager", () => {
    it("sets maxUsersReached to true at max and false at max minus one", () => {
        const { enterSubject, leaveSubject, setAreaPropertyVariable } = createHarness();
        const area = createArea("area-1", 2);

        enterSubject.next(area);
        expect(setAreaPropertyVariable).not.toHaveBeenCalled();

        enterSubject.next(area);
        expect(setAreaPropertyVariable).toHaveBeenNthCalledWith(
            1,
            "area-1",
            "property-area-1",
            "maxUsersReached",
            "true"
        );

        leaveSubject.next(area);
        expect(setAreaPropertyVariable).toHaveBeenNthCalledWith(
            2,
            "area-1",
            "property-area-1",
            "maxUsersReached",
            "false"
        );
    });

    it("tracks counts independently per area", () => {
        const { enterSubject, leaveSubject, setAreaPropertyVariable } = createHarness();
        const areaA = createArea("area-a", 2);
        const areaB = createArea("area-b", 1);

        enterSubject.next(areaA);
        expect(setAreaPropertyVariable).not.toHaveBeenCalled();

        enterSubject.next(areaB);
        expect(setAreaPropertyVariable).toHaveBeenNthCalledWith(
            1,
            "area-b",
            "property-area-b",
            "maxUsersReached",
            "true"
        );

        enterSubject.next(areaA);
        expect(setAreaPropertyVariable).toHaveBeenNthCalledWith(
            2,
            "area-a",
            "property-area-a",
            "maxUsersReached",
            "true"
        );

        leaveSubject.next(areaB);
        expect(setAreaPropertyVariable).toHaveBeenNthCalledWith(
            3,
            "area-b",
            "property-area-b",
            "maxUsersReached",
            "false"
        );
    });

    it("ignores areas with no maxUsers limit", () => {
        const { enterSubject, leaveSubject, setAreaPropertyVariable } = createHarness();
        const unlimitedArea = createArea("area-unlimited", null);

        enterSubject.next(unlimitedArea);
        leaveSubject.next(unlimitedArea);

        expect(setAreaPropertyVariable).not.toHaveBeenCalled();
    });

    it("unsubscribes on room destroy", () => {
        const { enterSubject, leaveSubject, destroySubject, setAreaPropertyVariable, registerEventListener } =
            createHarness();
        const area = createArea("area-1", 1);

        expect(registerEventListener).toHaveBeenNthCalledWith(1, "enter", "maxUsersInAreaPropertyData");
        expect(registerEventListener).toHaveBeenNthCalledWith(2, "leave", "maxUsersInAreaPropertyData");

        destroySubject.next();
        enterSubject.next(area);
        leaveSubject.next(area);

        expect(setAreaPropertyVariable).not.toHaveBeenCalled();
    });
});
