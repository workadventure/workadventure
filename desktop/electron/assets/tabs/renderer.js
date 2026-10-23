// Tab strip renderer (sandboxed, vanilla JS). Renders the open world tabs pushed by the main
// process and sends tab operations back. Stateless: the main process is the source of truth.
(function () {
    "use strict";

    var api = window.WATabs;
    if (!api) {
        console.error("Tab strip: WATabs not exposed");
        return;
    }

    var tabsEl = document.getElementById("tabs");
    var newTabBtn = document.getElementById("new-tab");

    // Strings in the OS language (native catalog in the main process); English fallback.
    var native = null;
    try {
        native = typeof api.getStrings === "function" ? api.getStrings() : null;
    } catch (err) {
        console.warn("Tab strip: strings unavailable", err);
    }
    var strings = (native && native.strings) || {};
    function t(key, fallback) {
        return typeof strings[key] === "string" ? strings[key] : fallback;
    }
    if (native && native.lang) {
        document.documentElement.lang = native.lang;
        document.documentElement.dir = /^(ar|fa|he|ur)([-_]|$)/i.test(native.lang) ? "rtl" : "ltr";
    }
    newTabBtn.title = t("tabs.newWorldTab", "New world tab");
    newTabBtn.setAttribute("aria-label", newTabBtn.title);

    function render(tabs) {
        tabsEl.innerHTML = "";
        if (!Array.isArray(tabs)) {
            return;
        }
        // A lone tab needs no close button (closing the last tab would leave an empty shell).
        var showClose = tabs.length > 1;
        tabs.forEach(function (tab) {
            if (!tab || typeof tab.id !== "string") {
                return;
            }
            var el = document.createElement("div");
            el.className = "tab" + (tab.active ? " active" : "");
            el.title = tab.title || t("tabs.world", "World");

            var title = document.createElement("span");
            title.className = "tab-title";
            title.textContent = tab.title || t("tabs.world", "World");
            el.appendChild(title);

            if (showClose) {
                var close = document.createElement("button");
                close.type = "button";
                close.className = "tab-close";
                close.setAttribute("aria-label", t("tabs.closeTab", "Close tab"));
                close.textContent = "×";
                close.addEventListener("click", function (event) {
                    event.stopPropagation();
                    api.close(tab.id);
                });
                el.appendChild(close);
            }

            el.addEventListener("click", function () {
                api.activate(tab.id);
            });
            // Middle-click closes, like a browser.
            el.addEventListener("auxclick", function (event) {
                if (event.button === 1 && showClose) {
                    event.preventDefault();
                    api.close(tab.id);
                }
            });

            tabsEl.appendChild(el);
        });
    }

    api.onTabs(render);
    newTabBtn.addEventListener("click", function () {
        api.newTab();
    });

    api.ready();
})();
