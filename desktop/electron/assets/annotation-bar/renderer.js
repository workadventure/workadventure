// Annotation bar renderer (sandboxed, vanilla JS).
//
// A fully separate, content-protected toolbar window: tool/color selection, undo, clear,
// hide-annotations-locally, allow-others and "stop annotating". It never draws anything itself —
// the strokes live on the transparent overlay window (which IS captured); this bar is excluded
// from the captured stream. Stateless: selection state comes from the WorkAdventure renderer,
// clicks go back as commands.
(function () {
    "use strict";

    var api = window.WAHud;
    if (!api) {
        console.error("Annotation bar renderer: WAHud not exposed");
        return;
    }

    var toolBtns = document.querySelectorAll("[data-tool]");
    var colorBtns = document.querySelectorAll("[data-color]");
    var btnUndo = document.getElementById("tb-undo");
    var btnClear = document.getElementById("tb-clear");
    var btnEye = document.getElementById("tb-eye");
    var btnOthers = document.getElementById("tb-others");
    var btnDone = document.getElementById("tb-done");

    api.onState(function (state) {
        if (!state || typeof state !== "object") return;
        var annotation = state.annotation || {};
        toolBtns.forEach(function (btn) {
            btn.classList.toggle("is-active", btn.getAttribute("data-tool") === annotation.tool);
        });
        colorBtns.forEach(function (btn) {
            btn.classList.toggle("is-active", btn.getAttribute("data-color") === annotation.color);
        });
        btnEye.dataset.state = annotation.locallyHidden === true ? "off" : "on";
        btnEye.classList.toggle("is-active", annotation.locallyHidden === true);
        btnOthers.classList.toggle("is-active", annotation.othersCanDraw === true);
    });

    toolBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            api.sendCommand({ type: "annotation-set-tool", tool: btn.getAttribute("data-tool") });
        });
    });
    colorBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            api.sendCommand({ type: "annotation-set-color", color: btn.getAttribute("data-color") });
        });
    });
    btnUndo.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-undo" });
    });
    btnClear.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-clear" });
    });
    btnEye.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-toggle-local-hide" });
    });
    btnOthers.addEventListener("click", function () {
        api.sendCommand({ type: "annotation-toggle-others" });
    });
    btnDone.addEventListener("click", function () {
        // Leaves drawing mode; the WorkAdventure renderer closes this bar in response.
        api.sendCommand({ type: "annotation-toggle" });
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") api.sendCommand({ type: "annotation-toggle" });
    });

    api.ready();
})();
