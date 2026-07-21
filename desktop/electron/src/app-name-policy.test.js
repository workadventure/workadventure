const test = require("node:test");
const assert = require("node:assert/strict");

const { DESKTOP_APP_NAME, DESKTOP_WINDOW_TITLE, createDesktopWindowTitle } = require("./app-name-policy");

test("uses WorkAdventure as the desktop application name", () => {
    assert.equal(DESKTOP_APP_NAME, "WorkAdventure");
    assert.equal(DESKTOP_WINDOW_TITLE, "WorkAdventure Desktop");
    assert.equal(createDesktopWindowTitle(), "WorkAdventure Desktop");
});

test("can format a future room-aware title when a room name is available", () => {
    assert.equal(createDesktopWindowTitle("Salle produit"), "Salle produit - WorkAdventure");
    assert.equal(createDesktopWindowTitle("  "), "WorkAdventure Desktop");
});
