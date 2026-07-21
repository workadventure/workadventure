// Meeting bar renderer (sandboxed, vanilla JS).
//
// Zoom-style presenter controls floating on the SHARED screen: mic / camera / switch source /
// stop share / annotate / hide-annotations-locally / back to the app. The window itself is
// content-protected in the main process, so none of this UI leaks into the captured stream.
// It is a thin, stateless client: state is pushed by the WorkAdventure renderer, every click
// goes back as a command.
(function () {
    "use strict";

    var api = window.WAHud;
    if (!api) {
        console.error("Meeting bar renderer: WAHud not exposed");
        return;
    }

    var btnMic = document.getElementById("bar-mic");
    var btnCam = document.getElementById("bar-cam");
    var btnSwitch = document.getElementById("bar-switch");
    var btnStop = document.getElementById("bar-stop");
    var btnAnnotate = document.getElementById("bar-annotate");
    var btnEye = document.getElementById("bar-eye");
    var btnBack = document.getElementById("bar-back");
    var picker = document.getElementById("picker");
    var pickerBody = document.getElementById("pk-body");
    var pickerCancel = document.getElementById("pk-cancel");
    var pickerTabs = picker.querySelectorAll(".pk-tab");

    var pickerOpen = false;
    var pickerKind = "screen";
    var lastSources = [];

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
        // Eye "on" = annotations visible; locallyHidden flips it off.
        setBtnState(btnEye, annotation.locallyHidden !== true, false);
        btnEye.classList.toggle("is-active", annotation.locallyHidden === true);
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
    btnEye.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-toggle-local-hide" });
    });
    btnBack.addEventListener("click", function () {
        api.sendCommand({ type: "focus-main" });
    });

    // ─────────── Direct source switcher ───────────
    btnSwitch.addEventListener("click", function () {
        if (pickerOpen) {
            closePicker();
        } else {
            openPicker();
        }
    });

    function openPicker() {
        pickerOpen = true;
        api.setExpanded(true);
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
        api.setExpanded(false);
    }

    function renderPicker() {
        if (!pickerOpen) return;
        pickerBody.innerHTML = "";
        pickerBody.className = "pk-body";
        var filtered = lastSources.filter(function (s) { return s.type === pickerKind; });
        if (filtered.length === 0) {
            var note = document.createElement("div");
            note.className = "pk-note";
            note.textContent = pickerKind === "screen"
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
                    ? (index + 1) + " · " + (source.name || "Screen")
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

    pickerCancel.addEventListener("click", closePicker);
    pickerTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            pickerTabs.forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            pickerKind = tab.dataset.kind === "window" ? "window" : "screen";
            renderPicker();
        });
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && pickerOpen) closePicker();
    });

    // Signal readiness AFTER all subscriptions are wired; the main process replays the last
    // pushed state on this signal so the bar never shows stale defaults.
    api.ready();
})();
