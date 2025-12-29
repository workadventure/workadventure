import { z } from "zod";
import { BaseHttpController } from "./BaseHttpController";

export class LocalScriptController extends BaseHttpController {
    routes(): void {
        this.app.get("/local-script", (req, res) => {
            const querySchema = z.object({
                script: z.string().url(),
            });

            const parseResult = querySchema.safeParse(req.query);
            if (!parseResult.success) {
                res.status(400).send("Invalid query parameters");
                return;
            }

            const data = parseResult.data;

            const scriptUrl = new URL(data.script);

            const hostname = scriptUrl.hostname;
            const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");

            if (!isLocalhost) {
                res.status(400).send("Script URL must be from localhost or *.localhost domain for security reasons");
                return;
            }

            // Generate the HTML page
            const html = `<!DOCTYPE html>
<html>
  <head>
    <script src="/iframe_api.js"></script>
    <script type="module" src="${this.escapeHtmlAttr(data.script)}"></script>
  </head>
  <body>
  </body>
</html>`;

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.send(html);
        });
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
}
