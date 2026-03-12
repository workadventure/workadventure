import type { Capabilities } from "@workadventure/messages";
import { adminWokaService } from "./AdminWokaService.ts";
import { localWokaService } from "./LocalWokaService.ts";
import type { WokaServiceInterface } from "./WokaServiceInterface.ts";

export class WokaService {
    private static instance: WokaServiceInterface | undefined;
    static get(capabilities: Capabilities): WokaServiceInterface {
        if (!WokaService.instance)
            WokaService.instance = capabilities["api/woka/list"] === "v1" ? adminWokaService : localWokaService;
        return WokaService.instance;
    }
}
