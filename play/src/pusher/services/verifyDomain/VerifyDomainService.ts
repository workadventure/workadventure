import { AdminCapabilities } from "../adminApi/AdminCapabilities";
import { VerifyDomainInterface } from "./VerifyDomainInterface";
import { AdminVerifyDomainService } from "./AdminVerifyDomainService";
import { LocalVerifyDomainService } from "./LocalVerifyDomainService";

export class VerifyDomainService {
    private static instance: VerifyDomainInterface | undefined;
    static get(capabilities: AdminCapabilities): VerifyDomainInterface {
        if (!VerifyDomainService.instance)
            VerifyDomainService.instance = AdminVerifyDomainService.isEnabled(capabilities)
                ? new AdminVerifyDomainService()
                : new LocalVerifyDomainService();
        return VerifyDomainService.instance;
    }
}
