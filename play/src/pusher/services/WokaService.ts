import {adminWokaService} from "./AdminWokaService";
import {localWokaService} from "./LocalWokaService";
import {AdminCapabilities} from "./AdminApi/AdminCapabilities";
import {WokaServiceInterface} from "./WokaServiceInterface";

export class WokaService {
    private static instance: WokaServiceInterface | undefined;
    static get(capabilities: AdminCapabilities): WokaServiceInterface {
        if (!WokaService.instance)
            WokaService.instance = adminWokaService.isEnabled(capabilities) ? adminWokaService : localWokaService;
        return WokaService.instance;
    }
}
