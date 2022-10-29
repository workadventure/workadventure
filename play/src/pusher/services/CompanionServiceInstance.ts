import { AdminCompanionService } from "./AdminCompanionService";
import { LocalCompanionSevice } from "./LocalCompanionSevice";
import type { CompanionService } from "./CompanionService";
import type { AdminCapabilities } from "./adminApi/AdminCapabilities";

export class CompanionServiceInstance {
    static instance: CompanionService | undefined;
    static get(capabilities: AdminCapabilities): CompanionService {
        if (!CompanionServiceInstance.instance)
            CompanionServiceInstance.instance = AdminCompanionService.isEnabled(capabilities)
                ? new AdminCompanionService()
                : new LocalCompanionSevice();
        return CompanionServiceInstance.instance;
    }
}
