import { expect, test } from "vitest";
import { createMeetingTabs } from "../../src/meeting-tab-policy";

test("with no meeting, the active tab drives media", () => {
    const tabs = createMeetingTabs();
    expect(tabs.controllingTab("tab-1")).toBe("tab-1");
});

test("a meeting in a background tab keeps the controls while another tab is on screen", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    expect(tabs.controllingTab("tab-2")).toBe("tab-1");
});

test("a second tab entering a meeting takes the controls and preempts the first one", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    expect(tabs.setInMeeting("tab-2", true)).toBe("tab-1");
    expect(tabs.controllingTab("tab-1")).toBe("tab-2");
});

test("a preempted tab re-reporting its meeting does not take the controls back", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    tabs.setInMeeting("tab-2", true);
    expect(tabs.setInMeeting("tab-1", true)).toBe(undefined);
    expect(tabs.controllingTab("tab-1")).toBe("tab-2");
});

test("when the latest meeting ends, the tab still in a meeting drives media again", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    tabs.setInMeeting("tab-2", true);
    tabs.setInMeeting("tab-2", false);
    expect(tabs.controllingTab("tab-2")).toBe("tab-1");
    tabs.forget("tab-1");
    expect(tabs.controllingTab("tab-2")).toBe("tab-2");
});
