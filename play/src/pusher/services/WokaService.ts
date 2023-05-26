import { adminWokaService } from "./AdminWokaService";
import { localWokaService } from "./LocalWokaService";
import { Capabilities } from "@workadventure/messages";
import type { WokaServiceInterface } from "./WokaServiceInterface";

export class WokaService {
    private static instance: WokaServiceInterface | undefined;
    static get(capabilities: Capabilities): WokaServiceInterface {
        if (!WokaService.instance)
            WokaService.instance = capabilities["api/woka/list"] === "v1" ? adminWokaService : localWokaService;
        return WokaService.instance;
    }
}
