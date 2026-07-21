"use strict";

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createDesktopCallbackPage(message) {
    const safeMessage = escapeHtml(message);
    return `<!doctype html>
<html lang="fr">
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
  <p>Vous pouvez fermer cette fenêtre.</p>
</body>
</html>`;
}

module.exports = {
    createDesktopCallbackPage,
};
