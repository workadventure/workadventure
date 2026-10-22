import { expect, test } from "vitest";
import { companionMode, displayForAutoOpenDuringShare } from "./companion-visibility-policy";

// One test per row of the rules table in companion-visibility-policy.js.
const awayInMeeting = {
    opened: "no",
    inWorld: true,
    inMeeting: true,
    autoOpenAllowed: true,
    waShowing: false,
    dismissed: false,
    placeAvailable: true,
};

test("automatic opening: in a meeting, WA not showing, setting on, not closed since the last return", () => {
    expect(companionMode(awayInMeeting)).toBe("auto");
    expect(companionMode({ ...awayInMeeting, waShowing: true })).toBe("closed");
    expect(companionMode({ ...awayInMeeting, autoOpenAllowed: false })).toBe("closed");
    expect(companionMode({ ...awayInMeeting, dismissed: true })).toBe("closed");
});

test("placement: nowhere to land keeps it closed, but an open companion stays where it is", () => {
    expect(companionMode({ ...awayInMeeting, placeAvailable: false })).toBe("closed");
    expect(companionMode({ ...awayInMeeting, placeAvailable: false, opened: "auto" })).toBe("auto");
    // During the user's own share: another screen than the shared one, none with a single screen.
    expect(displayForAutoOpenDuringShare([1], 1, 1)).toBeUndefined();
    expect(displayForAutoOpenDuringShare([1, 2], undefined, 1)).toBeUndefined();
    expect(displayForAutoOpenDuringShare([1, 2, 3], 1, 3)).toBe(3);
    expect(displayForAutoOpenDuringShare([1, 2, 3], 1, 1)).toBe(2);
});

test("opening by hand: always, and it stays when WA shows again", () => {
    const manual = { opened: "manual", inWorld: true, inMeeting: true, autoOpenAllowed: false, waShowing: true };
    expect(companionMode(manual)).toBe("manual");
    expect(companionMode({ ...manual, inMeeting: false })).toBe("manual");
});

test("invitation: opens even after a close and whatever the setting, as an automatic opening", () => {
    const invited = {
        ...awayInMeeting,
        inMeeting: false,
        invitationPending: true,
        dismissed: true,
        autoOpenAllowed: false,
    };
    expect(companionMode(invited)).toBe("auto");
    expect(companionMode({ ...invited, waShowing: true })).toBe("closed");
});

test("automatic closing: WA shows again, the meeting ends, or the user leaves the world", () => {
    const openedByItself = { ...awayInMeeting, opened: "auto" };
    expect(companionMode({ ...openedByItself, waShowing: true })).toBe("closed");
    expect(companionMode({ ...openedByItself, inMeeting: false })).toBe("closed");
    expect(companionMode({ ...openedByItself, inWorld: false })).toBe("closed");
    expect(companionMode({ ...openedByItself, opened: "manual", inWorld: false })).toBe("closed");
});

test("meeting ends: a companion opened by hand stays", () => {
    expect(companionMode({ ...awayInMeeting, opened: "manual", inMeeting: false })).toBe("manual");
});

test("closing by hand: closed until the user comes back to WA", () => {
    expect(companionMode({ ...awayInMeeting, dismissed: true })).toBe("closed");
    // Coming back to WA lifts the dismissal (the controller clears it): leaving again reopens it.
    expect(companionMode({ ...awayInMeeting, dismissed: false })).toBe("auto");
});

test("outside a meeting: never by itself", () => {
    expect(companionMode({ ...awayInMeeting, inMeeting: false })).toBe("closed");
});
