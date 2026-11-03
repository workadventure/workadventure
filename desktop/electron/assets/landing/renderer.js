(function () {
    "use strict";

    var api = window.WAD && window.WAD.navigation;
    if (!api) {
        console.error("Landing renderer: WAD.navigation not exposed");
        return;
    }

    var page = document.getElementById("page");
    var form = document.getElementById("join-form");
    var input = document.getElementById("world-url");
    var joinBtn = document.getElementById("join-btn");
    var createBtn = document.getElementById("create-btn");
    var errorEl = document.getElementById("join-error");
    var createErrorEl = document.getElementById("create-error");
    var recentSection = document.getElementById("recent");
    var worldRow = document.getElementById("world-row");
    var recentErrorEl = document.getElementById("recent-error");
    var emailForm = document.getElementById("email-form");
    var emailInput = document.getElementById("email");
    var emailBtn = document.getElementById("email-btn");
    var emailErrorEl = document.getElementById("email-error");
    var foundSection = document.getElementById("found");
    var foundTitle = document.getElementById("found-title");
    var foundRow = document.getElementById("found-row");
    var foundErrorEl = document.getElementById("found-error");
    var noWorld = document.getElementById("no-world");
    var noWorldCreate = document.getElementById("no-world-create");
    var trustPanel = document.getElementById("trust-panel");
    var trustBody = document.getElementById("trust-body");
    var trustConfirm = document.getElementById("trust-confirm");
    var trustCancel = document.getElementById("trust-cancel");
    var pendingTrustUrl = null;

    // Strings in the OS language (native catalog in the main process), fetched synchronously so the
    // page never flashes English. The English in the markup / below is the fallback.
    var strings = {};
    try {
        var native = typeof api.getStrings === "function" ? api.getStrings() : null;
        if (native && native.strings) {
            strings = native.strings;
            document.documentElement.lang = native.lang || "en";
            document.documentElement.dir = /^(ar|fa|he|ur)([-_]|$)/i.test(native.lang || "") ? "rtl" : "ltr";
        }
    } catch (err) {
        console.warn("Landing renderer: strings unavailable", err);
    }
    function t(key, fallback) {
        return typeof strings[key] === "string" ? strings[key] : fallback;
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (element) {
        var key = element.getAttribute("data-i18n");
        if (typeof strings[key] === "string") {
            element.textContent = strings[key];
        }
    });

    function showError(element, message) {
        element.textContent = message || "";
        element.classList.toggle("visible", Boolean(message));
    }

    // The main process passes ?error=… after a failed navigation, and ?trust=… (handled below, with the
    // trust panel) for a world on a server the app does not know. Strip the query so a refresh doesn't
    // repeat them.
    var initialParams = new URLSearchParams(window.location.search);
    try {
        var initialError = initialParams.get("error");
        if (initialError) {
            showError(errorEl, initialError);
        }
        if (window.location.search && window.history && typeof window.history.replaceState === "function") {
            window.history.replaceState({}, "", window.location.pathname);
        }
    } catch (err) {
        console.warn("Landing renderer: failed to read initial error param", err);
    }

    // Star (filled = pinned, outline = not). Inline SVG so the sandboxed page needs no assets.
    function pinIconSvg(filled) {
        return (
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="' +
            (filled ? "currentColor" : "none") +
            '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>'
        );
    }

    // No map image exists for an arbitrary world, so each tile gets a stable look derived from its
    // URL: same world, same colour and grid offset on every launch, and two worlds are very
    // unlikely to collide. Cheap stand-in for the real art, and it never leaves a card blank.
    function hashString(value) {
        var hash = 0;
        for (var i = 0; i < value.length; i++) {
            hash = (hash << 5) - hash + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    // How a row of cards opens its worlds: recent worlds load directly, the worlds found for an email
    // start a sign-in first.
    var recentCards = {
        row: worldRow,
        errorEl: recentErrorEl,
        idleLabel: t("landing.explore", "Explore"),
        busyLabel: t("landing.opening", "Opening…"),
        open: api.joinWorld,
    };
    var foundCards = {
        row: foundRow,
        errorEl: foundErrorEl,
        idleLabel: t("landing.signIn", "Sign in"),
        busyLabel: t("landing.signingIn", "Signing in…"),
        open: api.signInToWorld,
    };

    function buildWorldCard(world, cards) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "world";
        card.title = world.url;

        var hash = hashString(world.url);
        var art = document.createElement("span");
        art.className = "world-art";
        art.style.setProperty("--h", String(hash % 360));
        art.style.setProperty("--ox", (hash % 26) + "px");
        art.style.setProperty("--oy", ((hash >> 5) % 26) + "px");
        card.appendChild(art);

        var scrim = document.createElement("span");
        scrim.className = "world-scrim";
        card.appendChild(scrim);

        var copy = document.createElement("span");
        copy.className = "world-copy";
        var name = document.createElement("span");
        name.className = "world-name";
        name.textContent = world.label;
        var url = document.createElement("span");
        url.className = "world-url";
        url.textContent = world.url;
        copy.appendChild(name);
        copy.appendChild(url);
        card.appendChild(copy);

        var hover = document.createElement("span");
        hover.className = "world-hover";
        // Label and chevron share a row of their own so they centre against EACH OTHER. Left as
        // direct children of the band they would both align to its bottom edge, which lines the
        // chevron up with the text's line box (28px tall) rather than with the letters.
        var hoverRow = document.createElement("span");
        hoverRow.className = "world-hover-row";
        var hoverLabel = document.createElement("span");
        hoverLabel.textContent = cards.idleLabel;
        hoverRow.appendChild(hoverLabel);
        // 6x12 chevron with a 2px stroke, per the design. The path spans x=1..5 so the stroke's
        // 1px half-width lands exactly on the viewBox edges instead of being clipped.
        hoverRow.insertAdjacentHTML(
            "beforeend",
            '<svg viewBox="0 0 6 12" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M1 1l4 5l-4 5"/></svg>'
        );
        hover.appendChild(hoverRow);
        card.appendChild(hover);

        card.addEventListener("click", function () {
            showError(cards.errorEl, "");
            setRowBusy(cards.row, true);
            // Only the label changes — writing to `hover` itself would wipe the chevron.
            hoverLabel.textContent = cards.busyLabel;
            cards
                .open(world.url)
                .then(function (result) {
                    if (!result || !result.ok) {
                        throw new Error((result && result.error) || t("landing.joinFailed", "Failed to join world."));
                    }
                })
                .catch(function (err) {
                    console.warn("landing: opening a world card rejected", err);
                    showError(cards.errorEl, (err && err.message) || t("landing.joinFailed", "Failed to join world."));
                    setRowBusy(cards.row, false);
                    hoverLabel.textContent = cards.idleLabel;
                });
        });

        return card;
    }

    function setRowBusy(row, busy) {
        Array.prototype.forEach.call(row.querySelectorAll("button"), function (btn) {
            btn.disabled = busy;
        });
    }

    // The pin sits OUTSIDE the tile button (a button cannot nest inside a button) and is layered
    // over it, so it stays clickable without opening the world.
    function buildPin(world) {
        var pin = document.createElement("button");
        pin.type = "button";
        pin.className = "world-pin" + (world.pinned ? " is-pinned" : "");
        pin.title = world.pinned ? t("landing.unpinWorld", "Unpin world") : t("landing.pinWorld", "Pin world");
        pin.setAttribute("aria-label", pin.title);
        pin.innerHTML = pinIconSvg(Boolean(world.pinned));
        pin.addEventListener("click", function (event) {
            event.stopPropagation();
            api.togglePin(world.url)
                .then(function () {
                    refreshWorlds();
                })
                .catch(function (err) {
                    console.warn("landing.togglePin rejected", err);
                });
        });
        return pin;
    }

    function isWorld(world) {
        return world && typeof world.url === "string" && typeof world.label === "string";
    }

    // Pinned worlds lead the row, then the rest in recency order; a pinned world must not appear
    // twice when it is also recent.
    function mergeWorlds(pinned, recent) {
        var seen = Object.create(null);
        var merged = [];
        function push(world, forcePinned) {
            if (!isWorld(world) || seen[world.url]) {
                return;
            }
            seen[world.url] = true;
            merged.push({ url: world.url, label: world.label, pinned: forcePinned || Boolean(world.pinned) });
        }
        (Array.isArray(pinned) ? pinned : []).forEach(function (world) {
            push(world, true);
        });
        (Array.isArray(recent) ? recent : []).forEach(function (world) {
            push(world, false);
        });
        return merged;
    }

    function renderWorlds(worlds) {
        worldRow.textContent = "";
        worlds.forEach(function (world) {
            var wrap = document.createElement("div");
            wrap.style.position = "relative";
            wrap.style.flex = "0 0 auto";
            wrap.appendChild(buildWorldCard(world, recentCards));
            if (typeof api.togglePin === "function") {
                wrap.appendChild(buildPin(world));
            }
            worldRow.appendChild(wrap);
        });
        var hasWorlds = worlds.length > 0;
        recentSection.toggleAttribute("hidden", !hasWorlds);
        // Drives the two layouts (top-left vs centred) from a single source of truth.
        page.dataset.state = hasWorlds ? "has-worlds" : "empty";
    }

    function refreshWorlds() {
        var getRecent =
            typeof api.getRecentWorlds === "function" ? api.getRecentWorlds() : Promise.resolve([]);
        var getPinned =
            typeof api.getPinnedWorlds === "function" ? api.getPinnedWorlds() : Promise.resolve([]);
        Promise.all([getPinned, getRecent])
            .then(function (results) {
                renderWorlds(mergeWorlds(results[0], results[1]));
            })
            .catch(function (err) {
                console.warn("landing: failed to load worlds", err);
                renderWorlds([]);
            });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var url = (input.value || "").trim();
        if (!url) {
            showError(errorEl, t("landing.urlRequired", "Please enter a world URL."));
            input.focus();
            return;
        }
        showError(errorEl, "");
        joinBtn.setAttribute("disabled", "disabled");
        joinBtn.textContent = t("landing.opening", "Opening…");
        hideTrustPanel();
        api.joinWorld(url)
            .then(function (result) {
                if (!result || !result.ok) {
                    joinBtn.removeAttribute("disabled");
                    joinBtn.textContent = t("landing.openWorld", "Open world");
                    showError(errorEl, (result && result.error) || t("landing.joinFailed", "Failed to join world."));
                }
            })
            .catch(function (err) {
                console.warn("landing.joinWorld rejected", err);
                showError(errorEl, (err && err.message) || t("landing.joinFailed", "Failed to join world."));
                joinBtn.removeAttribute("disabled");
                joinBtn.textContent = t("landing.openWorld", "Open world");
            });
    });

    // ── Email lookup ────────────────────────────────────────────────────────────────────────────
    function setEmailBusy(label) {
        emailBtn.disabled = Boolean(label);
        emailBtn.textContent = label || t("landing.continue", "Continue");
    }

    function hideFound() {
        foundSection.hidden = true;
        foundRow.textContent = "";
        showError(foundErrorEl, "");
    }

    function showFound(email, worlds) {
        hideFound();
        var none = worlds.length === 0;
        foundTitle.textContent = "";
        if (none) {
            // The label is set in capitals; the address keeps its own case, as typed.
            var parts = t("landing.noWorldFound", "No world found for {email}").split("{email}");
            parts.forEach(function (part, index) {
                if (index > 0) {
                    var address = document.createElement("span");
                    address.className = "found-email";
                    address.textContent = email;
                    foundTitle.appendChild(address);
                }
                foundTitle.appendChild(document.createTextNode(part));
            });
        } else {
            foundTitle.textContent = t("landing.yourWorlds", "Your worlds");
        }
        noWorld.hidden = !none;
        foundRow.hidden = none;
        worlds.forEach(function (world) {
            foundRow.appendChild(buildWorldCard({ url: world.url, label: world.name }, foundCards));
        });
        foundSection.hidden = false;
        // Narrow windows stack the cards, which pushes the answer below the fold.
        foundSection.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    emailForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var email = (emailInput.value || "").trim();
        if (!email || !emailInput.checkValidity()) {
            showError(emailErrorEl, t("landing.emailInvalid", "Please enter a valid email address."));
            emailInput.focus();
            return;
        }
        showError(emailErrorEl, "");
        hideFound();
        setEmailBusy(t("landing.searching", "Searching…"));
        api.findWorlds(email)
            .then(function (result) {
                if (!result || !result.ok) {
                    throw new Error((result && result.error) || "");
                }
                if (result.worlds.length !== 1) {
                    setEmailBusy("");
                    showFound(email, result.worlds);
                    return;
                }
                // A single world: no choice to make, so its sign-in starts at once (the main process then
                // replaces this page with the "signing in" one). On failure, the card stays to retry.
                setEmailBusy(t("landing.signingIn", "Signing in…"));
                return api.signInToWorld(result.worlds[0].url).then(function (signIn) {
                    if (!signIn || !signIn.ok) {
                        setEmailBusy("");
                        showFound(email, result.worlds);
                        showError(foundErrorEl, (signIn && signIn.error) || t("landing.joinFailed", "Failed to join world."));
                    }
                });
            })
            .catch(function (err) {
                console.warn("landing.findWorlds rejected", err);
                setEmailBusy("");
                showError(
                    emailErrorEl,
                    (err && err.message) || t("landing.lookupFailed", "Couldn't look up your worlds. Paste your world link instead.")
                );
            });
    });

    // Editing the address withdraws the answer: it was about the address typed before.
    emailInput.addEventListener("input", function () {
        hideFound();
        showError(emailErrorEl, "");
    });

    function showTrustPanel(url, origin) {
        pendingTrustUrl = url;
        trustBody.textContent = t(
            "landing.trustBody",
            "{origin} isn't a WorkAdventure world the app knows. Only add a server you trust, such as your company's."
        ).replace("{origin}", origin);
        trustPanel.hidden = false;
        trustCancel.focus();
    }

    function hideTrustPanel() {
        pendingTrustUrl = null;
        trustPanel.hidden = true;
    }

    trustCancel.addEventListener("click", function () {
        hideTrustPanel();
        input.focus();
    });

    trustConfirm.addEventListener("click", function () {
        var url = pendingTrustUrl;
        if (!url) {
            return;
        }
        trustConfirm.setAttribute("disabled", "disabled");
        api.trustServerAndJoin(url)
            .then(function (result) {
                trustConfirm.removeAttribute("disabled");
                if (!result || !result.ok) {
                    hideTrustPanel();
                    showError(errorEl, (result && result.error) || t("landing.joinFailed", "Failed to join world."));
                }
            })
            .catch(function (err) {
                console.warn("landing.trustServerAndJoin rejected", err);
                trustConfirm.removeAttribute("disabled");
                hideTrustPanel();
                showError(errorEl, t("landing.joinFailed", "Failed to join world."));
            });
    });

    // Editing the address withdraws the offer: it was about the address typed before.
    input.addEventListener("input", hideTrustPanel);

    // A world on a WorkAdventure server the user has not added (typed here, deep link, world switcher).
    try {
        var initialTrustUrl = initialParams.get("trust");
        if (initialTrustUrl) {
            input.value = initialTrustUrl;
            showTrustPanel(initialTrustUrl, new URL(initialTrustUrl).origin);
        }
    } catch (err) {
        console.warn("Landing renderer: failed to read initial trust param", err);
    }

    // "Create a world" sits in the footer and, after a lookup that found nothing, next to that answer.
    function openSignup(button, errorElement) {
        showError(errorElement, "");
        button.setAttribute("disabled", "disabled");
        api.openAdminSignup()
            .then(function (result) {
                if (!result || !result.ok) {
                    showError(
                        errorElement,
                        (result && result.error) || t("landing.signupFailed", "The signup page could not be opened.")
                    );
                }
            })
            .catch(function (err) {
                console.warn("landing.openAdminSignup rejected", err);
                showError(
                    errorElement,
                    (err && err.message) || t("landing.signupFailed", "The signup page could not be opened.")
                );
            })
            .finally(function () {
                setTimeout(function () {
                    button.removeAttribute("disabled");
                }, 500);
            });
    }

    createBtn.addEventListener("click", function () {
        openSignup(createBtn, createErrorEl);
    });
    noWorldCreate.addEventListener("click", function () {
        openSignup(noWorldCreate, foundErrorEl);
    });

    // macOS screen recording permission: asked once here, before a share needs it (macOS restarts the
    // app to apply it). "Later" hides it for good; the share itself still explains how to grant it.
    var permissionApi = window.WAD && window.WAD.screenPermission;
    var permissionPanel = document.getElementById("screen-permission");
    var permissionBody = document.getElementById("screen-permission-body");
    var permissionAllow = document.getElementById("screen-permission-allow");
    var permissionLater = document.getElementById("screen-permission-later");
    var PERMISSION_DISMISSED_KEY = "screenPermissionDismissed";
    function permissionDismissed() {
        try {
            return window.localStorage.getItem(PERMISSION_DISMISSED_KEY) === "1";
        } catch (err) {
            return false;
        }
    }
    if (permissionApi && !permissionDismissed()) {
        permissionApi
            .get()
            .then(function (state) {
                permissionPanel.hidden = state !== "missing";
            })
            .catch(function (err) {
                console.warn("landing.screenPermission.get rejected", err);
            });
    }
    permissionAllow.addEventListener("click", function () {
        permissionAllow.setAttribute("disabled", "disabled");
        permissionApi
            .request()
            .then(function (state) {
                if (state === "missing") {
                    permissionBody.textContent = t(
                        "landing.screenPermissionNext",
                        "Turn WorkAdventure on in System Settings: macOS will then offer to restart it."
                    );
                } else {
                    permissionPanel.hidden = true;
                }
            })
            .catch(function (err) {
                console.warn("landing.screenPermission.request rejected", err);
            })
            .finally(function () {
                permissionAllow.removeAttribute("disabled");
            });
    });
    permissionLater.addEventListener("click", function () {
        try {
            window.localStorage.setItem(PERMISSION_DISMISSED_KEY, "1");
        } catch (err) {
            // Private storage unavailable: it simply shows again next time.
        }
        permissionPanel.hidden = true;
    });

    refreshWorlds();

    // Autofocus the email field so the user can just type it and hit Enter. Not while asking to add a server:
    // the question keeps the focus (on Cancel, so Enter never adds one by accident).
    setTimeout(function () {
        if (trustPanel.hidden) {
            emailInput.focus();
        }
    }, 50);
})();
