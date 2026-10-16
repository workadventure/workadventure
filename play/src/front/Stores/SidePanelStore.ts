import { derived } from "svelte/store";
import { breakpoints } from "../Utils/BreakpointsUtils";
import { windowSize } from "./CoWebsiteStore";
import { isActivatedStore as calendarIsActivatedStore, isCalendarVisibleStore } from "./CalendarStore";
import { isActivatedStore as todoListIsActivatedStore, isTodoListVisibleStore } from "./TodoListStore";

/** The agenda and tasks panels are w-96. */
const SIDE_PANEL_WIDTH = 384;

/**
 * The room the agenda or tasks panel takes on the right: the layout and the action bar shrink to make way for it,
 * like for the map editor. Below md the panel covers the whole screen instead, like the chat, and takes nothing.
 */
export const sidePanelWidthStore = derived(
    [calendarIsActivatedStore, isCalendarVisibleStore, todoListIsActivatedStore, isTodoListVisibleStore, windowSize],
    ([$calendarIsActivated, $isCalendarVisible, $todoListIsActivated, $isTodoListVisible, $windowSize]) =>
        (($calendarIsActivated && $isCalendarVisible) || ($todoListIsActivated && $isTodoListVisible)) &&
        $windowSize.width >= breakpoints.md
            ? SIDE_PANEL_WIDTH
            : 0,
);
