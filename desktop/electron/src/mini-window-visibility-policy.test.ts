import { expect, test } from "vitest";
import { miniWindowMode, type MiniWindowState } from "./mini-window-visibility-policy";

// One test per row of the rules table in mini-window-visibility-policy.ts.
const awayInMeeting: MiniWindowState = {
    opened: "no",
    inWorld: true,
    inMeeting: true,
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
        inMeeting: true,
        autoOpenAllowed: false,
        waShowing: true,
    };
    expect(miniWindowMode(manual)).toBe("manual");
    expect(miniWindowMode({ ...manual, inMeeting: false })).toBe("manual");
});

test("invitation: opens even after a close and whatever the setting, as an automatic opening", () => {
    const invited: MiniWindowState = {
        ...awayInMeeting,
        inMeeting: false,
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
    expect(miniWindowMode({ ...openedByItself, inMeeting: false })).toBe("closed");
    expect(miniWindowMode({ ...openedByItself, inWorld: false })).toBe("closed");
    expect(miniWindowMode({ ...openedByItself, opened: "manual", inWorld: false })).toBe("closed");
});

test("meeting ends: a mini window opened by hand stays", () => {
    expect(miniWindowMode({ ...awayInMeeting, opened: "manual", inMeeting: false })).toBe("manual");
});

test("closing by hand: closed until the user comes back to WA", () => {
    expect(miniWindowMode({ ...awayInMeeting, dismissed: true })).toBe("closed");
    // Coming back to WA lifts the dismissal (the controller clears it): leaving again reopens it.
    expect(miniWindowMode({ ...awayInMeeting, dismissed: false })).toBe("auto");
});

test("outside a meeting: never by itself", () => {
    expect(miniWindowMode({ ...awayInMeeting, inMeeting: false })).toBe("closed");
});
