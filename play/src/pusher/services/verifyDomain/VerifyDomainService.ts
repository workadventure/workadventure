import type { Capabilities } from "@workadventure/messages";
import type { VerifyDomainInterface } from "./VerifyDomainInterface.ts";
import { AdminVerifyDomainService } from "./AdminVerifyDomainService.ts";
import { LocalVerifyDomainService } from "./LocalVerifyDomainService.ts";

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
