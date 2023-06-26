import { Capabilities } from "@workadventure/messages";
import { adminCompanionService } from "./AdminCompanionService";
import { localCompanionService } from "./LocalCompanionSevice";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";

export class CompanionService {
    private static instance: CompanionServiceInterface | undefined;
    static get(capabilities: Capabilities): CompanionServiceInterface {
        if (!CompanionService.instance)
            CompanionService.instance =
                capabilities["api/companion/list"] === "v1" ? adminCompanionService : localCompanionService;
        return CompanionService.instance;
    }
}
