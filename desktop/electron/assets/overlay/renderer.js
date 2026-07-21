// Transparent screen-annotation overlay renderer (sandboxed, vanilla JS).
//
// It renders the presenter's annotation elements on top of the real screen and captures pointer
// input to draw new ones, sending them back to WorkAdventure over window.WAOverlay.
//
// NOTE: the drawing math below intentionally mirrors
// play/src/front/Components/Video/annotationRender.ts. The overlay runs in an isolated Electron
// renderer and cannot import that TS module without a dedicated browser bundle step, so the logic
// is duplicated here. Keep the two in sync (a shared bundle is a future cleanup).
(function () {
    "use strict";

    var api = window.WAOverlay;
    var canvas = document.getElementById("overlay-canvas");
    if (!api || !canvas) {
        console.error("Overlay renderer: WAOverlay or canvas missing");
        return;
    }
    var ctx = canvas.getContext("2d");

    var EMIT_INTERVAL_MS = 50;
    var HIT_THRESHOLD = 0.02;

    var elements = [];
    var tool = { tool: "pen", color: "#ff3b30", width: 0.005 };
    var drawMode = false;

    var draft = undefined;
    var drawing = false;
    var lastEmit = 0;
    var localCounter = 0;

    function clamp01(v) {
        return Math.min(1, Math.max(0, v));
    }

    function resize() {
        var dpr = window.devicePixelRatio || 1;
        var w = Math.max(1, Math.round(window.innerWidth * dpr));
        var h = Math.max(1, Math.round(window.innerHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        render();
    }

    function distanceToSegment(p, a, b, aspect) {
        var ax = a.x * aspect;
        var bx = b.x * aspect;
        var pxc = p.x * aspect;
        var dx = bx - ax;
        var dy = b.y - a.y;
        var lengthSquared = dx * dx + dy * dy;
        if (lengthSquared === 0) {
            return Math.hypot(pxc - ax, p.y - a.y);
        }
        var t = ((pxc - ax) * dx + (p.y - a.y) * dy) / lengthSquared;
        t = Math.min(1, Math.max(0, t));
        return Math.hypot(pxc - (ax + t * dx), p.y - (a.y + t * dy));
    }

    function hitTest(element, p, aspect) {
        var points = element.points || [];
        if (points.length === 0) return false;
        if (element.tool === "text") {
            var anchor = points[0];
            return Math.abs(p.x - anchor.x) < 0.08 && p.y > anchor.y - 0.05 && p.y < anchor.y + 0.02;
        }
        if (element.tool === "rect" && points.length >= 2) {
            var edges = [
                [{ x: points[0].x, y: points[0].y }, { x: points[1].x, y: points[0].y }],
                [{ x: points[1].x, y: points[0].y }, { x: points[1].x, y: points[1].y }],
                [{ x: points[1].x, y: points[1].y }, { x: points[0].x, y: points[1].y }],
                [{ x: points[0].x, y: points[1].y }, { x: points[0].x, y: points[0].y }],
            ];
            return edges.some(function (e) {
                return distanceToSegment(p, e[0], e[1], aspect) < HIT_THRESHOLD;
            });
        }
        if (points.length === 1) {
            return Math.hypot((p.x - points[0].x) * aspect, p.y - points[0].y) < HIT_THRESHOLD;
        }
        for (var i = 1; i < points.length; i++) {
            if (distanceToSegment(p, points[i - 1], points[i], aspect) < HIT_THRESHOLD) return true;
        }
        return false;
    }

    function drawElement(element) {
        var w = canvas.width;
        var h = canvas.height;
        var minSide = Math.min(w, h);
        var lineWidth = Math.max(1, element.width * minSide);
        ctx.strokeStyle = element.color;
        ctx.fillStyle = element.color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        var points = element.points || [];
        if (points.length === 0) return;

        if (element.tool === "text") {
            var fontSize = Math.max(element.width * minSide * 4, minSide * 0.025);
            ctx.font = fontSize + "px sans-serif";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(element.text || "", points[0].x * w, points[0].y * h);
            return;
        }
        if (element.tool === "rect" && points.length >= 2) {
            ctx.strokeRect(points[0].x * w, points[0].y * h, (points[1].x - points[0].x) * w, (points[1].y - points[0].y) * h);
            return;
        }
        if (points.length === 1) {
            ctx.beginPath();
            ctx.arc(points[0].x * w, points[0].y * h, lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        ctx.beginPath();
        ctx.moveTo(points[0].x * w, points[0].y * h);
        for (var i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x * w, points[i].y * h);
        }
        ctx.stroke();
        if (element.tool === "arrow") {
            var from = points[points.length - 2];
            var to = points[points.length - 1];
            var angle = Math.atan2((to.y - from.y) * h, (to.x - from.x) * w);
            var headLength = Math.max(lineWidth * 3, minSide * 0.03);
            ctx.beginPath();
            ctx.moveTo(to.x * w, to.y * h);
            ctx.lineTo(to.x * w - headLength * Math.cos(angle - Math.PI / 6), to.y * h - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(to.x * w, to.y * h);
            ctx.lineTo(to.x * w - headLength * Math.cos(angle + Math.PI / 6), to.y * h - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < elements.length; i++) {
            drawElement(elements[i]);
        }
        if (draft) drawElement(draft);
    }

    function pointerToNorm(event) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: clamp01((event.clientX - rect.left) / rect.width),
            y: clamp01((event.clientY - rect.top) / rect.height),
        };
    }

    function eraseAt(p) {
        var aspect = window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
        for (var i = elements.length - 1; i >= 0; i--) {
            if (hitTest(elements[i], p, aspect)) {
                api.emitDraw({ type: "remove", id: elements[i].id });
                return;
            }
        }
    }

    canvas.addEventListener("pointerdown", function (event) {
        if (!drawMode) return;
        var p = pointerToNorm(event);
        if (tool.tool === "eraser") {
            eraseAt(p);
            return;
        }
        if (tool.tool === "text") {
            var value = window.prompt("Text");
            if (value && value.trim() !== "") {
                api.emitDraw({
                    type: "upsert",
                    element: {
                        id: "overlay-" + ++localCounter,
                        authorUserId: "",
                        tool: "text",
                        color: tool.color,
                        width: tool.width,
                        points: [p],
                        text: value,
                    },
                    commit: true,
                });
            }
            return;
        }
        drawing = true;
        try {
            canvas.setPointerCapture(event.pointerId);
        } catch (e) {
            /* ignore */
        }
        draft = {
            id: "overlay-" + ++localCounter,
            authorUserId: "",
            tool: tool.tool,
            color: tool.color,
            width: tool.width,
            points: tool.tool === "pen" ? [p] : [p, p],
        };
    });

    canvas.addEventListener("pointermove", function (event) {
        if (!drawing || !draft) return;
        var p = pointerToNorm(event);
        if (draft.tool === "pen") {
            draft.points.push(p);
        } else {
            draft.points = [draft.points[0], p];
        }
        render();
        var now = Date.now();
        if (now - lastEmit > EMIT_INTERVAL_MS) {
            lastEmit = now;
            api.emitDraw({ type: "upsert", element: draft, commit: false });
        }
    });

    function finishStroke(event) {
        if (!drawing || !draft) return;
        drawing = false;
        try {
            canvas.releasePointerCapture(event.pointerId);
        } catch (e) {
            /* ignore */
        }
        api.emitDraw({ type: "upsert", element: draft, commit: true });
        draft = undefined;
        render();
    }
    canvas.addEventListener("pointerup", finishStroke);
    canvas.addEventListener("pointercancel", finishStroke);

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") api.requestExit();
    });

    // ─────────── IPC ───────────
    api.onElements(function (list) {
        elements = Array.isArray(list) ? list : [];
        render();
    });
    api.onTool(function (t) {
        if (t) tool = t;
    });
    api.onDrawMode(function (enabled) {
        drawMode = enabled === true;
        canvas.classList.toggle("draw", drawMode);
        // Tools live in the separate content-protected annotation-bar window — this window is
        // captured into the shared stream, so it must only ever contain the strokes themselves.
    });

    window.addEventListener("resize", resize);
    resize();
    api.ready();
})();
