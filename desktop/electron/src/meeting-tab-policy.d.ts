export type MeetingTabs = {
    meetingTab(): string | undefined;
    controllingTab(activeTabId: string | undefined): string | undefined;
    /** Returns the id of the tab that drove a meeting before this one entered its own, if any. */
    setInMeeting(tabId: string, inMeeting: boolean): string | undefined;
    forget(tabId: string): void;
    clear(): void;
};

export function createMeetingTabs(): MeetingTabs;
