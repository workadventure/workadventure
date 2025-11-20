import { Express } from "express";
import { z } from "zod";
import { PLAY_URL, PUSHER_URL } from "../Enum/EnvironmentVariable";
import { validateQuery } from "./ValidateQuery";

export class LocalScriptController {
    constructor(private app: Express) {
        this.getLocalScript();
    }

    /**
     * Escape special characters in HTML attribute values to prevent XSS attacks.
     * Uses HTML entities for quotes and angle brackets.
     */
    private escapeHtmlAttr(value: string): string {
        return value
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    private getLocalScript() {
        this.app.get("/local-script", (req, res, next) => {
            try {
                const data = validateQuery(
                    req,
                    res,
                    z.object({
                        script: z.string().url(),
                    })
                );
                if (!data) {
                    return;
                }

                // Validate that the script URL is from localhost or *.localhost
                let scriptUrl: URL;
                try {
                    scriptUrl = new URL(data.script);
                } catch {
                    res.status(400).send("Invalid script URL");
                    return;
                }

                const hostname = scriptUrl.hostname;
                const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");

                if (!isLocalhost) {
                    res.status(400).send(
                        "Script URL must be from localhost or *.localhost domain for security reasons"
                    );
                    return;
                }

                // Generate the HTML page
                // Use PLAY_URL (CDN) if available, otherwise fallback to PUSHER_URL
                const iframeApiUrl = PLAY_URL ?? PUSHER_URL;
                const html = `<!DOCTYPE html>
<html>
  <head>
    <script src="${this.escapeHtmlAttr(iframeApiUrl)}/iframe_api.js"></script>
    <script type="module" src="${this.escapeHtmlAttr(data.script)}"></script>
  </head>
  <body>
  </body>
</html>`;

                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.send(html);
            } catch (e) {
                next(e);
            }
        });
    }
}
