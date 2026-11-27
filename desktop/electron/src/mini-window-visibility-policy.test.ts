import { expect, test } from "vitest";
import { leftOnBlur, miniWindowMode, type MiniWindowState } from "./mini-window-visibility-policy";

// One test per row of the rules table in mini-window-visibility-policy.ts.
const awayInMeeting: MiniWindowState = {
    opened: "no",
    inWorld: true,
    withOthers: true,
    autoOpenAllowed: true,
    waShowing: false,
    dismissed: false,
    placeAvailable: true,
};

test("automatic opening: in a meeting, WA not showing, setting on, not closed since the last return", () => {
    expect(miniWindowMode(awayInMeeting)).toBe("auto");
    expect(miniWindowMode({ ...awayInMeeting, waShowing: true })).toBe("closed");
    expect(miniWindowMode({ ...awayInMeeting, autoOpenAllowed: false })).toBe("closed");
    expect(miniWindowMode({ ...awayInMeeting, dismissed: true })).toBe("closed");
});

test("placement: nowhere to land keeps it closed, but an open mini window stays where it is", () => {
    expect(miniWindowMode({ ...awayInMeeting, placeAvailable: false })).toBe("closed");
    expect(miniWindowMode({ ...awayInMeeting, placeAvailable: false, opened: "auto" })).toBe("auto");
});

test("opening by hand: always, and it stays when WA shows again", () => {
    const manual: MiniWindowState = {
        opened: "manual",
        inWorld: true,
        withOthers: true,
        autoOpenAllowed: false,
        waShowing: true,
    };
    expect(miniWindowMode(manual)).toBe("manual");
    expect(miniWindowMode({ ...manual, withOthers: false })).toBe("manual");
});

test("invitation: opens even after a close and whatever the setting, as an automatic opening", () => {
    const invited: MiniWindowState = {
        ...awayInMeeting,
        withOthers: false,
        invitationPending: true,
        dismissed: true,
        autoOpenAllowed: false,
    };
    expect(miniWindowMode(invited)).toBe("auto");
    expect(miniWindowMode({ ...invited, waShowing: true })).toBe("closed");
});

test("automatic closing: WA shows again, the meeting ends, or the user leaves the world", () => {
    const openedByItself: MiniWindowState = { ...awayInMeeting, opened: "auto" };
    expect(miniWindowMode({ ...openedByItself, waShowing: true })).toBe("closed");
    expect(miniWindowMode({ ...openedByItself, withOthers: false })).toBe("closed");
    expect(miniWindowMode({ ...openedByItself, inWorld: false })).toBe("closed");
    expect(miniWindowMode({ ...openedByItself, opened: "manual", inWorld: false })).toBe("closed");
});

test("meeting ends: a mini window opened by hand stays", () => {
    expect(miniWindowMode({ ...awayInMeeting, opened: "manual", withOthers: false })).toBe("manual");
});

test("closing by hand: closed until the user comes back to WA", () => {
    expect(miniWindowMode({ ...awayInMeeting, dismissed: true })).toBe("closed");
    // Coming back to WA lifts the dismissal (the controller clears it): leaving again reopens it.
    expect(miniWindowMode({ ...awayInMeeting, dismissed: false })).toBe("auto");
});

test("alone, in a meeting room or outside a meeting: never by itself", () => {
    expect(miniWindowMode({ ...awayInMeeting, withOthers: false })).toBe("closed");
});

test("leaving by focus: Wayland always counts, the pointer's screen is unknown there", () => {
    expect(leftOnBlur({ positionsKnown: false, pointerDisplayId: 2, waDisplayId: 1 })).toBe(true);
});

test("leaving by focus: the pointer on WA's screen counts", () => {
    expect(leftOnBlur({ positionsKnown: true, pointerDisplayId: 1, waDisplayId: 1 })).toBe(true);
});

test("leaving by focus: the pointer on another screen does not, WA keeps showing there", () => {
    expect(leftOnBlur({ positionsKnown: true, pointerDisplayId: 2, waDisplayId: 1 })).toBe(false);
});

test("leaving by focus: an unknown screen counts as leaving", () => {
    expect(leftOnBlur({ positionsKnown: true, pointerDisplayId: 1 })).toBe(true);
    expect(leftOnBlur({ positionsKnown: true, waDisplayId: 1 })).toBe(true);
});
