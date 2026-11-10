import { expect, test } from "vitest";
import { DESKTOP_APP_NAME, DESKTOP_WINDOW_TITLE, createDesktopWindowTitle } from "./app-name-policy";

test("uses WorkAdventure as the desktop application name", () => {
    expect(DESKTOP_APP_NAME).toBe("WorkAdventure");
    expect(DESKTOP_WINDOW_TITLE).toBe("WorkAdventure Desktop");
    expect(createDesktopWindowTitle()).toBe("WorkAdventure Desktop");
});

test("can format a future room-aware title when a room name is available", () => {
    expect(createDesktopWindowTitle("Salle produit")).toBe("Salle produit - WorkAdventure");
    expect(createDesktopWindowTitle("  ")).toBe("WorkAdventure Desktop");
});
