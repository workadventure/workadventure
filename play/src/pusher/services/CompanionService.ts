import { Capabilities } from "@workadventure/messages";
import { AdminCompanionService } from "./AdminCompanionService";
import { LocalCompanionSevice } from "./LocalCompanionSevice";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";

export class CompanionService {
    private static instance: CompanionServiceInterface | undefined;
    static get(capabilities: Capabilities): CompanionServiceInterface {
        if (!CompanionService.instance)
            CompanionService.instance =
                capabilities["api/companion/list"] === "v1" ? new AdminCompanionService() : new LocalCompanionSevice();
        return CompanionService.instance;
    }
}
