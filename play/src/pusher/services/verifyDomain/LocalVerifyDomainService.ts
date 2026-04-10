import { PUSHER_URL } from "../../enums/EnvironmentVariable";
import type { VerifyDomainInterface } from "./VerifyDomainInterface";

export class LocalVerifyDomainService implements VerifyDomainInterface {
    verifyDomain(uri: string): Promise<boolean> {
        const domain = new URL(uri).hostname;
        const pusherDomain = new URL(PUSHER_URL).hostname;

        return Promise.resolve(domain === pusherDomain);
    }
}
