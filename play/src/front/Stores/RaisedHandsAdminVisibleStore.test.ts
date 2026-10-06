import { type Writable, get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterType } from "@workadventure/messages";
import type { RaisedHandSection, SpaceInterface } from "../Space/SpaceInterface";

vi.mock("./PeerStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { raisedHandSectionsStore: w<RaisedHandSection[]>([]) };
});
vi.mock("./GameStore", async () => {
    const { writable: w } = await import("svelte/store");
    return { userIsAdminStore: w(false) };
});

import { raisedHandSectionsStore } from "./PeerStore";
import { userIsAdminStore } from "./GameStore";
import { visibleRaisedHandSectionsStore } from "./RaisedHandsAdminVisibleStore";

const sections = raisedHandSectionsStore as unknown as Writable<RaisedHandSection[]>;
const isAdmin = userIsAdminStore;

const bob = { spaceUserId: "room_2", name: "Bob", at: 1 };

function section(kind: SpaceInterface["kind"], filterType: FilterType, onAirHere = false): RaisedHandSection {
    const space = { kind, filterType, getName: () => kind ?? "world" } as unknown as SpaceInterface;
    return { space, hands: [bob], speakers: [], onAirHere };
}

const bubble = section("bubble", FilterType.ALL_USERS);
const meeting = section("area", FilterType.ALL_USERS);
const megaphoneHeard = section("megaphone", FilterType.LIVE_STREAMING_USERS);
const megaphoneHosted = section("megaphone", FilterType.LIVE_STREAMING_USERS, true);

const visible = () =>
    get(visibleRaisedHandSectionsStore).map(({ space, canModerate, floorControls }) => ({
        kind: space.kind,
        canModerate,
        floorControls,
    }));

describe("visibleRaisedHandSectionsStore", () => {
    afterEach(() => {
        sections.set([]);
        isAdmin.set(false);
    });

    it("is empty, hiding the dock, when no space has a raised hand", () => {
        isAdmin.set(true);
        expect(visible()).toEqual([]);
    });

    it("shows a bubble's queue to every member, without floor controls", () => {
        sections.set([bubble]);
        expect(visible()).toEqual([{ kind: "bubble", canModerate: false, floorControls: false }]);
    });

    it("shows a meeting room's queue to every member, without floor controls", () => {
        sections.set([meeting]);
        expect(visible()).toEqual([{ kind: "area", canModerate: false, floorControls: false }]);
    });

    it("hides the megaphone's queue from a bubble member who only listens to it", () => {
        sections.set([bubble, megaphoneHeard]);
        expect(visible()).toEqual([{ kind: "bubble", canModerate: false, floorControls: false }]);
    });

    it("keeps the floor controls of a megaphone host who stands in a bubble", () => {
        sections.set([bubble, megaphoneHosted]);
        expect(visible()).toEqual([
            { kind: "bubble", canModerate: false, floorControls: false },
            { kind: "megaphone", canModerate: true, floorControls: true },
        ]);
    });

    it("lets an admin moderate every space, but promote only in a broadcast", () => {
        isAdmin.set(true);
        sections.set([bubble, megaphoneHeard]);
        expect(visible()).toEqual([
            { kind: "bubble", canModerate: true, floorControls: false },
            { kind: "megaphone", canModerate: true, floorControls: true },
        ]);
    });
});
