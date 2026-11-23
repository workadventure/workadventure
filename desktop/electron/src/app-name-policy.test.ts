import { expect, test } from "vitest";
import { DESKTOP_APP_NAME, createDesktopWindowTitle } from "./app-name-policy";

test("uses WorkAdventure as the desktop application name and default title", () => {
    expect(DESKTOP_APP_NAME).toBe("WorkAdventure");
    expect(createDesktopWindowTitle()).toBe("WorkAdventure");
});

test("puts the map name before the application name", () => {
    expect(createDesktopWindowTitle("Salle produit")).toBe("Salle produit - WorkAdventure");
    expect(createDesktopWindowTitle("  ")).toBe("WorkAdventure");
});

test("marks a beta version in the title", () => {
    expect(createDesktopWindowTitle(undefined, "2.0.0-beta.1")).toBe("WorkAdventure (beta)");
    expect(createDesktopWindowTitle("Salle produit", "2.0.0-beta.1")).toBe("Salle produit - WorkAdventure (beta)");
    expect(createDesktopWindowTitle("Salle produit", "2.0.0")).toBe("Salle produit - WorkAdventure");
});
