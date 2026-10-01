const test = require("node:test");
const assert = require("node:assert/strict");

const { createDesktopCallbackPage } = require("./desktop-callback-page");

test("desktop callback page tries to close the browser tab automatically", () => {
    const html = createDesktopCallbackPage("Signed out.");

    assert.match(html, /window\.close\(\)/);
    assert.match(html, /Signed out\./);
    assert.match(html, /You can close this window/);
    assert.match(html, /<html lang="en">/);
});

test("desktop callback page takes a translated close hint and language", () => {
    const html = createDesktopCallbackPage("Déconnexion terminée.", "Vous pouvez fermer cette fenêtre.", "fr");

    assert.match(html, /Vous pouvez fermer cette fenêtre/);
    assert.match(html, /<html lang="fr">/);
});

test("desktop callback page escapes its message", () => {
    const html = createDesktopCallbackPage("<script>alert(1)</script>");

    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
