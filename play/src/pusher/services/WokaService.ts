import { adminWokaService } from "./AdminWokaService";
import { localWokaService } from "./LocalWokaService";
import type { AdminCapabilities } from "./adminApi/AdminCapabilities";
import type { WokaServiceInterface } from "./WokaServiceInterface";

export class WokaService {
    private static instance: WokaServiceInterface | undefined;
    static get(capabilities: AdminCapabilities): WokaServiceInterface {
        if (!WokaService.instance)
            WokaService.instance = adminWokaService.isEnabled(capabilities) ? adminWokaService : localWokaService;
        return WokaService.instance;
    }
}
