// Companion panel renderer (sandboxed, vanilla JS).
//
// Video-first quick-access panel shown by the main process when WorkAdventure is backgrounded.
// The body has three views: the meeting video (a native PiP WebContentsView the main process floats
// over #c-video-area), a People list (the out-of-meeting home), and Chat — People/Chat slide in over
// the video. Stateless: the active world renderer pushes the full CompanionState on every change and
// every action goes back as a command via the generic WAHud bridge (onState / sendCommand / ready).
(function () {
    "use strict";

    var api = window.WAHud;
    if (!api) {
        // eslint-disable-next-line no-console
        console.error("Companion panel: WAHud not exposed");
        return;
    }

    var STATUS_KEYS = ["online", "busy", "back_in_a_moment", "do_not_disturb", "away"];
    var NEARBY_ID = "nearby";

    var ICON_DM =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var ICON_LOCATE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
    var ICON_INVITE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>';
    var ICON_KIND_NEARBY =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.6"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M6 6a8 8 0 0 0 0 12M18 6a8 8 0 0 1 0 12"/></svg>';
    var ICON_KIND_DIRECT =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20v-1a6.5 6.5 0 0 1 13 0v1"/></svg>';
    var ICON_KIND_ROOM =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>';

    function byId(id) {
        return document.getElementById(id);
    }

    var els = {
        openChat: byId("c-open-chat"),
        openPeople: byId("c-open-people"),
        chatBadge: byId("c-chat-badge"),
        peopleCount: byId("c-people-count"),
        peopleCountH: byId("c-people-count-h"),
        hdrMic: byId("c-hdr-mic"),
        hdrCam: byId("c-hdr-cam"),
        hdrShare: byId("c-hdr-share"),
        hdrClose: byId("c-hdr-close"),
        expand: byId("c-expand"),
        statusBtn: byId("c-status-btn"),
        selfDot: byId("c-self-dot"),
        selfName: byId("c-self-name"),
        statusMenu: byId("c-status-menu"),
        statusLocked: byId("c-status-locked"),
        invitation: byId("c-invitation"),
        invitationName: byId("c-invitation-name"),
        inviteAccept: byId("c-invite-accept"),
        inviteDecline: byId("c-invite-decline"),
        body: byId("c-body"),
        videoArea: byId("c-video-area"),
        viewPeople: byId("c-view-people"),
        viewChat: byId("c-view-chat"),
        peopleClose: byId("c-people-close"),
        chatClose: byId("c-chat-close"),
        people: byId("c-people"),
        peopleEmpty: byId("c-people-empty"),
        conversations: byId("c-conversations"),
        conversationsEmpty: byId("c-conversations-empty"),
        conversation: byId("c-conversation"),
        convBack: byId("c-conv-back"),
        convTitle: byId("c-conv-title"),
        convOpenMain: byId("c-conv-open-main"),
        messages: byId("c-messages"),
        messagesEmpty: byId("c-messages-empty"),
        composer: byId("c-composer"),
        chatInput: byId("c-chat-input"),
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

    // ── Views: "video" | "people" | "chat" ──────────────────────────────────
    // Base view is video while in a meeting, People otherwise. People/Chat slide over the video; the
    // native meeting PiP is shown ONLY while the current view is "video" (main keys it off the
    // companion-tab command — "meeting" shows it, anything else hides it).
    var currentView = "people";
    var inMeeting = false;
    var chatSub = "list"; // "list" | "conversation"
    var currentConvId = null;

    function baseView() {
        return inMeeting ? "video" : "people";
    }

    function reportVideoRect() {
        if (!inMeeting || !els.body) {
            return;
        }
        var b = els.body.getBoundingClientRect();
        if (b.width <= 0 || b.height <= 0) {
            return;
        }
        var rect;
        if (currentView === "video") {
            rect = { x: b.left, y: b.top, width: b.width, height: b.height };
        } else {
            // A side panel (people/chat) is open on the left — put the video in the strip to its
            // right. offsetWidth is the panel's LAYOUT width (unaffected by the slide-in transform),
            // so the strip is correct even while the panel is still animating in.
            var panelWidth = (currentView === "chat" ? els.viewChat : els.viewPeople).offsetWidth;
            rect = { x: b.left + panelWidth, y: b.top, width: Math.max(0, b.width - panelWidth), height: b.height };
        }
        send({ type: "meeting-rect", rect: rect });
    }

    function applyView() {
        // People and Chat are both left side panels. The base behind them is the meeting video (in a
        // meeting) or an empty area (out of one). People is shown by default out of a meeting.
        els.viewPeople.dataset.open = currentView === "people" ? "true" : "false";
        els.viewChat.dataset.open = currentView === "chat" ? "true" : "false";
        // With no PiP (out of a meeting) the panels take the full width; in a meeting they are left
        // side panels with the video shrunk to the strip on their right.
        els.viewPeople.classList.toggle("full", !inMeeting);
        els.viewChat.classList.toggle("full", !inMeeting);
        els.openPeople.dataset.active = currentView === "people" ? "true" : "false";
        els.openChat.dataset.active = currentView === "chat" ? "true" : "false";
        // Video shows only in a meeting: full when the video view is on top, or shrunk to the right
        // strip when a side panel is open (so the panel shows on the left). Set the rect FIRST, then
        // reveal the video at that rect — no full-size flash covering the panel.
        if (inMeeting) {
            reportVideoRect();
            send({ type: "companion-tab", tab: "meeting" });
        } else {
            send({ type: "companion-tab", tab: "people" });
        }
    }

    function setView(view) {
        currentView = view;
        applyView();
    }

    els.openPeople.addEventListener("click", function () {
        setView(currentView === "people" ? baseView() : "people");
    });
    els.openChat.addEventListener("click", function () {
        setView(currentView === "chat" ? baseView() : "chat");
    });
    els.peopleClose.addEventListener("click", function () {
        setView(baseView());
    });
    els.chatClose.addEventListener("click", function () {
        setView(baseView());
    });
    window.addEventListener("resize", reportVideoRect);

    // ── Header actions ──────────────────────────────────────────────────────
    els.expand.addEventListener("click", function () {
        send({ type: "focus-main" });
    });
    els.hdrMic.addEventListener("click", function () {
        send({ type: "toggle-mic" });
    });
    els.hdrCam.addEventListener("click", function () {
        send({ type: "toggle-camera" });
    });
    els.hdrShare.addEventListener("click", function () {
        if (els.hdrShare.disabled) return;
        send({ type: "toggle-screenshare" });
    });
    els.hdrClose.addEventListener("click", function () {
        // Dismiss the companion (force-closed — it won't auto-reopen until brought back from the tray).
        send({ type: "close" });
    });

    // ── Status dropdown ─────────────────────────────────────────────────────
    function openStatusMenu(open) {
        els.statusMenu.hidden = !open;
        els.statusBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    els.statusBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openStatusMenu(els.statusMenu.hidden);
    });
    els.statusMenu.addEventListener("click", function (e) {
        var btn = e.target.closest(".status-opt");
        if (btn && btn.dataset.status && !els.statusMenu.classList.contains("is-locked")) {
            send({ type: "set-status", status: btn.dataset.status });
            openStatusMenu(false);
        }
    });
    document.addEventListener("click", function () {
        if (!els.statusMenu.hidden) {
            openStatusMenu(false);
        }
    });

    // ── Meeting invitation banner ───────────────────────────────────────────
    els.inviteAccept.addEventListener("click", function () {
        send({ type: "focus-main" });
        send({ type: "accept-invitation" });
    });
    els.inviteDecline.addEventListener("click", function () {
        send({ type: "decline-invitation" });
    });

    // ── Chat (list <-> conversation) ────────────────────────────────────────
    function showConversationView(show) {
        chatSub = show ? "conversation" : "list";
        els.conversation.hidden = !show;
        els.conversations.hidden = show;
    }
    els.conversations.addEventListener("click", function (e) {
        var row = e.target.closest(".conversation-row");
        if (!row || !row.dataset.conversationId) {
            return;
        }
        send({ type: "select-conversation", conversationId: row.dataset.conversationId });
        currentConvId = row.dataset.conversationId;
        showConversationView(true);
    });
    els.convBack.addEventListener("click", function () {
        showConversationView(false);
    });
    els.convOpenMain.addEventListener("click", function () {
        if (currentConvId && currentConvId !== NEARBY_ID) {
            send({ type: "focus-main" });
            send({ type: "open-conversation-in-main", conversationId: currentConvId });
        }
    });
    els.composer.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = els.chatInput.value.trim();
        if (!text || !currentConvId) {
            return;
        }
        send({ type: "send-message", conversationId: currentConvId, text: text });
        els.chatInput.value = "";
    });

    // ── People per-row actions ──────────────────────────────────────────────
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
        if (action === "invite") {
            send({ type: "invite", userId: userId });
        } else if (action === "dm") {
            send({ type: "dm", userId: userId });
            setView("chat");
            showConversationView(true);
        } else if (action === "locate") {
            send({ type: "focus-main" });
            send({ type: "locate", userId: userId });
        }
    });

    // ── Rendering ───────────────────────────────────────────────────────────
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

    function renderPeople(users) {
        els.people.textContent = "";
        setEmpty(els.peopleEmpty, users.length === 0);
        var selfName = "You";
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            if (u.isSelf && u.name) {
                selfName = u.name;
            }
            var row = document.createElement("div");
            row.className = "person";

            var dot = document.createElement("span");
            dot.className = "dot";
            dot.dataset.status = normStatus(u.status);
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
                actions.appendChild(miniButton("invite", u.id, "Invite to meeting", ICON_INVITE));
                actions.appendChild(miniButton("dm", u.id, "Message", ICON_DM));
                actions.appendChild(miniButton("locate", u.id, "Locate", ICON_LOCATE));
                row.appendChild(actions);
            }
            els.people.appendChild(row);
        }
        // Header self name + people count badges.
        els.selfName.textContent = selfName;
        var count = users.length;
        els.peopleCountH.textContent = String(count);
        els.peopleCount.textContent = count > 99 ? "99+" : String(count);
        els.peopleCount.hidden = count === 0;
    }

    function conversationIcon(kind) {
        var span = document.createElement("span");
        span.className = "conv-icon kind-" + (kind || "room");
        span.innerHTML = kind === "nearby" ? ICON_KIND_NEARBY : kind === "direct" ? ICON_KIND_DIRECT : ICON_KIND_ROOM;
        return span;
    }

    function renderConversationList(conversations) {
        els.conversations.textContent = "";
        for (var i = 0; i < conversations.length; i++) {
            var c = conversations[i];
            var row = document.createElement("button");
            row.type = "button";
            row.className = "conversation-row";
            row.dataset.conversationId = c.id;
            row.appendChild(conversationIcon(c.kind));

            var main = document.createElement("div");
            main.className = "conv-main";

            var top = document.createElement("div");
            top.className = "conv-top";
            var name = document.createElement("span");
            name.className = "conv-name";
            name.textContent = c.name || "Conversation";
            top.appendChild(name);
            var highlight = Number(c.highlightCount) || 0;
            var unread = Number(c.unreadCount) || 0;
            if (highlight > 0) {
                var hl = document.createElement("span");
                hl.className = "conv-badge hl";
                hl.textContent = "@" + (highlight > 99 ? "99+" : highlight);
                top.appendChild(hl);
            } else if (unread > 0) {
                var cnt = document.createElement("span");
                cnt.className = "conv-badge count";
                cnt.textContent = unread > 99 ? "99+" : String(unread);
                top.appendChild(cnt);
            }
            main.appendChild(top);

            if (c.preview) {
                var pv = document.createElement("div");
                pv.className = "conv-preview";
                pv.textContent = c.preview;
                main.appendChild(pv);
            }
            row.appendChild(main);
            els.conversations.appendChild(row);
        }
    }

    function formatTime(ts) {
        try {
            return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (e) {
            return "";
        }
    }
    function formatDaySeparator(ts) {
        var d = new Date(ts);
        var now = new Date();
        var startOfDay = function (x) {
            return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        };
        var diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
    }

    function renderMessages(messages) {
        els.messages.textContent = "";
        setEmpty(els.messagesEmpty, messages.length === 0);
        var lastDayKey = null;
        for (var i = 0; i < messages.length; i++) {
            var m = messages[i];
            var ts = Number(m.ts) || 0;
            if (ts) {
                var dayKey = new Date(ts).toDateString();
                if (dayKey !== lastDayKey) {
                    lastDayKey = dayKey;
                    var sep = document.createElement("div");
                    sep.className = "date-sep";
                    var sepLabel = document.createElement("span");
                    sepLabel.textContent = formatDaySeparator(ts);
                    sep.appendChild(sepLabel);
                    els.messages.appendChild(sep);
                }
            }
            // Proximity system notices ("New discussion with X", join/leave) — a centered notice, not
            // a chat bubble (they'd otherwise look like the user's own message).
            if (m.system) {
                var notice = document.createElement("div");
                notice.className = "msg-system";
                notice.textContent = m.text || "";
                els.messages.appendChild(notice);
                continue;
            }
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
            if (ts) {
                var time = document.createElement("div");
                time.className = "msg-time";
                time.textContent = formatTime(ts);
                wrap.appendChild(time);
            }
            els.messages.appendChild(wrap);
        }
        els.messages.scrollTop = els.messages.scrollHeight;
    }

    function renderChat(conversations, selected, chatStatus) {
        var highlights = 0;
        for (var i = 0; i < conversations.length; i++) {
            highlights += Number(conversations[i].highlightCount) || 0;
        }
        if (highlights > 0) {
            els.chatBadge.textContent = highlights > 99 ? "99+" : String(highlights);
            els.chatBadge.hidden = false;
        } else {
            els.chatBadge.hidden = true;
        }

        renderConversationList(conversations);
        currentConvId = selected ? selected.id : currentConvId;

        var inConversation = chatSub === "conversation";
        els.conversation.hidden = !inConversation;
        els.conversations.hidden = inConversation;
        var showEmpty = !inConversation && conversations.length === 0;
        if (showEmpty) {
            els.conversationsEmpty.textContent =
                chatStatus === "connecting"
                    ? "Connecting to chat…"
                    : chatStatus === "unavailable"
                    ? "Chat unavailable."
                    : "No conversations yet.";
        }
        setEmpty(els.conversationsEmpty, showEmpty);

        if (inConversation) {
            var name = selected ? selected.name : "Conversation";
            els.convTitle.textContent = name || "Conversation";
            els.convOpenMain.hidden = currentConvId === NEARBY_ID;
            renderMessages(selected && Array.isArray(selected.messages) ? selected.messages : []);
        }
    }

    function renderMedia(media) {
        // Mic/cam: icon swaps on data-state; "off" turns the button danger-red (like the app bar).
        els.hdrMic.dataset.state = media.micEnabled ? "on" : "off";
        els.hdrMic.classList.toggle("is-forbidden", !media.micEnabled);
        els.hdrCam.dataset.state = media.cameraEnabled ? "on" : "off";
        els.hdrCam.classList.toggle("is-forbidden", !media.cameraEnabled);
        // Share: single icon; active (sharing) turns it secondary-blue.
        els.hdrShare.classList.toggle("is-active", media.screenSharing === true);
        els.hdrShare.disabled = !media.canScreenShare && !media.screenSharing;
        els.hdrShare.title = media.screenSharing ? "Stop sharing your screen" : "Share your screen";
        els.hdrShare.setAttribute("aria-label", els.hdrShare.title);

        // Self status dot + status dropdown current/locked.
        els.selfDot.dataset.status = normStatus(media.status);
        var locked = media.statusLocked === true;
        els.statusMenu.classList.toggle("is-locked", locked);
        els.statusLocked.hidden = !locked;
        var opts = els.statusMenu.querySelectorAll(".status-opt");
        for (var i = 0; i < opts.length; i++) {
            opts[i].classList.toggle("is-current", !locked && opts[i].dataset.status === media.status);
        }
    }

    function renderMeeting(media) {
        var was = inMeeting;
        inMeeting = media.inMeeting === true;
        if (inMeeting && !was) {
            // Entering a meeting: jump to the video (edge-triggered, so the user can switch away).
            setView("video");
        } else if (!inMeeting && was) {
            setView("people");
        } else if (!inMeeting && currentView === "video") {
            setView("people");
        }
        els.videoArea.classList.toggle("has-video", inMeeting);
    }

    function renderInvitation(invitation) {
        if (invitation && typeof invitation === "object") {
            els.invitationName.textContent = invitation.name || "Someone";
            els.invitation.hidden = false;
        } else {
            els.invitation.hidden = true;
        }
    }

    function render(state) {
        renderInvitation(state.invitation);
        renderPeople(Array.isArray(state.users) ? state.users : []);
        renderChat(
            Array.isArray(state.conversations) ? state.conversations : [],
            state.selectedConversation || null,
            state.chatStatus
        );
        var media = state.media || {
            micEnabled: false,
            cameraEnabled: false,
            screenSharing: false,
            canScreenShare: false,
            inMeeting: false,
            status: "online",
            statusLocked: false,
        };
        renderMeeting(media);
        renderMedia(media);
    }

    api.onState(function (state) {
        if (!state || typeof state !== "object") {
            return;
        }
        try {
            render(state);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Companion panel: render failed", e);
        }
    });

    // Establish the initial view (People home) with the main process.
    applyView();
    api.ready();
})();
