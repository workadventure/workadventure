import { GuardReturns } from "../types/GuardReturns";

export interface AuthenticatorInterface {
    (apiKey: string, room: string): Promise<GuardReturns>;
}
