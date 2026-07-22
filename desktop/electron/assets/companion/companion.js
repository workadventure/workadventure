// Companion panel renderer (sandboxed, vanilla JS).
//
// A compact, interactive quick-access panel (People / Chat / Controls / Mentions) shown by the main
// process when WorkAdventure is backgrounded. Stateless: the active world renderer pushes the full
// CompanionState on every change; every action goes back as a command. Reuses the generic WAHud
// bridge (onState / sendCommand / ready) — the state/command shapes are companion-specific.
(function () {
    "use strict";

    var api = window.WAHud;
    if (!api) {
        // eslint-disable-next-line no-console
        console.error("Companion panel: WAHud not exposed");
        return;
    }

    var STATUS_KEYS = ["online", "busy", "back_in_a_moment", "do_not_disturb"];

    // Static icon markup (constant, never user data — safe to assign via innerHTML).
    var ICON_DM =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var ICON_LOCATE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
    var ICON_PING =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

    var els = {
        worldName: document.getElementById("c-world-name"),
        worldSub: document.getElementById("c-world-sub"),
        back: document.getElementById("c-back"),
        close: document.getElementById("c-close"),
        tabs: document.getElementById("c-tabs"),
        people: document.getElementById("c-people"),
        peopleEmpty: document.getElementById("c-people-empty"),
        messages: document.getElementById("c-messages"),
        chatEmpty: document.getElementById("c-chat-empty"),
        composer: document.getElementById("c-composer"),
        chatInput: document.getElementById("c-chat-input"),
        mic: document.getElementById("c-mic"),
        micLabel: document.getElementById("c-mic-label"),
        cam: document.getElementById("c-cam"),
        camLabel: document.getElementById("c-cam-label"),
        share: document.getElementById("c-share"),
        shareLabel: document.getElementById("c-share-label"),
        statusGroup: document.querySelector(".status-group"),
        status: document.getElementById("c-status"),
        statusLocked: document.getElementById("c-status-locked"),
        mentions: document.getElementById("c-mentions"),
        mentionsEmpty: document.getElementById("c-mentions-empty"),
        mentionsBadge: document.getElementById("c-mentions-badge"),
    };

    function send(command) {
        try {
            api.sendCommand(command);
        } catch (e) {
            /* best-effort */
        }
    }

    function setEmpty(emptyEl, isEmpty) {
        if (emptyEl) {
            emptyEl.classList.toggle("is-visible", isEmpty);
        }
    }

    function normStatus(key) {
        return STATUS_KEYS.indexOf(key) !== -1 || key === "offline" ? key : "offline";
    }

    // ---- Tabs (local state) ----
    var activeTab = "people";
    function setTab(tab) {
        activeTab = tab;
        var tabButtons = els.tabs.querySelectorAll(".tab");
        for (var i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.toggle("is-active", tabButtons[i].dataset.tab === tab);
        }
        var panes = document.querySelectorAll(".pane");
        for (var j = 0; j < panes.length; j++) {
            panes[j].classList.toggle("is-active", panes[j].dataset.pane === tab);
        }
        if (tab === "chat" && els.chatInput) {
            els.chatInput.focus();
        }
    }
    els.tabs.addEventListener("click", function (e) {
        var btn = e.target.closest(".tab");
        if (btn && btn.dataset.tab) {
            setTab(btn.dataset.tab);
        }
    });

    // ---- Header ----
    els.back.addEventListener("click", function () {
        send({ type: "focus-main" });
    });
    els.close.addEventListener("click", function () {
        send({ type: "close" });
    });

    // ---- Chat ----
    els.composer.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = els.chatInput.value.trim();
        if (!text) {
            return;
        }
        send({ type: "send-chat", text: text });
        els.chatInput.value = "";
    });

    // ---- People (event delegation for per-row actions) ----
    els.people.addEventListener("click", function (e) {
        var btn = e.target.closest(".mini-btn");
        if (!btn) {
            return;
        }
        var userId = btn.dataset.userId;
        var action = btn.dataset.action;
        if (!userId || !action) {
            return;
        }
        if (action === "dm") {
            send({ type: "dm", userId: userId });
        } else if (action === "locate") {
            send({ type: "locate", userId: userId });
        } else if (action === "ping") {
            send({ type: "ping", userId: userId });
        }
    });

    // ---- Controls ----
    els.mic.addEventListener("click", function () {
        send({ type: "toggle-mic" });
    });
    els.cam.addEventListener("click", function () {
        send({ type: "toggle-camera" });
    });
    els.share.addEventListener("click", function () {
        send({ type: "toggle-screenshare" });
    });
    els.status.addEventListener("click", function (e) {
        var btn = e.target.closest(".status-opt");
        if (btn && btn.dataset.status && !els.statusGroup.classList.contains("is-locked")) {
            send({ type: "set-status", status: btn.dataset.status });
        }
    });

    // ---- Mentions ----
    els.mentions.addEventListener("click", function (e) {
        var row = e.target.closest(".mention");
        if (row) {
            send({ type: "open-mention", tag: row.dataset.tag || undefined });
        }
    });

    // ---- Rendering ----
    function renderPeople(users) {
        els.people.textContent = "";
        setEmpty(els.peopleEmpty, users.length === 0);
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            var row = document.createElement("div");
            row.className = "person";

            var dot = document.createElement("span");
            dot.className = "dot";
            dot.dataset.status = normStatus(u.status);
            if (u.color) {
                dot.style.background = u.color;
            }
            row.appendChild(dot);

            var name = document.createElement("span");
            name.className = "person-name";
            name.textContent = u.name || "Someone";
            row.appendChild(name);

            if (u.isSelf) {
                var you = document.createElement("span");
                you.className = "person-you";
                you.textContent = "you";
                row.appendChild(you);
            } else {
                var actions = document.createElement("div");
                actions.className = "person-actions";
                actions.appendChild(miniButton("dm", u.id, "Message", ICON_DM));
                actions.appendChild(miniButton("locate", u.id, "Locate", ICON_LOCATE));
                actions.appendChild(miniButton("ping", u.id, "Ping", ICON_PING));
                row.appendChild(actions);
            }
            els.people.appendChild(row);
        }
    }

    function miniButton(action, userId, title, iconSvg) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mini-btn";
        btn.dataset.action = action;
        btn.dataset.userId = userId;
        btn.title = title;
        btn.setAttribute("aria-label", title);
        btn.innerHTML = iconSvg;
        return btn;
    }

    function renderMessages(messages) {
        els.messages.textContent = "";
        setEmpty(els.chatEmpty, messages.length === 0);
        for (var i = 0; i < messages.length; i++) {
            var m = messages[i];
            var wrap = document.createElement("div");
            wrap.className = "msg" + (m.isSelf ? " is-self" : "");
            if (!m.isSelf && m.author) {
                var author = document.createElement("div");
                author.className = "msg-author";
                author.textContent = m.author;
                wrap.appendChild(author);
            }
            var text = document.createElement("div");
            text.className = "msg-text";
            text.textContent = m.text || "";
            wrap.appendChild(text);
            els.messages.appendChild(wrap);
        }
        els.messages.scrollTop = els.messages.scrollHeight;
    }

    function renderMentions(mentions) {
        els.mentions.textContent = "";
        setEmpty(els.mentionsEmpty, mentions.length === 0);
        for (var i = 0; i < mentions.length; i++) {
            var mn = mentions[i];
            var row = document.createElement("div");
            row.className = "mention";
            if (mn.tag) {
                row.dataset.tag = mn.tag;
            }
            var title = document.createElement("div");
            title.className = "mention-title";
            title.textContent = mn.title || "Mention";
            row.appendChild(title);
            if (mn.body) {
                var body = document.createElement("div");
                body.className = "mention-body";
                body.textContent = mn.body;
                row.appendChild(body);
            }
            els.mentions.appendChild(row);
        }
        if (mentions.length > 0) {
            els.mentionsBadge.textContent = String(mentions.length);
            els.mentionsBadge.hidden = false;
        } else {
            els.mentionsBadge.hidden = true;
        }
    }

    function setCtl(btn, label, text, state) {
        btn.dataset.state = state;
        if (label) {
            label.textContent = text;
        }
    }

    function renderControls(media) {
        setCtl(els.mic, els.micLabel, media.micEnabled ? "Mute" : "Unmute", media.micEnabled ? "on" : "off");
        setCtl(
            els.cam,
            els.camLabel,
            media.cameraEnabled ? "Camera on" : "Camera off",
            media.cameraEnabled ? "on" : "off"
        );
        els.share.dataset.state = media.screenSharing ? "active" : "off";
        els.shareLabel.textContent = media.screenSharing ? "Stop share" : "Share";
        els.share.disabled = !media.canScreenShare && !media.screenSharing;
        els.share.style.opacity = els.share.disabled ? "0.45" : "";

        var locked = media.statusLocked === true;
        els.statusGroup.classList.toggle("is-locked", locked);
        els.statusLocked.hidden = !locked;
        var opts = els.status.querySelectorAll(".status-opt");
        for (var i = 0; i < opts.length; i++) {
            opts[i].classList.toggle("is-current", !locked && opts[i].dataset.status === media.status);
        }
    }

    function render(state) {
        var world = state.world || {};
        els.worldName.textContent = world.name || "WorkAdventure";
        var count = typeof world.participantCount === "number" ? world.participantCount : 0;
        els.worldSub.textContent = count === 1 ? "1 person present" : count + " people present";

        renderPeople(Array.isArray(state.users) ? state.users : []);
        renderMessages(Array.isArray(state.messages) ? state.messages : []);
        renderMentions(Array.isArray(state.mentions) ? state.mentions : []);
        renderControls(
            state.media || {
                micEnabled: false,
                cameraEnabled: false,
                screenSharing: false,
                canScreenShare: false,
                inMeeting: false,
                status: "online",
                statusLocked: false,
            }
        );
    }

    api.onState(function (state) {
        if (state && typeof state === "object") {
            render(state);
        }
    });

    api.ready();
})();
