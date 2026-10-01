const test = require("node:test");
const assert = require("node:assert/strict");

const { createMeetingTabs } = require("./meeting-tab-policy");

test("with no meeting, the active tab drives media", () => {
    const tabs = createMeetingTabs();
    assert.equal(tabs.controllingTab("tab-1"), "tab-1");
});

test("a meeting in a background tab keeps the controls while another tab is on screen", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    assert.equal(tabs.controllingTab("tab-2"), "tab-1");
});

test("a second tab entering a meeting takes the controls and preempts the first one", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    assert.equal(tabs.setInMeeting("tab-2", true), "tab-1");
    assert.equal(tabs.controllingTab("tab-1"), "tab-2");
});

test("a preempted tab re-reporting its meeting does not take the controls back", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    tabs.setInMeeting("tab-2", true);
    assert.equal(tabs.setInMeeting("tab-1", true), undefined);
    assert.equal(tabs.controllingTab("tab-1"), "tab-2");
});

test("when the latest meeting ends, the tab still in a meeting drives media again", () => {
    const tabs = createMeetingTabs();
    tabs.setInMeeting("tab-1", true);
    tabs.setInMeeting("tab-2", true);
    tabs.setInMeeting("tab-2", false);
    assert.equal(tabs.controllingTab("tab-2"), "tab-1");
    tabs.forget("tab-1");
    assert.equal(tabs.controllingTab("tab-2"), "tab-2");
});
