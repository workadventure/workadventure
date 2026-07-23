// PiP utility window renderer.
//
// ARCHITECTURE — tileKey-centric (mirrors the web PiP):
// ──────────────────────────────────────────────────────
//   In the web PiP, the DOM is reparented from the main renderer; tiles persist as long as the
//   underlying Svelte Streamable (VideoBox in streamableCollectionStore) exists, regardless of
//   what happens to the MediaStreamTracks underneath. Toggling cam/mic just flips a flag inside
//   the persistent <MediaBox> — the DOM element is the same.
//
//   We reproduce that contract here. The primary index is `tiles: Map<tileKey, TileElement>`
//   where tileKey === source VideoBox.uniqueId. Each TileElement owns ONE persistent <div>
//   containing both a <video> layer and an avatar layer; only their visibility flips when a
//   MediaStreamTrack appears or disappears. State pushes drive create/remove of TileElements;
//   pc.ontrack and ended events just bind/unbind the track inside the matching tile.
//
//   Net result: tile lifecycle is decoupled from WebRTC track lifecycle, so renegotiations,
//   replaceTrack calls, mic-toggle-induced getUserMedia churn, and simulcast layer swaps all
//   leave the visible grid unchanged.
(function () {
    "use strict";

    var api = window.WADPiP;
    var videosContainer = document.getElementById("videos");
    var emptyEl = document.getElementById("empty");
    var btnMic = document.getElementById("btn-mic");
    var btnCam = document.getElementById("btn-cam");
    var btnShare = document.getElementById("btn-share");
    var btnBack = document.getElementById("btn-back");
    var sourcePicker = document.getElementById("source-picker");
    var sourcePickerBody = document.getElementById("sp-body");
    var sourcePickerCancel = document.getElementById("sp-cancel");
    var sourcePickerTabs = sourcePicker ? sourcePicker.querySelectorAll(".sp-tab") : [];
    // The PiP only hosts the annotation ON/OFF toggle; the tools live on the overlay window.
    var btnAnnotate = document.getElementById("btn-annotate");

    if (!api) {
        console.error("PiP renderer: WADPiP not exposed");
        return;
    }

    // ─────────── State ───────────
    var peerConnection;
    /** tileKey → TileElement (the ONLY source of truth for the visible grid). */
    var tiles = new Map();
    /** trackId → tileKey, populated by applyState; consulted on pc.ontrack. */
    var tileKeyByTrackId = new Map();
    /** trackId → MediaStreamTrack parked while waiting for the matching state to land. */
    var pendingTracks = new Map();
    var lastSources = [];
    var sourcePickerKind = "screen";
    var sourcePickerOpen = false;
    var currentScreenSharing = false;

    // ─────────── Tile DOM owner ───────────
    function TileElement(tileKey, meta) {
        this.tileKey = tileKey;
        this.trackId = null;

        var container = document.createElement("div");
        container.className = "tile";
        container.dataset.tileKey = tileKey;
        this.container = container;

        var videoLayer = document.createElement("div");
        videoLayer.className = "video-layer";
        var video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // audio stays in the main window — never duplicate playback
        videoLayer.appendChild(video);
        container.appendChild(videoLayer);

        var avatarLayer = document.createElement("div");
        avatarLayer.className = "avatar-layer";
        var avatarEl = document.createElement("div");
        avatarEl.className = "avatar";
        avatarLayer.appendChild(avatarEl);
        container.appendChild(avatarLayer);

        var nameChip = document.createElement("span");
        nameChip.className = "name-chip";
        container.appendChild(nameChip);

        container.appendChild(makeMicBadge());

        this.video = video;
        this.avatarEl = avatarEl;
        this.nameChip = nameChip;

        this.update(meta);
    }

    TileElement.prototype.update = function (meta) {
        var name = meta.name || (meta.isSelf ? "You" : "");
        var colors = colorForName(name);
        this.nameChip.textContent = name;
        this.nameChip.style.display = name ? "" : "none";
        this.container.style.setProperty("--tile-bg", colors.bg);
        this.avatarEl.style.background = colors.avatar;
        this.avatarEl.textContent = computeInitials(name);
        this.container.classList.toggle("is-self", meta.isSelf === true);
        this.container.classList.toggle("is-muted", meta.hasAudio === false);
        // Track presence wins over the meta hint: even if state says hasVideo, we only show the
        // video layer when an actual track is bound — avoids a black flicker between state push
        // and the matching pc.ontrack event.
        this.container.classList.toggle("has-video", this.trackId !== null);
    };

    TileElement.prototype.attachTrack = function (track) {
        if (this.trackId === track.id) return;
        this.trackId = track.id;
        try { this.video.srcObject = new MediaStream([track]); } catch (e) { /* ignore */ }
        this.container.classList.add("has-video");
        var self = this;
        track.addEventListener("ended", function () {
            // Only react if we're still the owner — a renegotiation might have already swapped.
            if (self.trackId === track.id) self.detachTrack();
        });
        var playPromise = this.video.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function (err) { console.warn("PiP video play() rejected", err); });
        }
    };

    TileElement.prototype.detachTrack = function () {
        if (this.trackId === null) return;
        this.trackId = null;
        try { this.video.srcObject = null; } catch (e) { /* ignore */ }
        this.container.classList.remove("has-video");
    };

    TileElement.prototype.destroy = function () {
        try { this.video.srcObject = null; } catch (e) { /* ignore */ }
        this.container.remove();
    };

    // ─────────── Helpers ───────────
    function computeInitials(name) {
        if (!name) return "?";
        var parts = String(name).trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function colorForName(name) {
        var s = String(name || "");
        var hash = 0;
        for (var i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
        var hue = Math.abs(hash) % 360;
        return {
            bg: "hsl(" + hue + ", 35%, 22%)",
            avatar: "hsl(" + hue + ", 60%, 55%)",
        };
    }

    function makeMicBadge() {
        var span = document.createElement("span");
        span.className = "mic-off-badge";
        span.setAttribute("aria-hidden", "true");
        span.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -.13 .874m-2 2a3 3 0 0 1 -3.87 -2.872v-1"/><path d="M5 10a7 7 0 0 0 10.846 5.85m2 -2a6.967 6.967 0 0 0 1.152 -3.85"/></svg>';
        return span;
    }

    function reorderSelfTilesFirst() {
        // Keep the local user's own camera at the front of the grid, always. Collect the self tiles
        // then re-insert them before the current first child in reverse, so multiple self tiles
        // (e.g. camera + screen share) keep their relative order and all land ahead of the peers.
        var selfTiles = [];
        tiles.forEach(function (tile) {
            if (tile.container.classList.contains("is-self") && tile.container.parentNode === videosContainer) {
                selfTiles.push(tile.container);
            }
        });
        for (var i = selfTiles.length - 1; i >= 0; i--) {
            videosContainer.insertBefore(selfTiles[i], videosContainer.firstChild);
        }
    }

    function updateLayout() {
        var count = tiles.size;
        emptyEl.classList.toggle("hidden", count > 0);
        videosContainer.style.display = count === 0 ? "none" : "grid";
        var cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
        videosContainer.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    }

    // ─────────── Peer connection ───────────
    function ensurePeerConnection() {
        if (peerConnection) return peerConnection;
        peerConnection = new RTCPeerConnection({ iceServers: [] });
        peerConnection.addEventListener("icecandidate", function (event) {
            if (event.candidate) api.sendIce(event.candidate.toJSON());
        });
        peerConnection.addEventListener("track", function (event) {
            if (event.track && event.track.kind === "video") onIncomingTrack(event.track);
        });
        peerConnection.addEventListener("connectionstatechange", function () {
            var s = peerConnection.connectionState;
            if (s === "failed" || s === "closed") {
                teardown();
                api.requestClose();
            }
        });
        return peerConnection;
    }

    function onIncomingTrack(track) {
        var tileKey = tileKeyByTrackId.get(track.id);
        if (tileKey && tiles.has(tileKey)) {
            tiles.get(tileKey).attachTrack(track);
            return;
        }
        // State hasn't told us which tile this track belongs to yet — park it. The next applyState
        // pushes the mapping and we'll bind on the spot.
        pendingTracks.set(track.id, track);
    }

    function flushPendingTracks() {
        if (pendingTracks.size === 0) return;
        pendingTracks.forEach(function (track, trackId) {
            var tileKey = tileKeyByTrackId.get(trackId);
            if (tileKey && tiles.has(tileKey)) {
                tiles.get(tileKey).attachTrack(track);
                pendingTracks.delete(trackId);
            }
        });
    }

    // ─────────── State application ───────────
    function applyState(state) {
        if (!state || typeof state !== "object") return;
        var incoming = Array.isArray(state.tiles) ? state.tiles : [];

        // Build the new keyed snapshot. Multiple state entries can share a tileKey (e.g. a tile
        // with no track has one placeholder entry; a tile with N tracks would have N entries —
        // we collapse to the first because the persistent DOM tile only has one <video>).
        var byKey = new Map();
        incoming.forEach(function (t) {
            if (!t || typeof t.tileKey !== "string") return;
            if (!byKey.has(t.tileKey)) byKey.set(t.tileKey, t);
        });

        // 1. Refresh trackId → tileKey map (rebuild fully so we never carry stale mappings).
        tileKeyByTrackId.clear();
        incoming.forEach(function (t) {
            if (t && t.trackId && t.tileKey) tileKeyByTrackId.set(t.trackId, t.tileKey);
        });

        // 2. Remove tiles no longer in state (participant left).
        Array.from(tiles.keys()).forEach(function (key) {
            if (!byKey.has(key)) {
                tiles.get(key).destroy();
                tiles.delete(key);
            }
        });

        // 3. Create or update tiles in state.
        byKey.forEach(function (meta, key) {
            var tile = tiles.get(key);
            if (!tile) {
                tile = new TileElement(key, meta);
                tiles.set(key, tile);
                videosContainer.appendChild(tile.container);
            } else {
                tile.update(meta);
            }
            // Drop a bound track if the state no longer references it — the participant turned
            // their cam off or the sender side replaced the track. The tile DOM stays.
            if (tile.trackId !== null && tile.trackId !== meta.trackId) {
                tile.detachTrack();
            }
        });

        // 4. Now that the new mapping is in place, attach any pending tracks that found a home.
        flushPendingTracks();

        // 5. Toolbar.
        setBtnState(btnMic, state.micEnabled, /*forbiddenWhenOff*/ true);
        setBtnState(btnCam, state.cameraEnabled, /*forbiddenWhenOff*/ true);
        setBtnState(btnShare, state.screenSharing, /*forbiddenWhenOff*/ false);
        if (state.canScreenShare === false) {
            btnShare.setAttribute("disabled", "disabled");
        } else {
            btnShare.removeAttribute("disabled");
        }
        applyAnnotationState(state.annotation);
        currentScreenSharing = state.screenSharing === true;
        if (currentScreenSharing && sourcePickerOpen) closeSourcePicker();

        reorderSelfTilesFirst();
        updateLayout();
    }

    function setBtnState(btn, isOn, forbiddenWhenOff) {
        btn.dataset.state = isOn ? "on" : "off";
        btn.classList.toggle("is-active", isOn === true && !forbiddenWhenOff);
        btn.classList.toggle("is-forbidden", isOn === false && forbiddenWhenOff);
    }

    function applyAnnotationState(annotation) {
        var available = Boolean(annotation && annotation.available === true);
        var active = Boolean(annotation && annotation.active === true);
        if (btnAnnotate) {
            // Only offer the toggle while a screen is being shared.
            btnAnnotate.style.display = available ? "" : "none";
            setBtnState(btnAnnotate, active, false);
        }
    }

    function teardown() {
        if (peerConnection) {
            try { peerConnection.close(); } catch (e) { /* ignore */ }
            peerConnection = undefined;
        }
        tiles.forEach(function (tile) { tile.destroy(); });
        tiles.clear();
        tileKeyByTrackId.clear();
        pendingTracks.clear();
        updateLayout();
    }

    // ─────────── IPC plumbing ───────────
    // Serialize offer handling. Two offers arriving in quick succession (main renderer
    // renegotiates on new track then immediately again on state push) would otherwise interleave:
    // offer1 → createAnswer1 (in-flight), offer2 → setRemoteDescription rewrites state, answer1
    // resolves and tries setLocalDescription on a state that's already back to `stable`, WebRTC
    // throws "Called in wrong state: stable". Chaining onto a promise queue guarantees the
    // sequence is offer→createAnswer→setLocalDescription→sendAnswer for offer N before offer N+1
    // starts, matching the invariant setRemoteDescription/setLocalDescription enforce.
    var offerQueue = Promise.resolve();
    api.onOffer(function (sdp) {
        offerQueue = offerQueue.then(function () {
            var pc = ensurePeerConnection();
            return pc
                .setRemoteDescription(sdp)
                .then(function () {
                    return pc.createAnswer();
                })
                .then(function (answer) {
                    return pc.setLocalDescription(answer);
                })
                .then(function () {
                    if (pc.localDescription) {
                        api.sendAnswer({ type: pc.localDescription.type, sdp: pc.localDescription.sdp });
                    }
                })
                .catch(function (err) {
                    console.warn("PiP offer handling failed", err);
                });
        });
    });

    api.onIce(function (candidate) {
        ensurePeerConnection().addIceCandidate(candidate).catch(function (err) {
            console.warn("PiP addIceCandidate failed", err);
        });
    });

    api.onClose(function () { teardown(); });
    api.onState(applyState);

    function bindCommand(el, type) {
        el.addEventListener("click", function () {
            if (el.hasAttribute("disabled")) return;
            api.sendCommand({ type: type });
        });
    }
    bindCommand(btnMic, "toggle-mic");
    bindCommand(btnCam, "toggle-camera");
    bindCommand(btnBack, "focus-main");

    // Annotation ON/OFF toggle (the tools themselves live on the overlay window).
    if (btnAnnotate) {
        btnAnnotate.addEventListener("click", function () {
            if (btnAnnotate.style.display === "none") return;
            api.sendCommand({ type: "annotation-toggle" });
        });
    }

    // ─────────── Screen-share source picker ───────────
    btnShare.addEventListener("click", function () {
        if (btnShare.hasAttribute("disabled")) return;
        if (currentScreenSharing) {
            api.sendCommand({ type: "toggle-screenshare" });
            return;
        }
        openSourcePicker();
    });

    function openSourcePicker() {
        if (sourcePickerOpen) return;
        sourcePickerOpen = true;
        sourcePicker.classList.add("visible");
        sourcePickerBody.className = "sp-body loading";
        sourcePickerBody.textContent = "Loading sources…";
        api.requestSources()
            .then(function (sources) {
                lastSources = Array.isArray(sources) ? sources : [];
                renderSourcePicker();
            })
            .catch(function (err) {
                console.warn("requestSources failed", err);
                showPermissionHint();
            });
    }

    function showPermissionHint() {
        sourcePickerBody.className = "sp-body empty";
        sourcePickerBody.innerHTML = "";
        var msg = document.createElement("div");
        msg.style.textAlign = "center";
        msg.style.padding = "0 16px";
        msg.style.lineHeight = "1.5";
        var isMac = navigator.platform.toLowerCase().indexOf("mac") !== -1;
        msg.innerHTML = isMac
            ? "Screen sharing requires the <b>Screen &amp; System Audio Recording</b> permission.<br>Grant it in <b>System Settings → Privacy &amp; Security</b>, then click Share again."
            : "Unable to list sources. Check that the desktop app has permission to capture the screen.";
        sourcePickerBody.appendChild(msg);
    }

    function closeSourcePicker() {
        sourcePickerOpen = false;
        sourcePicker.classList.remove("visible");
    }

    function renderSourcePicker() {
        sourcePickerBody.innerHTML = "";
        sourcePickerBody.className = "sp-body";
        var filtered = lastSources.filter(function (s) { return s.type === sourcePickerKind; });

        // Screen tab: primary way is "identify" — a big number on each physical screen, click to pick.
        if (sourcePickerKind === "screen" && typeof api.identifyScreens === "function") {
            var idBtn = document.createElement("button");
            idBtn.type = "button";
            idBtn.className = "sp-identify";
            idBtn.textContent = "🔢 Identify screens — click the big number on a screen to share it";
            idBtn.addEventListener("click", function () {
                api.identifyScreens()
                    .then(function (src) {
                        if (src) {
                            api.sendCommand({
                                type: "pick-source",
                                sourceId: src.id,
                                sourceName: src.name || "",
                                displayId: src.display_id,
                            });
                            closeSourcePicker();
                        }
                    })
                    .catch(function (err) { console.warn("identifyScreens failed", err); });
            });
            sourcePickerBody.appendChild(idBtn);
        }

        if (filtered.length === 0) {
            if (sourcePickerKind === "screen") {
                // Displays remain pickable via "Identify" above even without capturer thumbnails.
                if (lastSources.length === 0) {
                    var hint = document.createElement("div");
                    hint.className = "sp-note";
                    hint.textContent = "Grant Screen Recording permission to also see thumbnails.";
                    sourcePickerBody.appendChild(hint);
                }
                return;
            }
            var note = document.createElement("div");
            note.className = "sp-note";
            note.textContent = "No window available.";
            sourcePickerBody.appendChild(note);
            return;
        }
        filtered.forEach(function (source) {
            var tile = document.createElement("button");
            tile.type = "button";
            tile.className = "sp-tile";
            tile.title = source.name || "";
            var img = document.createElement("img");
            img.alt = source.name || "";
            img.src = source.thumbnailURL || "";
            tile.appendChild(img);
            var nameEl = document.createElement("span");
            nameEl.className = "sp-tile-name";
            nameEl.textContent = source.name || "Untitled";
            tile.appendChild(nameEl);
            tile.addEventListener("click", function () {
                api.sendCommand({
                    type: "pick-source",
                    sourceId: source.id,
                    sourceName: source.name || "",
                    displayId: source.display_id,
                });
                closeSourcePicker();
            });
            sourcePickerBody.appendChild(tile);
        });
    }

    sourcePickerCancel.addEventListener("click", closeSourcePicker);
    sourcePickerTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            sourcePickerTabs.forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            sourcePickerKind = tab.dataset.kind === "window" ? "window" : "screen";
            renderSourcePicker();
        });
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && sourcePickerOpen) closeSourcePicker();
    });

    window.addEventListener("pagehide", teardown);
    updateLayout();
    // Signal readiness AFTER all subscriptions are wired. The main process holds pip.open()'s
    // resolution until this fires, so the very first SDP offer arrives at a live renderer.
    api.ready();
})();
