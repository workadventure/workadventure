import { expect, test } from "vitest";
import { createDesktopCallbackPage } from "./desktop-callback-page";

test("desktop callback page tries to close the browser tab automatically", () => {
    const html = createDesktopCallbackPage("Signed out.");

    expect(html).toMatch(/window\.close\(\)/);
    expect(html).toMatch(/Signed out\./);
    expect(html).toMatch(/You can close this window/);
    expect(html).toMatch(/<html lang="en" dir="ltr">/);
});

test("desktop callback page takes a translated close hint and language", () => {
    const html = createDesktopCallbackPage("Déconnexion terminée.", "Vous pouvez fermer cette fenêtre.", "fr");

    expect(html).toMatch(/Vous pouvez fermer cette fenêtre/);
    expect(html).toMatch(/<html lang="fr" dir="ltr">/);
});

test("desktop callback page escapes its message", () => {
    const html = createDesktopCallbackPage("<script>alert(1)</script>");

    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(html).toMatch(/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("desktop callback page reads right to left in Arabic", () => {
    const html = createDesktopCallbackPage("تم تسجيل الخروج.", "يمكنك إغلاق هذه النافذة.", "ar");
    expect(html).toMatch(/<html lang="ar" dir="rtl">/);
});
