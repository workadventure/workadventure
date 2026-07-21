const test = require("node:test");
const assert = require("node:assert/strict");

const { createDesktopCallbackPage } = require("./desktop-callback-page");

test("desktop callback page tries to close the browser tab automatically", () => {
    const html = createDesktopCallbackPage("Déconnexion terminée.");

    assert.match(html, /window\.close\(\)/);
    assert.match(html, /Déconnexion terminée\./);
    assert.match(html, /Vous pouvez fermer cette fenêtre/);
});

test("desktop callback page escapes its message", () => {
    const html = createDesktopCallbackPage("<script>alert(1)</script>");

    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
