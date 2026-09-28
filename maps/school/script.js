/**
 * NG Academy — in-world scripting (map property `script: ./script.js`)
 *
 * Adds diegetic management shortcuts on top of the map's objects/zones:
 *  - «بطاقة المدير» identity card popup (menu command)
 *  - quick-read shortcuts (menu) — the *primary* tools live on the office objects
 *  - a warm welcome when you enter the courtyard
 */
const UI = "/maps/school/admin-ui/";
const LOGO = "/maps/school/assets/logo.png";

function safe(fn) {
    try { fn(); } catch (e) { console.warn("[NG Academy]", e); }
}

WA.onInit().then(() => {
    // --- identity card (diegetic popup) ---
    safe(() => WA.ui.registerMenuCommand("🦉 بطاقة المدير", () => {
        WA.ui.openPopup(
            "ng-card",
            "NG Academy — باقة المدير\nالمدير: السيد/ة مدير المدرسة\nالقبول: مكتب المدير (الجناح الشرقي)\nالهاتف الداخلي: الاستقبال ← ٩",
            [
                { label: "فتح نظام المدرسة", className: "primary", callback: () => safe(() => WA.nav.openCoWebSite(UI + "computer.html?loc=office&tool=computer", true, "allow")) },
                { label: "إغلاق", className: "normal", callback: () => safe(() => WA.ui.closePopup("ng-card")) },
            ],
        );
    }));

    // --- quick-read shortcuts (reading only; tools remain on office objects) ---
    safe(() => WA.ui.registerMenuCommand("📌 الإعلانات (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "announcements.html?loc=office&tool=board", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("🗓️ التقويم (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "calendar.html?loc=office&tool=calendar", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("🎭 برنامج قاعة النجوم (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "ceremony.html?loc=hall&tool=program", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("💬 نادي المبدعين الصغار (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "club.html?loc=club&tool=board", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("♟️ قسم الشطرنج (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "chess.html?loc=chess&tool=digital-board", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("🧠 الحساب الذهني (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "math.html?loc=math&tool=challenges", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("🛎️ الاستقبال (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "reception.html?loc=reception&tool=reception", true, "allow")));
    safe(() => WA.ui.registerMenuCommand("🔬 فصل العلوم (قراءة)", () =>
        WA.nav.openCoWebSite(UI + "science.html?loc=science&tool=title", true, "allow")));

    // --- welcome toast on arrival ---
    safe(() => WA.ui.displayActionMessage("أهلاً في NG Academy — توجّه نحو البوابة ثم ردهة الدرج لمكتب المدير 🦉"));
});
