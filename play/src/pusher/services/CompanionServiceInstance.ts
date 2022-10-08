import { AdminCompanionService } from "./AdminCompanionService";
import { LocalCompanionSevice } from "./LocalCompanionSevice";
import type { CompanionService } from "./CompanionService";

export class CompanionServiceInstance {
    static instance: CompanionService | undefined;
    static get(): CompanionService {
        if (!CompanionServiceInstance.instance)
            CompanionServiceInstance.instance = AdminCompanionService.isEnabled()
                ? new AdminCompanionService()
                : new LocalCompanionSevice();
        return CompanionServiceInstance.instance;
    }
}
