export interface AuthenticatorInterface {
    (apiKey: string, room: string): Promise<void>;
}
