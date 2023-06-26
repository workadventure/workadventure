import { Capabilities } from "@workadventure/messages";
import { VerifyDomainInterface } from "./VerifyDomainInterface";
import { AdminVerifyDomainService } from "./AdminVerifyDomainService";
import { LocalVerifyDomainService } from "./LocalVerifyDomainService";

export class VerifyDomainService {
    private static instance: VerifyDomainInterface | undefined;
    static get(capabilities: Capabilities): VerifyDomainInterface {
        if (!VerifyDomainService.instance)
            VerifyDomainService.instance =
                capabilities["api/domain/verify"] === "v1"
                    ? new AdminVerifyDomainService()
                    : new LocalVerifyDomainService();
        return VerifyDomainService.instance;
    }
}
