// Companion panel renderer (sandboxed, vanilla JS).
//
// A compact, interactive quick-access panel (People / Chat / Controls) shown by the main process
// when WorkAdventure is backgrounded. Stateless: the active world renderer pushes the full
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

    var STATUS_KEYS = ["online", "busy", "back_in_a_moment", "do_not_disturb", "away"];
    var NEARBY_ID = "nearby";

    // Static icon markup (constant, never user data — safe to assign via innerHTML).
    var ICON_DM =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var ICON_LOCATE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
    var ICON_INVITE =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>';
    // Conversation-kind glyphs: proximity (broadcast), DM (person), group room (hash).
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
        worldName: byId("c-world-name"),
        worldSub: byId("c-world-sub"),
        back: byId("c-back"),
        close: byId("c-close"),
        tabs: byId("c-tabs"),
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
        statusGroup: document.querySelector(".status-group"),
        status: byId("c-status"),
        statusLocked: byId("c-status-locked"),
        chatMentionsBadge: byId("c-chat-mentions-badge"),
        hdrMic: byId("c-hdr-mic"),
        hdrCam: byId("c-hdr-cam"),
        hdrShare: byId("c-hdr-share"),
        invitation: byId("c-invitation"),
        invitationName: byId("c-invitation-name"),
        inviteAccept: byId("c-invite-accept"),
        inviteDecline: byId("c-invite-decline"),
        meetingTab: byId("c-meeting-tab"),
        meetingPane: document.querySelector('.pane[data-pane="meeting"]'),
        videoToggle: byId("c-video-toggle"),
        videoLabel: byId("c-video-label"),
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
    // Report the Meeting-tab content rect so main can position the embedded meeting-video view there.
    function reportMeetingRect() {
        if (activeTab !== "meeting" || !els.meetingPane) {
            return;
        }
        var r = els.meetingPane.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
            send({ type: "meeting-rect", rect: { x: r.left, y: r.top, width: r.width, height: r.height } });
        }
    }
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
        // Main shows the embedded meeting video only while the Meeting tab is active.
        send({ type: "companion-tab", tab: tab });
        if (tab === "meeting") {
            requestAnimationFrame(reportMeetingRect);
        }
    }
    els.tabs.addEventListener("click", function (e) {
        var btn = e.target.closest(".tab");
        if (btn && btn.dataset.tab) {
            setTab(btn.dataset.tab);
        }
    });
    window.addEventListener("resize", reportMeetingRect);

    // ---- Header ----
    els.back.addEventListener("click", function () {
        send({ type: "focus-main" });
    });
    els.close.addEventListener("click", function () {
        send({ type: "close" });
    });
    // Always-visible mic / camera / screen-share quick toggles (fold-in of the old floating pill).
    if (els.hdrMic) {
        els.hdrMic.addEventListener("click", function () {
            send({ type: "toggle-mic" });
        });
    }
    if (els.hdrCam) {
        els.hdrCam.addEventListener("click", function () {
            send({ type: "toggle-camera" });
        });
    }
    if (els.hdrShare) {
        els.hdrShare.addEventListener("click", function () {
            if (els.hdrShare.disabled) return;
            send({ type: "toggle-screenshare" });
        });
    }

    // ---- Meeting invitation banner ----
    if (els.inviteAccept) {
        els.inviteAccept.addEventListener("click", function () {
            // Accept, then bring WorkAdventure to the front so the user lands in the meeting.
            send({ type: "focus-main" });
            send({ type: "accept-invitation" });
        });
    }
    if (els.inviteDecline) {
        els.inviteDecline.addEventListener("click", function () {
            send({ type: "decline-invitation" });
        });
    }

    // ---- Chat (conversation list <-> conversation view) ----
    var chatView = "list"; // "list" | "conversation"
    var currentConvId = null;

    function showConversationView(show) {
        chatView = show ? "conversation" : "list";
        els.conversation.hidden = !show;
        els.conversations.hidden = show;
        setEmpty(els.conversationsEmpty, false);
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
        if (action === "invite") {
            // Invite someone to a meeting — same action as the in-app user list.
            // No focus stealing: the invite is sent server-side and the target gets a popup.
            send({ type: "invite", userId: userId });
        } else if (action === "dm") {
            send({ type: "dm", userId: userId });
            setTab("chat");
            showConversationView(true);
        } else if (action === "locate") {
            // "Go to" someone: bring WorkAdventure to the front, then walk there.
            send({ type: "focus-main" });
            send({ type: "locate", userId: userId });
        }
    });

    // ---- Controls (status only; mic/cam/share live in the header) ----
    els.status.addEventListener("click", function (e) {
        var btn = e.target.closest(".status-opt");
        if (btn && btn.dataset.status && !els.statusGroup.classList.contains("is-locked")) {
            send({ type: "set-status", status: btn.dataset.status });
        }
    });

    // ---- Meeting ----
    if (els.videoToggle) {
        els.videoToggle.addEventListener("click", function () {
            send({ type: "toggle-pip" });
        });
    }

    // ---- Rendering ----
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
                actions.appendChild(miniButton("invite", u.id, "Invite to meeting", ICON_INVITE));
                actions.appendChild(miniButton("dm", u.id, "Message", ICON_DM));
                actions.appendChild(miniButton("locate", u.id, "Locate", ICON_LOCATE));
                row.appendChild(actions);
            }
            els.people.appendChild(row);
        }
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

            // Leading type glyph so proximity / DM / group rooms read apart at a glance.
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
                // @-mentions take priority (red).
                var hl = document.createElement("span");
                hl.className = "conv-badge hl";
                hl.textContent = "@" + (highlight > 99 ? "99+" : highlight);
                top.appendChild(hl);
            } else if (unread > 0) {
                // Plain unread: the real count, not just a dot.
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
            // Date separator whenever the calendar day changes (skipped for messages with no date).
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
        // Chat-tab badge = total unread @-mentions across conversations.
        var highlights = 0;
        for (var i = 0; i < conversations.length; i++) {
            highlights += Number(conversations[i].highlightCount) || 0;
        }
        if (highlights > 0) {
            els.chatMentionsBadge.textContent = highlights > 99 ? "99+" : String(highlights);
            els.chatMentionsBadge.hidden = false;
        } else {
            els.chatMentionsBadge.hidden = true;
        }

        renderConversationList(conversations);
        currentConvId = selected ? selected.id : currentConvId;

        var inConversation = chatView === "conversation";
        els.conversation.hidden = !inConversation;
        els.conversations.hidden = inConversation;
        var showEmpty = !inConversation && conversations.length === 0;
        if (showEmpty) {
            // Don't mistake "chat still connecting / unavailable" for a genuinely empty list.
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

    function renderControls(media) {
        // Mic / camera / screen-share all live in the always-visible header quick toggles.
        if (els.hdrMic) {
            els.hdrMic.dataset.state = media.micEnabled ? "on" : "off";
        }
        if (els.hdrCam) {
            els.hdrCam.dataset.state = media.cameraEnabled ? "on" : "off";
        }
        if (els.hdrShare) {
            els.hdrShare.dataset.state = media.screenSharing ? "active" : "off";
            els.hdrShare.disabled = !media.canScreenShare && !media.screenSharing;
            els.hdrShare.title = media.screenSharing ? "Stop sharing your screen" : "Share your screen";
            els.hdrShare.setAttribute("aria-label", els.hdrShare.title);
        }

        var locked = media.statusLocked === true;
        els.statusGroup.classList.toggle("is-locked", locked);
        els.statusLocked.hidden = !locked;
        var opts = els.status.querySelectorAll(".status-opt");
        for (var i = 0; i < opts.length; i++) {
            opts[i].classList.toggle("is-current", !locked && opts[i].dataset.status === media.status);
        }
    }

    var prevInMeeting = false;
    function renderMeeting(media) {
        var inMeeting = media.inMeeting === true;
        if (els.meetingTab) {
            els.meetingTab.hidden = !inMeeting;
        }
        // Entering a meeting/conversation: jump straight to the Meeting tab. Edge-triggered (only on
        // the false->true transition) so the user can still switch away to People/Chat mid-meeting.
        // Because the panel window is recreated on each (re)open, prevInMeeting starts false, so a
        // panel that opens while a meeting is already active also lands on Meeting.
        if (inMeeting && !prevInMeeting) {
            setTab("meeting");
        } else if (!inMeeting && activeTab === "meeting") {
            // Meeting ended (or never started) while the Meeting tab was open: fall back to People.
            setTab("people");
        }
        prevInMeeting = inMeeting;
        if (els.videoToggle) {
            var open = media.pipOpen === true;
            els.videoToggle.dataset.state = open ? "on" : "off";
            if (els.videoLabel) {
                els.videoLabel.textContent = open ? "Close meeting video" : "Open meeting video";
            }
        }
    }

    function renderInvitation(invitation) {
        if (!els.invitation) {
            return;
        }
        if (invitation && typeof invitation === "object") {
            els.invitationName.textContent = invitation.name || "Someone";
            els.invitation.hidden = false;
        } else {
            els.invitation.hidden = true;
        }
    }

    function render(state) {
        var world = state.world || {};
        els.worldName.textContent = world.name || "WorkAdventure";
        var count = typeof world.participantCount === "number" ? world.participantCount : 0;
        els.worldSub.textContent = count === 1 ? "1 person present" : count + " people present";

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
            pipOpen: false,
            status: "online",
            statusLocked: false,
        };
        renderMeeting(media);
        renderControls(media);
    }

    api.onState(function (state) {
        if (!state || typeof state !== "object") {
            return;
        }
        // Never let one malformed field freeze the whole panel: a throw here would abort render and
        // leave every later state push unrendered too.
        try {
            render(state);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Companion panel: render failed", e);
        }
    });

    api.ready();
})();
