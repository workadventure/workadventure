"use strict";

const { textDirection } = require("./native-locale-policy");

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createDesktopCallbackPage(message, closeHint = "You can close this window.", lang = "en") {
    const safeMessage = escapeHtml(message);
    return `<!doctype html>
<html lang="${escapeHtml(lang)}" dir="${textDirection(lang)}">
<head>
  <meta charset="utf-8" />
  <title>WorkAdventure</title>
  <script>
    window.addEventListener("load", () => {
      window.close();
    });
  </script>
</head>
<body>
  <p>${safeMessage}</p>
  <p>${escapeHtml(closeHint)}</p>
</body>
</html>`;
}

module.exports = {
    createDesktopCallbackPage,
};
