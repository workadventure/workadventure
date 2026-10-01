"use strict";

/**
 * Which tab drives media (mute/camera shortcuts, tray, companion, PiP, meeting bar, overlay).
 *
 * `meetings` maps a tab id to the order in which it entered its meeting. The latest tab still in a
 * meeting drives media; with none, the active tab does. Only a transition into a meeting moves the
 * controls: a tab already in one re-reporting it (its mic changed, say) changes nothing, otherwise a
 * tab that was told to drop its media would take the controls back on its next presence push.
 */
function createMeetingTabs() {
    const meetings = new Map();
    let counter = 0;

    function meetingTab() {
        let latest;
        let latestAt = -1;
        for (const [id, at] of meetings) {
            if (at > latestAt) {
                latest = id;
                latestAt = at;
            }
        }
        return latest;
    }

    return {
        meetingTab,
        controllingTab(activeTabId) {
            return meetingTab() ?? activeTabId;
        },
        /** Returns the id of the tab that drove a meeting before this one entered its own, if any. */
        setInMeeting(tabId, inMeeting) {
            if (!inMeeting) {
                meetings.delete(tabId);
                return undefined;
            }
            if (meetings.has(tabId)) {
                return undefined;
            }
            const previous = meetingTab();
            meetings.set(tabId, ++counter);
            return previous;
        },
        forget(tabId) {
            meetings.delete(tabId);
        },
        clear() {
            meetings.clear();
        },
    };
}

module.exports = { createMeetingTabs };
