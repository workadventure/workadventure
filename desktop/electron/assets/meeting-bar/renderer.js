// Meeting bar renderer (sandboxed, vanilla JS).
//
// Zoom-style presenter controls floating on the SHARED screen. Compact bar (mic / camera /
// screen-share / more) with an overflow "…" menu (switch source, change devices, display tabs,
// settings, back to the app). The window is content-protected in
// the main process, so none of this UI leaks into the captured stream. Thin, stateless client:
// state is pushed by the WorkAdventure renderer, every click goes back as a command.
(function () {
    "use strict";

    var api = window.WAHud;
    if (!api) {
        console.error("Meeting bar renderer: WAHud not exposed");
        return;
    }

    var byId = function (id) {
        return document.getElementById(id);
    };

    // ─────────── Strings ───────────
    // Pushed by the WorkAdventure world, translated in the language the user chose there (keys
    // "meetingBar.*", plus "lang"). The English in the markup and below is the fallback until they
    // arrive. Static markup is tagged data-i18n (text) / data-i18n-label (aria-label + title).
    var strings = {};
    function t(key, fallback) {
        return typeof strings[key] === "string" ? strings[key] : fallback;
    }
    function applyStaticStrings() {
        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            if (el.i18nFallback === undefined) el.i18nFallback = el.textContent;
            el.textContent = t(el.getAttribute("data-i18n"), el.i18nFallback);
        });
        document.querySelectorAll("[data-i18n-label]").forEach(function (el) {
            if (el.i18nFallback === undefined) el.i18nFallback = el.getAttribute("aria-label") || "";
            var text = t(el.getAttribute("data-i18n-label"), el.i18nFallback);
            el.setAttribute("aria-label", text);
            if (el.hasAttribute("title")) el.title = text;
        });
    }
    api.onStrings(function (next) {
        if (!next || typeof next !== "object") return;
        strings = next;
        if (typeof strings.lang === "string") {
            document.documentElement.lang = strings.lang;
            // Arabic: lay the bar out right to left.
            document.documentElement.dir = /^(ar|fa|he|ur)([-_]|$)/i.test(strings.lang) ? "rtl" : "ltr";
        }
        applyStaticStrings();
        // Re-render the open dynamic panels in the new language.
        if (pickerOpen && lastSources.length > 0) renderPicker();
        if (devicesOpen) renderDevices();
    });
    var ICON_CHECK =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>';
    var ICON_CAMERA =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"/><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/></svg>';
    var ICON_MIC =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M8 21l8 0"/><path d="M12 17l0 4"/></svg>';

    var btnMic = byId("bar-mic");
    var btnCam = byId("bar-cam");
    var btnStop = byId("bar-stop");
    var btnMore = byId("bar-more");

    var menu = byId("menu");
    var menuCaret = byId("mn-caret");
    var miSwitch = byId("mn-switch");
    var miDevices = byId("mn-devices");
    var miTabs = byId("mn-tabs");
    var miSettings = byId("mn-settings");

    var picker = byId("picker");
    var pickerBody = byId("pk-body");
    var pickerCancel = byId("pk-cancel");
    var pickerTabs = picker.querySelectorAll(".pk-tab");

    var devicesEl = byId("devices");
    var dvBody = byId("dv-body");
    var dvCancel = byId("dv-cancel");

    var pickerOpen = false;
    var menuOpen = false;
    var devicesOpen = false;
    var pickerKind = "screen";
    var lastSources = [];
    var lastDevices = null;
    var lastCamEnabled = false;
    var lastMicEnabled = false;

    function setBtnState(btn, isOn, forbiddenWhenOff) {
        btn.dataset.state = isOn ? "on" : "off";
        btn.classList.toggle("is-active", isOn === true && !forbiddenWhenOff);
        btn.classList.toggle("is-forbidden", isOn === false && forbiddenWhenOff);
    }

    api.onState(function (state) {
        if (!state || typeof state !== "object") return;
        setBtnState(btnMic, state.micEnabled === true, true);
        setBtnState(btnCam, state.cameraEnabled === true, true);
        lastMicEnabled = state.micEnabled === true;
        lastCamEnabled = state.cameraEnabled === true;
        lastDevices = state.devices || null;
        if (devicesOpen) renderDevices();
        miTabs.setAttribute("aria-checked", state.tabBarEnabled === true ? "true" : "false");
    });

    btnMic.addEventListener("click", function () {
        api.sendCommand({ type: "toggle-mic" });
    });
    btnCam.addEventListener("click", function () {
        api.sendCommand({ type: "toggle-camera" });
    });
    btnStop.addEventListener("click", function () {
        api.sendCommand({ type: "toggle-screenshare" });
    });

    // Grow the window while the picker / devices panel / "…" menu is open, collapse it back to the
    // pill otherwise.
    function updateExpanded() {
        api.setExpanded(menuOpen || pickerOpen || devicesOpen);
    }

    // ─────────── Overflow "…" menu ───────────
    function onMenuOutside(e) {
        if (btnMore.contains(e.target)) return; // the button's own click toggles it
        if (menu && !menu.contains(e.target)) closeMenu();
    }
    function positionMenu() {
        menu.style.visibility = "hidden";
        menu.classList.add("visible");
        var r = btnMore.getBoundingClientRect();
        var left = r.right - menu.offsetWidth; // right-align to the "…"
        if (left < 6) left = 6;
        menu.style.left = Math.round(left) + "px";
        // Point the caret at the centre of the "…" button, whatever the clamped left edge.
        if (menuCaret) {
            menuCaret.style.left = Math.round((r.left + r.right) / 2 - left) + "px";
        }
        menu.style.visibility = "";
    }
    function openMenu() {
        if (pickerOpen) closePicker();
        if (devicesOpen) closeDevices();
        menuOpen = true;
        btnMore.setAttribute("aria-expanded", "true");
        updateExpanded();
        positionMenu();
        document.addEventListener("mousedown", onMenuOutside, true);
    }
    function closeMenu() {
        if (!menuOpen) return;
        menuOpen = false;
        btnMore.setAttribute("aria-expanded", "false");
        menu.classList.remove("visible");
        document.removeEventListener("mousedown", onMenuOutside, true);
        updateExpanded();
    }
    btnMore.addEventListener("click", function () {
        if (menuOpen) closeMenu();
        else openMenu();
    });

    function menuAction(fn) {
        return function () {
            closeMenu();
            fn();
        };
    }
    miSwitch.addEventListener("click", function () {
        closeMenu();
        openPicker();
    });
    miDevices.addEventListener("click", function () {
        closeMenu();
        openDevices();
    });
    miTabs.addEventListener("click", function () {
        // Optimistic toggle; the real state is reflected once wired into the pushed HUD state.
        var next = miTabs.getAttribute("aria-checked") !== "true";
        miTabs.setAttribute("aria-checked", next ? "true" : "false");
        api.sendCommand({ type: "toggle-tabs" });
        closeMenu();
    });
    miSettings.addEventListener(
        "click",
        menuAction(function () {
            api.sendCommand({ type: "focus-main" });
        })
    );

    // ─────────── Direct source switcher (opened from the "…" menu) ───────────
    function openPicker() {
        if (devicesOpen) closeDevices();
        pickerOpen = true;
        updateExpanded();
        picker.classList.add("visible");
        pickerBody.className = "pk-body loading";
        pickerBody.textContent = t("meetingBar.loadingSources", "Loading sources…");
        api.requestSources()
            .then(function (sources) {
                lastSources = Array.isArray(sources) ? sources : [];
                renderPicker();
            })
            .catch(function (err) {
                console.warn("requestSources failed", err);
                pickerBody.className = "pk-body empty";
                pickerBody.textContent = t("meetingBar.unableToListSources", "Unable to list sources.");
            });
    }

    function closePicker() {
        pickerOpen = false;
        picker.classList.remove("visible");
        updateExpanded();
    }

    function renderPicker() {
        if (!pickerOpen) return;
        pickerBody.innerHTML = "";
        pickerBody.className = "pk-body";
        var filtered = lastSources.filter(function (s) {
            return s.type === pickerKind;
        });
        if (filtered.length === 0) {
            var note = document.createElement("div");
            note.className = "pk-note";
            note.textContent =
                pickerKind === "screen"
                    ? t("meetingBar.noScreen", "No screen available. Check the Screen Recording permission.")
                    : t("meetingBar.noWindow", "No window available.");
            pickerBody.appendChild(note);
            return;
        }
        filtered.forEach(function (source, index) {
            var tile = document.createElement("button");
            tile.type = "button";
            tile.className = "pk-tile";
            tile.title = source.name || "";
            var img = document.createElement("img");
            img.alt = source.name || "";
            img.src = source.thumbnailURL || "";
            tile.appendChild(img);
            var nameEl = document.createElement("span");
            nameEl.className = "pk-tile-name";
            nameEl.textContent =
                pickerKind === "screen"
                    ? index + 1 + " · " + (source.name || t("meetingBar.screen", "Screen"))
                    : source.name || t("meetingBar.untitled", "Untitled");
            tile.appendChild(nameEl);
            tile.addEventListener("click", function () {
                api.sendCommand({
                    type: "pick-source",
                    sourceId: source.id,
                    sourceName: source.name || "",
                    displayId: source.display_id,
                });
                closePicker();
            });
            pickerBody.appendChild(tile);
        });
    }

    // ─────────── Camera / microphone picker (opened from the "…" menu) ───────────
    function onDevicesOutside(e) {
        if (devicesEl && !devicesEl.contains(e.target)) closeDevices();
    }
    function openDevices() {
        if (pickerOpen) closePicker();
        devicesOpen = true;
        updateExpanded();
        devicesEl.classList.add("visible");
        renderDevices();
        document.addEventListener("mousedown", onDevicesOutside, true);
    }
    function closeDevices() {
        if (!devicesOpen) return;
        devicesOpen = false;
        devicesEl.classList.remove("visible");
        document.removeEventListener("mousedown", onDevicesOutside, true);
        updateExpanded();
    }
    function addDeviceNote(text) {
        var note = document.createElement("div");
        note.className = "dv-empty";
        note.textContent = text;
        dvBody.appendChild(note);
    }
    function addDeviceGroup(label, list, currentId, kind, enabled) {
        var head = document.createElement("div");
        head.className = "dv-group";
        var gico = document.createElement("span");
        gico.className = "dv-group-ico";
        gico.innerHTML = kind === "camera" ? ICON_CAMERA : ICON_MIC;
        head.appendChild(gico);
        var glabel = document.createElement("span");
        glabel.textContent = label;
        head.appendChild(glabel);
        dvBody.appendChild(head);
        var isCamera = kind === "camera";
        // Distinguish "no selection because it's off" from "there really is no device".
        if (!enabled) {
            addDeviceNote(
                isCamera
                    ? t("meetingBar.cameraOff", "Your camera is off — turn it on to choose one.")
                    : t("meetingBar.microphoneOff", "Your microphone is off — turn it on to choose one.")
            );
            return;
        }
        if (!list || list.length === 0) {
            addDeviceNote(
                isCamera
                    ? t("meetingBar.noCamera", "No camera found.")
                    : t("meetingBar.noMicrophone", "No microphone found.")
            );
            return;
        }
        list.forEach(function (device) {
            var row = document.createElement("button");
            row.type = "button";
            row.className = "dv-item" + (device.id === currentId ? " is-current" : "");
            var chk = document.createElement("span");
            chk.className = "dv-check";
            chk.innerHTML = ICON_CHECK;
            row.appendChild(chk);
            var name = document.createElement("span");
            name.className = "dv-name";
            name.textContent = device.label || device.id;
            row.appendChild(name);
            row.addEventListener("click", function () {
                api.sendCommand({ type: "pick-device", kind: kind, deviceId: device.id });
                closeDevices();
            });
            dvBody.appendChild(row);
        });
    }
    function renderDevices() {
        if (!devicesOpen) return;
        var d = lastDevices || { cameras: [], microphones: [] };
        dvBody.innerHTML = "";
        addDeviceGroup(t("meetingBar.camera", "Camera"), d.cameras || [], d.currentCameraId, "camera", lastCamEnabled);
        addDeviceGroup(
            t("meetingBar.microphone", "Microphone"),
            d.microphones || [],
            d.currentMicrophoneId,
            "microphone",
            lastMicEnabled
        );
    }
    dvCancel.addEventListener("click", closeDevices);

    pickerCancel.addEventListener("click", closePicker);
    pickerTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            pickerTabs.forEach(function (t) {
                t.classList.remove("active");
            });
            tab.classList.add("active");
            pickerKind = tab.dataset.kind === "window" ? "window" : "screen";
            renderPicker();
        });
    });
    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        if (menuOpen) closeMenu();
        else if (pickerOpen) closePicker();
        else if (devicesOpen) closeDevices();
    });

    // Signal readiness AFTER all subscriptions are wired; the main process replays the last
    // pushed state on this signal so the bar never shows stale defaults.
    api.ready();
})();
