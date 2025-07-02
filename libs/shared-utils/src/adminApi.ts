import { z } from "zod";
import { Capabilities, isCapabilities } from "@workadventure/messages";
import { ADMIN_API_RETRY_DELAY, ADMIN_API_URL } from "workadventure-play/src/pusher/enums/EnvironmentVariable";
import axios, { type AxiosResponse, isAxiosError } from "axios";
import { Deferred } from "ts-deferred";

export const AdminBannedData = z.object({
    is_banned: z.boolean(),
    message: z.string(),
});

export type AdminBannedData = z.infer<typeof AdminBannedData>;

class AdminApi {
    private capabilities: Capabilities = {};
    private capabilitiesDeferred = new Deferred<Capabilities>();

    isEnabled(): boolean {
        return !!ADMIN_API_URL;
    }

    async initialise(): Promise<Capabilities> {
        if (!this.isEnabled()) {
            console.info("Admin API not configured. Will use local implementations");
            return this.capabilities;
        }

        console.info(`Admin api is enabled at ${ADMIN_API_URL}. Will check connection and capabilities`);
        let warnIssued = false;
        const queryCapabilities = async (resolve: (_v: unknown) => void): Promise<void> => {
            try {
                this.capabilities = await this.fetchCapabilities();
                this.capabilitiesDeferred.resolve(this.capabilities);
                console.info(`Capabilities query successful. Found capabilities: ${JSON.stringify(this.capabilities)}`);
                resolve(0);
            } catch (ex) {
                // ignore errors when querying capabilities
                if (isAxiosError(ex) && ex.response?.status === 404) {
                    // 404 probably means an older api version

                    this.capabilities = {
                        "api/woka/list": "v1",
                    };
                    this.capabilitiesDeferred.resolve(this.capabilities);

                    resolve(0);
                    console.warn(`Admin API server does not implement capabilities, default to basic capabilities`);
                    return;
                }

                // if we get here, it might be due to connectivity issues
                if (!warnIssued)
                    console.warn(
                        `Could not reach Admin API server at ${ADMIN_API_URL}, will retry in ${ADMIN_API_RETRY_DELAY} ms`,
                        ex
                    );

                warnIssued = true;

                setTimeout(() => {
                    queryCapabilities(resolve).catch((e) => console.error(e));
                }, ADMIN_API_RETRY_DELAY);
            }
        };
        await new Promise((resolve) => {
            queryCapabilities(resolve).catch((e) => console.error(e));
        });
        console.info(`Remote admin api connection successful at ${ADMIN_API_URL}`);
        return this.capabilities;
    }

    private async fetchCapabilities(): Promise<Capabilities> {
        /**
         * @openapi
         * /api/capabilities:
         *   get:
         *     tags: ["AdminAPI"]
         *     description: Get admin api capabilties
         *     produces:
         *      - "application/json"
         *     responses:
         *       200:
         *         description: a map of capabilities and versions
         *         schema:
         *             type: object
         *             items:
         *                 $ref: '#/definitions/Capabilities'
         *       404:
         *         description: Endpoint not found. If the admin api does not implement, will use default capabilities
         */
        const res = await axios.get<unknown, AxiosResponse<string[]>>(ADMIN_API_URL + "/api/capabilities");

        return isCapabilities.parse(res.data);
    }
}

export const adminApi = new AdminApi();
