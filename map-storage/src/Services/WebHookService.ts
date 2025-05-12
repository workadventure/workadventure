import axios from "axios";
import * as Sentry from "@sentry/node";
import { WEB_HOOK_API_TOKEN } from "../Enum/EnvironmentVariable";

/**
 * Calls a webhook each time a WAM map is created, updated or deleted.
 */
export class WebHookService {
    public constructor(private webHookUrl: string | undefined) {}

    /**
     * The webhook is called with a JSON body containing the following properties:
     * - domain: the domain of the map(s)
     * - mapPath: the path of the map (can be undefined if several files have been modified at once, like when a ZIP is uploaded)
     * - action: "update" or "delete"
     */
    public callWebHook(domain: string, mapPath: string | undefined, action: "update" | "delete"): void {
        if (!this.webHookUrl) {
            return;
        }

        const headers: Record<string, string> = {};
        if (WEB_HOOK_API_TOKEN) {
            headers["Authorization"] = WEB_HOOK_API_TOKEN;
        }

        // Make a POST request to the webhook URL using axios. Don't wait for the answer but log an error in case of problem.
        axios
            .post(
                this.webHookUrl,
                {
                    domain: domain,
                    mapPath: mapPath,
                    action: action,
                },
                {
                    maxContentLength: 1000000,
                    headers: {
                        "Content-Type": "application/json",
                        ...headers,
                    },
                    timeout: 10000,
                }
            )
            .then((r) => {
                console.debug(`[${new Date().toISOString()}] Webhook called successfully: ${r.status} ${r.statusText}`);
            })
            .catch((e: unknown) => {
                console.error(`[${new Date().toISOString()}] Error while calling webhook:`, e);
                Sentry.captureException(
                    `Error while calling webhook: ${JSON.stringify(e)}. Domain: ${domain}, mapPath: ${
                        mapPath ?? "no map path"
                    }, action: ${action}`
                );
            });
    }
}
