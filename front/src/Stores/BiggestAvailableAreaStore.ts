import { get, writable } from "svelte/store";
import type { Box } from "../WebRtc/LayoutManager";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
import { LayoutMode } from "../WebRtc/LayoutManager";
import { embedScreenLayout } from "./EmbedScreensStore";

/**
 * Tries to find the biggest available box of remaining space (this is a space where we can center the character)
 */
function findBiggestAvailableArea(): Box {
    const game = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");
    if (get(embedScreenLayout) === LayoutMode.VideoChat) {
        const children = document.querySelectorAll<HTMLDivElement>("div.chat-mode > div");
        const htmlChildren = Array.from(children.values());

        // No chat? Let's go full center
        if (htmlChildren.length === 0) {
            return {
                xStart: 0,
                yStart: 0,
                xEnd: game.offsetWidth,
                yEnd: game.offsetHeight,
            };
        }

        const lastDiv = htmlChildren[htmlChildren.length - 1];
        // Compute area between top right of the last div and bottom right of window
        const area1 =
            (game.offsetWidth - (lastDiv.offsetLeft + lastDiv.offsetWidth)) * (game.offsetHeight - lastDiv.offsetTop);

        // Compute area between bottom of last div and bottom of the screen on whole width
        const area2 = game.offsetWidth * (game.offsetHeight - (lastDiv.offsetTop + lastDiv.offsetHeight));

        if (area1 < 0 && area2 < 0) {
            // If screen is full, let's not attempt something foolish and simply center character in the middle.
            return {
                xStart: 0,
                yStart: 0,
                xEnd: game.offsetWidth,
                yEnd: game.offsetHeight,
            };
        }
        if (area1 <= area2) {
            return {
                xStart: 0,
                yStart: lastDiv.offsetTop + lastDiv.offsetHeight,
                xEnd: game.offsetWidth,
                yEnd: game.offsetHeight,
            };
        } else {
            return {
                xStart: lastDiv.offsetLeft + lastDiv.offsetWidth,
                yStart: lastDiv.offsetTop,
                xEnd: game.offsetWidth,
                yEnd: game.offsetHeight,
            };
        }
    } else {
        // Possible destinations: at the center bottom or at the right bottom.
        const mainSectionChildren = Array.from(
            document.querySelectorAll<HTMLDivElement>("div.main-section > div").values()
        );
        const sidebarChildren = Array.from(document.querySelectorAll<HTMLDivElement>("aside.sidebar > div").values());

        // No presentation? Let's center on the screen
        if (mainSectionChildren.length === 0) {
            return {
                xStart: 0,
                yStart: 0,
                xEnd: game.offsetWidth,
                yEnd: game.offsetHeight,
            };
        }

        // At this point, we know we have at least one element in the main section.
        const lastPresentationDiv = mainSectionChildren[mainSectionChildren.length - 1];

        const presentationArea =
            (game.offsetHeight - (lastPresentationDiv.offsetTop + lastPresentationDiv.offsetHeight)) *
            (lastPresentationDiv.offsetLeft + lastPresentationDiv.offsetWidth);

        let leftSideBar: number;
        let bottomSideBar: number;
        if (sidebarChildren.length === 0) {
            leftSideBar = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("sidebar").offsetLeft;
            bottomSideBar = 0;
        } else {
            const lastSideBarChildren = sidebarChildren[sidebarChildren.length - 1];
            leftSideBar = lastSideBarChildren.offsetLeft;
            bottomSideBar = lastSideBarChildren.offsetTop + lastSideBarChildren.offsetHeight;
        }
        const sideBarArea = (game.offsetWidth - leftSideBar) * (game.offsetHeight - bottomSideBar);

        if (presentationArea <= sideBarArea) {
            return {
                xStart: leftSideBar,
                yStart: bottomSideBar,
                xEnd: game.offsetWidth,
                yEnd: game.offsetHeight,
            };
        } else {
            return {
                xStart: 0,
                yStart: lastPresentationDiv.offsetTop + lastPresentationDiv.offsetHeight,
                xEnd: /*lastPresentationDiv.offsetLeft + lastPresentationDiv.offsetWidth*/ game.offsetWidth, // To avoid flickering when a chat start, we center on the center of the screen, not the center of the main content area
                yEnd: game.offsetHeight,
            };
        }
    }
}

/**
 * A store that contains the list of (video) peers we are connected to.
 */
function createBiggestAvailableAreaStore() {
    const { subscribe, set } = writable<Box>({ xStart: 0, yStart: 0, xEnd: 1, yEnd: 1 });

    return {
        subscribe,
        recompute: () => {
            set(findBiggestAvailableArea());
        },
    };
}

export const biggestAvailableAreaStore = createBiggestAvailableAreaStore();
