(function () {
    "use strict";

    var api = window.WAD && window.WAD.navigation;
    if (!api) {
        console.error("Landing renderer: WAD.navigation not exposed");
        return;
    }

    var form = document.getElementById("join-form");
    var input = document.getElementById("world-url");
    var joinBtn = document.getElementById("join-btn");
    var createBtn = document.getElementById("create-btn");
    var errorEl = document.getElementById("join-error");
    var createErrorEl = document.getElementById("create-error");
    var recentSection = document.getElementById("recent-worlds");
    var recentList = document.getElementById("recent-list");
    var recentErrorEl = document.getElementById("recent-error");
    var pinnedSection = document.getElementById("pinned-worlds");
    var pinnedList = document.getElementById("pinned-list");

    function showError(element, message) {
        element.textContent = message || "";
        element.classList.toggle("visible", Boolean(message));
    }

    // If the main process bounced us back here after a failed navigation, it passed a message
    // via ?error=…. Show it, then strip the query so a refresh doesn't repeat the error.
    try {
        var initialError = new URLSearchParams(window.location.search).get("error");
        if (initialError) {
            showError(errorEl, initialError);
            if (window.history && typeof window.history.replaceState === "function") {
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    } catch (err) {
        console.warn("Landing renderer: failed to read initial error param", err);
    }

    // Star (filled = pinned, outline = not). Inline SVG so the sandboxed page needs no assets.
    function pinIconSvg(filled) {
        return (
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="' +
            (filled ? "currentColor" : "none") +
            '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>'
        );
    }

    function buildWorldItem(world, listEl) {
        var row = document.createElement("div");
        row.className = "recent-item";
        row.title = world.url;

        var open = document.createElement("button");
        open.type = "button";
        open.className = "recent-open";

        var copy = document.createElement("span");
        copy.className = "recent-copy";
        var name = document.createElement("span");
        name.className = "recent-name";
        name.textContent = world.label;
        var url = document.createElement("span");
        url.className = "recent-url";
        url.textContent = world.url;
        copy.appendChild(name);
        copy.appendChild(url);

        var action = document.createElement("span");
        action.className = "recent-action";
        action.textContent = "Open";
        open.appendChild(copy);
        open.appendChild(action);

        open.addEventListener("click", function () {
            showError(recentErrorEl, "");
            Array.prototype.forEach.call(document.querySelectorAll(".recent-item button"), function (b) {
                b.setAttribute("disabled", "disabled");
            });
            action.textContent = "Opening...";
            api.joinWorld(world.url)
                .then(function (result) {
                    if (!result || !result.ok) {
                        throw new Error((result && result.error) || "Failed to join world.");
                    }
                })
                .catch(function (err) {
                    console.warn("landing.joinWorld rejected", err);
                    showError(recentErrorEl, (err && err.message) || "Failed to join world.");
                    Array.prototype.forEach.call(document.querySelectorAll(".recent-item button"), function (b) {
                        b.removeAttribute("disabled");
                    });
                    action.textContent = "Open";
                });
        });
        row.appendChild(open);

        // Pin toggle (only when the API supports it).
        if (typeof api.togglePin === "function") {
            var pin = document.createElement("button");
            pin.type = "button";
            pin.className = "recent-pin" + (world.pinned ? " is-pinned" : "");
            pin.setAttribute("aria-label", world.pinned ? "Unpin world" : "Pin world");
            pin.title = world.pinned ? "Unpin" : "Pin";
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
            row.appendChild(pin);
        }

        listEl.appendChild(row);
    }

    function renderInto(listEl, sectionEl, worlds) {
        listEl.innerHTML = "";
        if (!Array.isArray(worlds)) {
            return;
        }
        worlds.forEach(function (world) {
            if (world && typeof world.url === "string" && typeof world.label === "string") {
                buildWorldItem(world, listEl);
            }
        });
        if (sectionEl) {
            sectionEl.toggleAttribute("hidden", listEl.childElementCount === 0);
        }
    }

    function refreshWorlds() {
        if (typeof api.getRecentWorlds === "function") {
            api.getRecentWorlds()
                .then(function (worlds) {
                    renderInto(recentList, recentSection, worlds);
                })
                .catch(function (err) {
                    console.warn("landing.getRecentWorlds rejected", err);
                });
        }
        if (typeof api.getPinnedWorlds === "function") {
            api.getPinnedWorlds()
                .then(function (worlds) {
                    renderInto(pinnedList, pinnedSection, worlds);
                })
                .catch(function (err) {
                    console.warn("landing.getPinnedWorlds rejected", err);
                });
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var url = (input.value || "").trim();
        if (!url) {
            showError(errorEl, "Please enter a world URL.");
            input.focus();
            return;
        }
        showError(errorEl, "");
        joinBtn.setAttribute("disabled", "disabled");
        joinBtn.textContent = "Opening...";
        api.joinWorld(url)
            .then(function (result) {
                if (!result || !result.ok) {
                    showError(errorEl, (result && result.error) || "Failed to join world.");
                    joinBtn.removeAttribute("disabled");
                    joinBtn.textContent = "Open world";
                }
            })
            .catch(function (err) {
                console.warn("landing.joinWorld rejected", err);
                showError(errorEl, (err && err.message) || "Failed to join world.");
                joinBtn.removeAttribute("disabled");
                joinBtn.textContent = "Open world";
            });
    });

    createBtn.addEventListener("click", function () {
        showError(createErrorEl, "");
        createBtn.setAttribute("disabled", "disabled");
        api.openAdminSignup()
            .then(function (result) {
                if (!result || !result.ok) {
                    showError(createErrorEl, (result && result.error) || "The signup page could not be opened.");
                }
            })
            .catch(function (err) {
                console.warn("landing.openAdminSignup rejected", err);
                showError(createErrorEl, (err && err.message) || "The signup page could not be opened.");
            })
            .finally(function () {
                setTimeout(function () {
                    createBtn.removeAttribute("disabled");
                }, 500);
            });
    });

    refreshWorlds();

    // Autofocus the URL field so the user can just paste and hit Enter.
    setTimeout(function () {
        input.focus();
    }, 50);
})();
