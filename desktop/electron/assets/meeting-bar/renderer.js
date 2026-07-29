// Meeting bar renderer (sandboxed, vanilla JS).
//
// Zoom-style presenter controls floating on the SHARED screen. Compact bar (mic / camera /
// screen-share / annotate / more) with an overflow "…" menu (presenter tools, switch source,
// change devices, display tabs, settings, back to the app). The window is content-protected in
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
    var ICON_CHECK =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>';

    var btnMic = byId("bar-mic");
    var btnCam = byId("bar-cam");
    var btnStop = byId("bar-stop");
    var btnAnnotate = byId("bar-annotate");
    var btnMore = byId("bar-more");

    var menu = byId("menu");
    var menuCaret = byId("mn-caret");
    var miLaser = byId("mn-laser");
    var miSpotlight = byId("mn-spotlight");
    var miLoupe = byId("mn-loupe");
    var miSwitch = byId("mn-switch");
    var miDevices = byId("mn-devices");
    var miTabs = byId("mn-tabs");
    var miSettings = byId("mn-settings");
    var miBack = byId("mn-back");

    var picker = byId("picker");
    var pickerBody = byId("pk-body");
    var pickerCancel = byId("pk-cancel");
    var pickerTabs = picker.querySelectorAll(".pk-tab");

    var devicesEl = byId("devices");
    var dvBody = byId("dv-body");
    var dvCancel = byId("dv-cancel");

    var annotationPanel = byId("annotation");
    var anCaret = byId("an-caret");
    var anTools = annotationPanel.querySelectorAll("[data-tool]");
    var anColors = annotationPanel.querySelectorAll("[data-color]");
    var anUndo = byId("an-undo");
    var anRedo = byId("an-redo");
    var anEye = byId("an-eye");
    var anOthers = byId("an-others");

    var pickerOpen = false;
    var menuOpen = false;
    var devicesOpen = false;
    var annotationActive = false;
    var pickerKind = "screen";
    var lastSources = [];
    var lastDevices = null;
    // The annotation panel is a single short row; grow the window just enough to clear the pill so
    // the transparent area above it doesn't blanket (and swallow clicks over) the shared screen.
    var ANNOTATION_EXPAND_HEIGHT = 128;

    function setBtnState(btn, isOn, forbiddenWhenOff) {
        btn.dataset.state = isOn ? "on" : "off";
        btn.classList.toggle("is-active", isOn === true && !forbiddenWhenOff);
        btn.classList.toggle("is-forbidden", isOn === false && forbiddenWhenOff);
    }

    api.onState(function (state) {
        if (!state || typeof state !== "object") return;
        setBtnState(btnMic, state.micEnabled === true, true);
        setBtnState(btnCam, state.cameraEnabled === true, true);
        var annotation = state.annotation || {};
        setBtnState(btnAnnotate, annotation.active === true, false);
        // Annotation toolbar (a panel of this window): reflect the active tool / colour / toggles.
        annotationActive = annotation.active === true;
        anTools.forEach(function (b) {
            b.classList.toggle("is-active", b.getAttribute("data-tool") === annotation.tool);
        });
        anColors.forEach(function (b) {
            b.classList.toggle("is-active", b.getAttribute("data-color") === annotation.color);
        });
        anEye.dataset.state = annotation.locallyHidden === true ? "off" : "on";
        anEye.classList.toggle("is-active", annotation.locallyHidden === true);
        anOthers.classList.toggle("is-active", annotation.othersCanDraw === true);
        // Presenter tools: highlight only the active one (in the "…" menu).
        var presenterTool = state.presenterTool || "none";
        miLaser.classList.toggle("is-active", presenterTool === "laser");
        miSpotlight.classList.toggle("is-active", presenterTool === "spotlight");
        miLoupe.classList.toggle("is-active", presenterTool === "loupe");
        lastDevices = state.devices || null;
        if (devicesOpen) renderDevices();
        miTabs.setAttribute("aria-checked", state.tabBarEnabled === true ? "true" : "false");
        syncAnnotationPanel();
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
    btnAnnotate.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-toggle" });
    });

    // ─────────── Annotation toolbar (panel above the pill, like the "…" menu) ───────────
    // Grow the window to the tallest open panel: the picker/menu need the full height, the short
    // annotation row needs far less, and nothing open collapses back to the pill.
    function updateExpanded() {
        if (menuOpen || pickerOpen || devicesOpen) {
            api.setExpanded(true);
        } else if (annotationActive) {
            api.setExpanded(true, ANNOTATION_EXPAND_HEIGHT);
        } else {
            api.setExpanded(false);
        }
    }
    function positionAnnotationCaret() {
        var pr = annotationPanel.getBoundingClientRect();
        var ar = btnAnnotate.getBoundingClientRect();
        anCaret.style.left = Math.round((ar.left + ar.right) / 2 - pr.left) + "px";
    }
    // The annotation panel yields to the transient "…" menu / pickers, then returns when they close.
    function syncAnnotationPanel() {
        var show = annotationActive && !menuOpen && !pickerOpen && !devicesOpen;
        annotationPanel.classList.toggle("visible", show);
        if (show) positionAnnotationCaret();
        updateExpanded();
    }
    anTools.forEach(function (b) {
        b.addEventListener("click", function () {
            api.sendCommand({ type: "annotation-set-tool", tool: b.getAttribute("data-tool") });
        });
    });
    anColors.forEach(function (b) {
        b.addEventListener("click", function () {
            api.sendCommand({ type: "annotation-set-color", color: b.getAttribute("data-color") });
        });
    });
    anUndo.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-undo" });
    });
    anRedo.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-redo" });
    });
    anEye.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-toggle-local-hide" });
    });
    anOthers.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-toggle-others" });
    });

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
        syncAnnotationPanel();
        positionMenu();
        document.addEventListener("mousedown", onMenuOutside, true);
    }
    function closeMenu() {
        if (!menuOpen) return;
        menuOpen = false;
        btnMore.setAttribute("aria-expanded", "false");
        menu.classList.remove("visible");
        document.removeEventListener("mousedown", onMenuOutside, true);
        syncAnnotationPanel();
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
    miLaser.addEventListener(
        "click",
        menuAction(function () {
            api.sendCommand({ type: "presenter-set-tool", tool: "laser" });
        })
    );
    miSpotlight.addEventListener(
        "click",
        menuAction(function () {
            api.sendCommand({ type: "presenter-set-tool", tool: "spotlight" });
        })
    );
    miLoupe.addEventListener(
        "click",
        menuAction(function () {
            api.sendCommand({ type: "presenter-set-tool", tool: "loupe" });
        })
    );
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
    miBack.addEventListener(
        "click",
        menuAction(function () {
            api.sendCommand({ type: "focus-main" });
        })
    );

    // ─────────── Direct source switcher (opened from the "…" menu) ───────────
    function openPicker() {
        if (devicesOpen) closeDevices();
        pickerOpen = true;
        syncAnnotationPanel();
        picker.classList.add("visible");
        pickerBody.className = "pk-body loading";
        pickerBody.textContent = "Loading sources…";
        api.requestSources()
            .then(function (sources) {
                lastSources = Array.isArray(sources) ? sources : [];
                renderPicker();
            })
            .catch(function (err) {
                console.warn("requestSources failed", err);
                pickerBody.className = "pk-body empty";
                pickerBody.textContent = "Unable to list sources.";
            });
    }

    function closePicker() {
        pickerOpen = false;
        picker.classList.remove("visible");
        syncAnnotationPanel();
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
                    ? "No screen available. Check the Screen Recording permission."
                    : "No window available.";
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
                    ? index + 1 + " · " + (source.name || "Screen")
                    : source.name || "Untitled";
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
    function openDevices() {
        if (pickerOpen) closePicker();
        devicesOpen = true;
        syncAnnotationPanel();
        devicesEl.classList.add("visible");
        renderDevices();
    }
    function closeDevices() {
        devicesOpen = false;
        devicesEl.classList.remove("visible");
        syncAnnotationPanel();
    }
    function addDeviceGroup(label, list, currentId, kind) {
        if (!list || list.length === 0) return;
        var head = document.createElement("div");
        head.className = "dv-group";
        head.textContent = label;
        dvBody.appendChild(head);
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
        var cams = d.cameras || [];
        var mics = d.microphones || [];
        dvBody.innerHTML = "";
        addDeviceGroup("Camera", cams, d.currentCameraId, "camera");
        addDeviceGroup("Microphone", mics, d.currentMicrophoneId, "microphone");
        if (cams.length === 0 && mics.length === 0) {
            var empty = document.createElement("div");
            empty.className = "dv-empty";
            empty.textContent = "No devices available.";
            dvBody.appendChild(empty);
        }
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
        else if (annotationActive) api.sendCommand({ type: "annotation-toggle" });
    });

    // Signal readiness AFTER all subscriptions are wired; the main process replays the last
    // pushed state on this signal so the bar never shows stale defaults.
    api.ready();
})();
