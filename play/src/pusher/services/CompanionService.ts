import type { Capabilities } from "@workadventure/messages";
import { adminCompanionService } from "./AdminCompanionService.ts";
import { localCompanionService } from "./LocalCompanionSevice.ts";
import type { CompanionServiceInterface } from "./CompanionServiceInterface.ts";

export class CompanionService {
    private static instance: CompanionServiceInterface | undefined;
    static get(capabilities: Capabilities): CompanionServiceInterface {
        if (!CompanionService.instance)
            CompanionService.instance =
                capabilities["api/companion/list"] === "v1" ? adminCompanionService : localCompanionService;
        return CompanionService.instance;
    }
}
