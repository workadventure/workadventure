import { AdminCompanionService } from "./AdminCompanionService";
import { LocalCompanionSevice } from "./LocalCompanionSevice";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";
import type { AdminCapabilities } from "./adminApi/AdminCapabilities";

export class CompanionService {
    private static instance: CompanionServiceInterface | undefined;
    static get(capabilities: AdminCapabilities): CompanionServiceInterface {
        if (!CompanionService.instance)
            CompanionService.instance = AdminCompanionService.isEnabled(capabilities)
                ? new AdminCompanionService()
                : new LocalCompanionSevice();
        return CompanionService.instance;
    }
}
