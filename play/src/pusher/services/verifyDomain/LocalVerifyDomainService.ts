import { VerifyDomainInterface } from "./VerifyDomainInterface";
import { PUSHER_URL } from "../../enums/EnvironmentVariable";

export class LocalVerifyDomainService implements VerifyDomainInterface {
    verifyDomain(uri: string): Promise<boolean> {
        const domain = new URL(uri).hostname;
        const pusherDomain = new URL(PUSHER_URL).hostname;

        return Promise.resolve(domain === pusherDomain);
    }
}
