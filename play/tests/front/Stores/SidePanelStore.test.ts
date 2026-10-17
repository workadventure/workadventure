import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isActivatedStore, isCalendarVisibleStore } from "../../../src/front/Stores/CalendarStore";
import { isTodoListVisibleStore } from "../../../src/front/Stores/TodoListStore";
import { chatVisibilityStore } from "../../../src/front/Stores/ChatStore";
import { sidePanelWidthStore } from "../../../src/front/Stores/SidePanelStore";
import {
    chatSidebarWidthStore,
    hideActionBarStoreBecauseOfChatBar,
} from "../../../src/front/Chat/ChatSidebarWidthStore";

function resizeWindow(width: number): void {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    window.dispatchEvent(new Event("resize"));
}

describe("sidePanelWidthStore", () => {
    // windowSize only follows resize events while someone listens.
    let unsubscribe: () => void;
    beforeEach(() => {
        unsubscribe = hideActionBarStoreBecauseOfChatBar.subscribe(() => {});
        isActivatedStore.set(true);
        chatSidebarWidthStore.set(335);
    });
    afterEach(() => {
        unsubscribe();
        isCalendarVisibleStore.set(false);
        isTodoListVisibleStore.set(false);
        chatVisibilityStore.set(false);
    });

    it("takes the panel's width on the right from md up, while the agenda is open", () => {
        resizeWindow(1440);
        expect(get(sidePanelWidthStore)).toBe(0);
        isCalendarVisibleStore.set(true);
        expect(get(sidePanelWidthStore)).toBe(384);
        resizeWindow(767);
        expect(get(sidePanelWidthStore)).toBe(0);
    });

    it("takes nothing for a tasks panel whose module is not activated", () => {
        resizeWindow(1440);
        isTodoListVisibleStore.set(true);
        expect(get(sidePanelWidthStore)).toBe(0);
    });

    it("hides the action bar when the chat and the panel leave too little room for it", () => {
        isCalendarVisibleStore.set(true);
        resizeWindow(1000);
        expect(get(hideActionBarStoreBecauseOfChatBar)).toBe(false);
        chatVisibilityStore.set(true);
        expect(get(hideActionBarStoreBecauseOfChatBar)).toBe(true);
        isCalendarVisibleStore.set(false);
        expect(get(hideActionBarStoreBecauseOfChatBar)).toBe(false);
    });
});
